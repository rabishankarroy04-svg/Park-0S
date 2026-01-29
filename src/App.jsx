import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import { auth } from "./firebase";
import database from "./firebase";
import Navbar from "./components/Navbar";
import NearbyButton from "./components/NearbyButton";
import ParkingList from "./components/ParkingList";
import ParkingDetail from "./components/ParkingDetail";
import Profile from "./components/Profile";
import Reservations from "./components/Reservations";
import QRModal from "./components/QRModal";
import ParkingLotGrid from "./components/ParkingLotGrid";
import { update, set } from "firebase/database";


function App() {
  const [userLoc, setUserLoc] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // View State: 'home', 'profile', 'reservations'
  const [currentView, setCurrentView] = useState('home');

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        // Fetch User Data (Wallet)
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data && data.walletBalance) {
            setWalletBalance(data.walletBalance);
          }
        });
      } else {
        setCurrentUser(null);
        setWalletBalance(0);
        setCurrentView('home'); // Reset view on logout
      }
    });
    return () => unsubscribe();
  }, []);

  const getGeolocation = () => {
    setIsSearching(true);
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsSearching(false);
      },
      () => {
        setErrorMsg("Cant get location. Please check permissions or move to a different area.");
        setIsSearching(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };



  // ... inside App component ... 

  const [showQuickQR, setShowQuickQR] = useState(false);
  const [quickQRValue, setQuickQRValue] = useState("");
  const [loadingQuick, setLoadingQuick] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null); // For Grid

  // Quick Entry Logic
  const handleQuickEntry = () => {
    setLoadingQuick(true);
    const dbRef = ref(database, "/parking_slots");

    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Flatten and Sort by ID
        let allSlots = [];
        Object.keys(data).forEach(key => {
          const item = data[key];
          if (item.slots) {
            Object.keys(item.slots).forEach(slotKey => {
              allSlots.push({ id: slotKey, ...item.slots[slotKey], placeId: key, placeName: item.name });
            });
          } else {
            allSlots.push({ id: key, ...item });
          }
        });

        // Sort Ascending (ID based)
        allSlots.sort((a, b) => a.id.localeCompare(b.id));

        // Find First Free
        const now = Date.now();
        const freeSlot = allSlots.find(s => {
          const isReserved = s.reservedUntil && s.reservedUntil > now;
          return !isReserved && s.status === "FREE";
        });

        if (freeSlot) {
          // Reserve it for 15 mins (Standard Entry Window)
          // We don't charge for "Quick Entry" yet, assuming Gate Payment
          const reservationDuration = 15 * 60 * 1000;
          const reservedUntil = Date.now() + reservationDuration;
          const slotPath = freeSlot.placeId ? `parking_slots/${freeSlot.placeId}/slots/${freeSlot.id}` : `parking_slots/${freeSlot.id}`;

          // Simplified Write (Might conflict if simultaneous, but okay for prototype)
          if (currentUser) {
            set(ref(database, `active_reservations/${currentUser.uid}`), {
              slotId: freeSlot.id,
              reservedAt: Date.now(),
              reservedUntil: reservedUntil,
              userId: currentUser.uid,
              status: "PENDING"
            });
            update(ref(database, slotPath), {
              reservedUntil: reservedUntil,
              reservedBy: currentUser.uid
            });

            setQuickQRValue(currentUser.uid);
            setShowQuickQR(true);
            alert(`Assigned to ${freeSlot.placeName || "Parking"} - Slot ${freeSlot.id}`);
          } else {
            // Guest Entry? assume Gate assigns. Just show Random Token.
            setQuickQRValue(`GUEST-${Date.now()}`);
            setShowQuickQR(true);
            alert(`Proceed to Gateway. Slot ${freeSlot.id} is available.`);
          }

        } else {
          alert("No slots available currently!");
        }
      }
      setLoadingQuick(false);
    }, { onlyOnce: true });
  };

  // Handle Reservation from Grid
  const handleGridReservation = async (slot, duration, amount) => {
    if (!currentUser) return;
    const reservationDuration = duration * 60 * 1000;
    const reservedUntil = Date.now() + reservationDuration;
    const slotPath = slot.placeId ? `parking_slots/${slot.placeId}/slots/${slot.id}` : `parking_slots/${slot.id}`;

    try {
      await set(ref(database, `active_reservations/${currentUser.uid}`), {
        slotId: slot.id,
        reservedAt: Date.now(),
        reservedUntil: reservedUntil,
        userId: currentUser.uid,
        status: "PENDING",
        amountPaid: amount // Record payment
      });

      await update(ref(database, slotPath), {
        reservedUntil: reservedUntil,
        reservedBy: currentUser.uid
      });

      // Auto-redirect to Detail/Activity or just show Success
      alert("Reservation Successful! Check My Activity.");
      setCurrentView('reservations');
      setSelectedPlace(null);

    } catch (e) {
      console.error(e);
      alert("Reservation Failed");
    }
  };


  // View Component Map
  const renderView = () => {
    if (selectedSlot) {
      return (
        <ParkingDetail
          slot={selectedSlot}
          onBack={() => setSelectedSlot(null)}
          currentUser={currentUser}
          onShowGrid={(slot) => {
            // Construct Place object or Fetch it?
            // Slot usually has `placeId`. If not, it is flat.
            // If we have `slots` in `slot`, use it.
            // But `selectedSlot` in App comes from ParkingList which is a Slot object (bestSlot) 
            // BUT we modified ParkingList to pass `myReservedSlot` which is a Slot.
            // We need the PARENT PLACE data to show the grid.

            // Simplest Hack: Fetch the place data fresh in App or pass it?
            // If we reuse `handleQuickEntry` logic we can fetch.

            // Better: Check if `selectedSlot` has `placeId`.
            if (slot.placeId) {
              // Fetch Place
              setLoadingQuick(true);
              onValue(ref(database, `parking_slots/${slot.placeId}`), (snapshot) => {
                const data = snapshot.val();
                if (data) {
                  setSelectedPlace({ id: slot.placeId, ...data });
                  setSelectedSlot(null); // Close Detail
                  setCurrentView('grid'); // Open Grid
                }
                setLoadingQuick(false);
              }, { onlyOnce: true });
            } else {
              // Flat structure? Treat as single place?
              // Cannot grid if single.
              alert("Grid view not available for this location.");
            }
          }}
        />
      );
    }

    // Grid View
    if (currentView === 'grid' && selectedPlace) {
      return (
        <ParkingLotGrid
          place={selectedPlace}
          currentUser={currentUser}
          onBack={() => { setCurrentView('home'); setSelectedPlace(null); }}
          onReserveSuccess={handleGridReservation}
        />
      );
    }

    switch (currentView) {
      case 'profile':
        return <Profile user={currentUser} walletBalance={walletBalance} onBack={() => setCurrentView('home')} />;
      case 'reservations':
        return (
          <Reservations
            currentUser={currentUser}
            onBack={() => setCurrentView('home')}
            onNavigateToSlot={(slot) => setSelectedSlot(slot)}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-10 text-center relative">
            <QRModal isOpen={showQuickQR} onClose={() => setShowQuickQR(false)} value={quickQRValue} title="Entry QR" />

            <NearbyButton onClick={getGeolocation} loading={isSearching} />
            {errorMsg && (
              <div className="mt-6 bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-600 px-6 py-3 rounded-2xl font-medium">
                {errorMsg}
              </div>
            )}
            {userLoc && (
              <div className="mt-10 w-full">
                <ParkingList
                  userLoc={userLoc}
                  onSelect={(item) => {
                    // If it has slots, it's a Place -> Grid
                    if (item.bestSlot) { // Check if it's a Place object from ParkingList logic
                      setSelectedPlace(item);
                      setCurrentView('grid');
                    } else {
                      // Fallback for single slot items if any
                      setSelectedSlot(item);
                    }
                  }}
                />
              </div>
            )}



          </div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_#f8fafc,_#eff6ff)] text-slate-900 font-sans selection:bg-blue-100 overflow-x-hidden">
      <Navbar
        currentUser={currentUser}
        walletBalance={walletBalance}
        onNavigate={(view) => {
          setSelectedSlot(null); // Clear selection if navigating
          setCurrentView(view);
        }}
        currentView={currentView}
      />

      <main className="max-w-6xl mx-auto p-6 pt-24">
        <div className="transition-all duration-300">
          {renderView()}
        </div>
      </main>
    </div>
  );
}

export default App;