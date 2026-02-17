import socket
import json
import firebase_admin
from firebase_admin import credentials, db
import time
import cv2
from pyzbar import pyzbar
import math

# --- CONFIG ---
UDP_IP = "0.0.0.0"
UDP_PORT = 4210
SERVICE_ACCOUNT_FILE = "serviceKey.json"
DATABASE_URL = "https://smartparking-d2b9f-default-rtdb.asia-southeast1.firebasedatabase.app"
PARKING_RATE = 40 

# --- FIREBASE INIT ---
cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
firebase_admin.initialize_app(cred, {'databaseURL': DATABASE_URL})

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))
sock.setblocking(False)

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

last_nodemcu_addr = None
last_scan_time = 0
SCAN_COOLDOWN = 3.0

def trigger_gate():
    """Send OPEN command to NodeMCU servo"""
    if last_nodemcu_addr:
        print('\a', end='', flush=True)
        sock.sendto(b"OPEN", last_nodemcu_addr)
        print("✅ Gate triggered!")
    else:
        print("⚠️ Waiting for NodeMCU heartbeat...")

def handle_qr_logic(qr_data):
    """
    Process QR code with format: uid|mode|timestamp|date
    Example: abc123|ENTRY|1738234567890|2026-01-30
    """
    try:
        # Parse QR code
        parts = qr_data.split('|')
        if len(parts) != 4:
            print(f"❌ INVALID QR FORMAT: {qr_data}")
            return
        
        uid, mode, qr_timestamp, qr_date = parts
        now = int(time.time() * 1000)
        today = time.strftime('%Y-%m-%d')
        
        # Date validation
        if qr_date != today:
            print(f"❌ EXPIRED QR: Date {qr_date} != {today}")
            return
        
        session_ref = db.reference(f'active_sessions/{uid}')
        session = session_ref.get()
        
        print(f"\n📱 QR Scanned: {mode} | User: {uid[:8]}... | Date: {qr_date}")
        
        if mode == "RESERVE":
            # === RESERVATION → ACTIVE SESSION CONVERSION ===
            reservation_ref = db.reference(f'active_reservations/{uid}')
            reservation = reservation_ref.get()
            
            if not reservation:
                print(f"❌ RESERVE DENIED: No active reservation found")
                return
            
            # Verify reservation QR matches
            stored_reserve_qr = reservation.get('reserveQR')
            if stored_reserve_qr != qr_data:
                print(f"❌ RESERVE DENIED: QR mismatch")
                print(f"   Expected: {stored_reserve_qr}")
                print(f"   Scanned: {qr_data}")
                return
            
            # Check if reservation is still valid (15 min window)
            reservation_time = reservation.get('reservationTime')
            if now - reservation_time > 15 * 60 * 1000:  # 15 minutes
                print(f"❌ RESERVE DENIED: Reservation expired")
                reservation_ref.delete()
                return
            
            # Convert reservation to active session
            session_ref = db.reference(f'active_sessions/{uid}')
            session_ref.set({
                'slotId': reservation.get('slotId'),
                'startTime': now,
                'userId': uid,
                'paymentStatus': 'PENDING',
                'entryQR': qr_data  # Store the QR for audit
            })
            
            # Delete reservation
            reservation_ref.delete()
            
            trigger_gate()
            print(f"✅ RESERVATION ACTIVATED: Converted to active session")
        
        elif mode == "ENTRY":
            # === ENTRY FLOW ===
            if session:
                # Session exists - check if this is the matching entry QR
                stored_entry_qr = session.get('entryQR')
                if stored_entry_qr == qr_data:
                    # This is the correct entry QR - grant access
                    trigger_gate()
                    print(f"✅ ENTRY GRANTED: Valid entry QR for existing session")
                else:
                    # Different entry QR - deny
                    print(f"❌ ENTRY DENIED: Session exists with different entry QR")
                    print(f"   Expected: {stored_entry_qr}")
                    print(f"   Scanned: {qr_data}")
                return
            
            # No session exists - create new one
            session_ref.set({
                'slotId': 'AUTO',  # Can be assigned by gateway or frontend
                'startTime': now,
                'userId': uid,
                'paymentStatus': 'PENDING',
                'entryQR': qr_data
            })
            
            trigger_gate()
            print(f"✅ ENTRY GRANTED: New session created for {uid[:8]}...")
        
        elif mode == "EXIT":
            # === EXIT FLOW ===
            if not session:
                print(f"❌ EXIT DENIED: No active session found")
                return
            
            # Check payment status
            if session.get('paymentStatus') != 'SUCCESS':
                # Calculate bill and update
                start_time = session.get('startTime')
                hours = math.ceil((now - start_time) / 3600000)
                total_due = hours * PARKING_RATE
                session_ref.update({'totalDue': total_due})
                
                print(f"❌ EXIT DENIED: Payment not completed - ₹{total_due} due")
                return
            
            # Verify exit QR matches (prevents QR reuse)
            stored_exit_qr = session.get('exitQR')
            if stored_exit_qr != qr_data:
                print(f"❌ EXIT DENIED: QR mismatch")
                print(f"   Expected: {stored_exit_qr}")
                print(f"   Received: {qr_data}")
                return
            
            # All checks passed - grant exit
            trigger_gate()
            session_ref.delete()
            print(f"✅ EXIT GRANTED: Session closed, slot now FREE")
        
        else:
            print(f"❌ INVALID MODE: {mode}")
    
    except Exception as e:
        print(f"❌ QR Processing Error: {e}")

print("=" * 60)
print("🚗 Park-0S Secure Gateway System")
print("=" * 60)
print("Features:")
print("  ✓ Entry/Exit mode validation")
print("  ✓ Date-bound QR codes")
print("  ✓ Payment verification")
print("  ✓ QR reuse prevention")
print("=" * 60)
print("Waiting for QR codes...\n")

while True:
    # 1. PROCESS SENSOR DATA (UDP)
    try:
        data, addr = sock.recvfrom(1024)
        last_nodemcu_addr = addr
        payload = json.loads(data.decode('utf-8'))
        slot_id = payload.get("id")
        if slot_id:
            db.reference(f'parking_slots/{slot_id}').update({
                'status': payload.get("status"),
                'alignmentDetails': payload.get("align"),
                'isFail': payload.get("isFail"),
                'lastUpdate': int(time.time() * 1000)
            })
    except BlockingIOError:
        pass

    # 2. PROCESS QR SCANNER
    ret, frame = cap.read()
    if ret:
        if time.time() - last_scan_time > 0.5:
            barcodes = pyzbar.decode(frame)
            if barcodes:
                for qr in barcodes:
                    qr_data = qr.data.decode('utf-8')
                    if time.time() - last_scan_time > SCAN_COOLDOWN:
                        handle_qr_logic(qr_data)
                        last_scan_time = time.time()
        
        cv2.imshow("Park-0S Gate Scanner", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
