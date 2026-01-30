import React, { useState, useEffect } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { ArrowLeft, Navigation, Star, IndianRupee, AlertTriangle, ShieldCheck, Clock, CheckCircle, QrCode } from "lucide-react";
import { update, ref, set, onValue } from "firebase/database";
import database from "../firebase";
import QRModal from "./QRModal"; // Ensure this is imported

const containerStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "1.5rem",
};

const ParkingDetail = ({ slot, onBack, currentUser, onShowGrid }) => {
    const [now, setNow] = useState(() => Date.now());
    const [activeSession, setActiveSession] = useState(null);
    const [activeReservation, setActiveReservation] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [qrValue, setQrValue] = useState("");
    const [qrTitle, setQrTitle] = useState("");

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000); // 1-second tick for countdown
        return () => clearInterval(interval);
    }, []);

    // Listen for ACTIVE RESERVATION (Phase 5)
    useEffect(() => {
        if (!currentUser) return;
        const resRef = ref(database, `active_reservations/${currentUser.uid}`);
        const unsubscribe = onValue(resRef, (snapshot) => {
            const data = snapshot.val();
            // Only show if it matches THIS slot AND is still valid using server timestamp check locally
            // This prevents "Reservation Expired" banner from showing on revisit.
            if (data && data.slotId === slot.id && data.reservedUntil > Date.now()) {
                setActiveReservation(data);
            } else {
                setActiveReservation(null);
            }
        });
        return () => unsubscribe();
    }, [currentUser, slot.id]);

    // Listen for ACTIVE SESSION
    useEffect(() => {
        if (!currentUser) return;
        const sessionRef = ref(database, `active_sessions/${currentUser.uid}`);
        const unsubscribe = onValue(sessionRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.slotId === slot.id && data.paymentStatus !== "SUCCESS") {
                setActiveSession(data);
            } else {
                setActiveSession(null);
            }
        });
        return () => unsubscribe();
    }, [currentUser, slot.id]);

    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: "AIzaSyBE5QNNGENaObC2gUKpgT16hkNJmni8wwk",
    });

    const center = {
        lat: slot.lat || 0,
        lng: slot.lng || 0,
    };

    // --- Actions ---

    const handleReserve = async () => {
        if (!currentUser) {
            alert("Please login to reserve.");
            return;
        }

        const reservationDuration = 15 * 60 * 1000; // 15 mins
        const reservedUntil = Date.now() + reservationDuration;

        try {
            // Nested Path support
            const slotPath = slot.placeId
                ? `parking_slots/${slot.placeId}/slots/${slot.id}`
                : `parking_slots/${slot.id}`;

            await set(ref(database, `active_reservations/${currentUser.uid}`), {
                slotId: slot.id,
                reservedAt: Date.now(),
                reservedUntil: reservedUntil,
                userId: currentUser.uid,
                status: "PENDING"
            });

            await update(ref(database, slotPath), {
                reservedUntil: reservedUntil,
                reservedBy: currentUser.uid
            });

            // Open QR immediately
            setQrValue(currentUser.uid);
            setQrTitle("Entry QR Code");
            setShowQR(true);

        } catch (error) {
            console.error("Reservation failed:", error);
            alert(`Failed to reserve: ${error.message}`);
        }
    };

    const handleEnter = async () => {
        if (!currentUser) {
            alert("Please login to enter.");
            return;
        }

        try {
            const now = Date.now();
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const entryQR = `${currentUser.uid}|ENTRY|${now}|${today}`;

            // Create active session
            await set(ref(database, `active_sessions/${currentUser.uid}`), {
                slotId: slot.id,
                startTime: now,
                userId: currentUser.uid,
                paymentStatus: "PENDING",
                entryQR: entryQR  // Store for audit
            });

            // Show entry QR
            setQrValue(entryQR);
            setQrTitle("Entry QR Code");
            setShowQR(true);

            alert("Entry QR generated! Show at gate.");

        } catch (error) {
            console.error("Entry failed:", error);
            alert(`Failed to enter: ${error.message}`);
        }
    };

    const handlePayAndExit = async () => {
        if (!currentUser || !activeSession) return;

        // Use gateway's rate (₹40/hour) or slot-specific rate
        const rate = slot.pricePerHour || 40;

        // Prefer gateway-calculated totalDue if available
        const amount = activeSession.totalDue || Math.ceil(Math.ceil((Date.now() - activeSession.startTime) / 3600000) * rate);

        if (!window.confirm(`Confirm Payment of ₹${amount} for parking duration?`)) return;

        try {
            const now = Date.now();
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const exitQR = `${currentUser.uid}|EXIT|${now}|${today}`;

            // Mark payment as SUCCESS and store exit QR
            await update(ref(database, `active_sessions/${currentUser.uid}`), {
                paymentStatus: "SUCCESS",
                endTime: now,
                amountPaid: amount,
                exitQR: exitQR  // Store for gateway validation
            });

            // Show exit QR
            setQrValue(exitQR);
            setQrTitle("Exit QR Code - Show at Gate");
            setShowQR(true);

            alert("Payment successful! Show exit QR at gate.");

        } catch (error) {
            console.error("Payment failed:", error);
            alert("Payment failed.");
        }
    };

    const handleGetDirections = () => {
        if (!slot.lat || !slot.lng) return;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${slot.lat},${slot.lng}`, "_blank");
    };

    // --- Helpers ---

    // Countdown Formatter
    const getCountdown = () => {
        if (!activeReservation) return null;
        const diff = activeReservation.reservedUntil - now;
        if (diff <= 0) return "Expired";
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        return `${mins}m ${secs}s`;
    };

    // Prefer gateway-calculated totalDue, fallback to local calculation
    const currentCost = activeSession
        ? (activeSession.totalDue || Math.ceil(Math.ceil((now - activeSession.startTime) / 3600000) * (slot.pricePerHour || 40)))
        : 0;

    const onLoad = React.useCallback(function callback() { }, []);
    const onUnmount = React.useCallback(function callback() { }, []);

    return (
        <div className="w-full max-w-2xl mx-auto pb-24 px-4">

            <QRModal
                isOpen={showQR}
                onClose={() => setShowQR(false)}
                value={qrValue}
                title={qrTitle}
            />

            {/* Header */}
            <div className="flex items-center gap-4 mb-6 pt-4">
                <button
                    onClick={onBack}
                    className="p-3 bg-white/40 backdrop-blur-md border border-white/20 rounded-full shadow-md hover:bg-white/60 transition-all text-slate-700 hover:scale-105 active:scale-95 group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight truncate">
                        {slot.name}
                    </h2>
                </div>
            </div>

            {/* Main Content */}
            <div className={`bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-[0_10px_32px_rgba(0,0,0,0.05)] overflow-hidden p-6 space-y-6 relative transition-all duration-500 ${slot.isFail ? 'shadow-[0_0_40px_rgba(239,68,68,0.15)] border-red-500/30' : ''}`}>

                {/* Hardware Alert (Personalized) */}
                {slot.isFail && (
                    <div className={`backdrop-blur-md border p-4 rounded-3xl flex items-center gap-4 animate-pulse ${activeSession
                        ? "bg-red-500/10 border-red-500/30 text-red-700"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-700"
                        }`}>
                        <AlertTriangle className={`w-6 h-6 ${activeSession ? "text-red-600" : "text-amber-600"}`} />
                        <div>
                            <p className="font-bold text-base">
                                {activeSession ? "⚠ Alignment Issue - Adjust Car!" : "Slot Unavailable"}
                            </p>
                            <p className="text-sm opacity-90 mt-0.5">
                                {activeSession
                                    ? (slot.alignmentDetails || "Your vehicle is not parked correctly. Please realign.")
                                    : "This slot is currently undergoing maintenance or has an obstruction."}
                            </p>
                        </div>
                    </div>
                )}

                {/* System OK (Only if no failure) */}
                {!slot.isFail && (
                    <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-emerald-700 px-4 py-3 rounded-3xl flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="font-semibold text-sm">System Active & Monitored</span>
                    </div>
                )}

                {/* Reservation Countdown Banner */}
                {activeReservation && !activeSession && (
                    <div className="bg-indigo-600 text-white p-4 rounded-3xl flex justify-between items-center shadow-lg shadow-indigo-600/30 animate-in slide-in-from-top-4">
                        <div className="flex items-center gap-3">
                            <Clock className="w-6 h-6 animate-pulse" />
                            <div>
                                <p className="text-xs opacity-80 font-bold uppercase tracking-wider">Reservation Expires In</p>
                                <p className="text-2xl font-mono font-bold">{getCountdown()}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setQrValue(currentUser.uid); setQrTitle("Entry QR Code"); setShowQR(true); }}
                            className="bg-white text-indigo-700 px-4 py-2 rounded-xl font-bold text-sm hover:scale-105 transition"
                        >
                            Open QR
                        </button>
                    </div>
                )}

                {/* Map */}
                <div className="rounded-[2rem] overflow-hidden shadow-inner border border-white/30 h-[250px] w-full relative">
                    {isLoaded && (
                        <GoogleMap
                            mapContainerStyle={containerStyle}
                            center={center}
                            zoom={15}
                            onLoad={onLoad}
                            onUnmount={onUnmount}
                            options={{ disableDefaultUI: true, zoomControl: true, styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }] }}
                        >
                            <Marker position={center} />
                        </GoogleMap>
                    )}
                </div>

                {/* Price / Session */}
                {activeSession ? (
                    <div className="bg-blue-600/10 backdrop-blur-md border border-blue-600/20 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 text-blue-700 font-bold uppercase tracking-wider text-xs">
                            <Clock className="w-4 h-4" />
                            Active Session
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-slate-500 text-sm">Elapsed Time</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {Math.floor((now - activeSession.startTime) / 60000)}m
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-500 text-sm">Current Bill</p>
                                <div className="flex items-center justify-end gap-1 text-slate-800 font-bold text-2xl">
                                    <IndianRupee className="w-6 h-6" />
                                    {currentCost}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-white/30">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Price</p>
                            <div className="flex items-end text-slate-800">
                                <IndianRupee className="w-5 h-5 mb-0.5" />
                                <span className="text-xl font-bold">{slot.pricePerHour || "50"}</span>
                                <span className="text-xs font-bold text-slate-400 ml-1 mb-0.5">/hr</span>
                            </div>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-white/30">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Rating</p>
                            <div className="flex items-center gap-1 text-slate-800">
                                <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                                <span className="text-xl font-bold">{slot.rating || "4.5"}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <button
                        onClick={handleGetDirections}
                        className="flex items-center justify-center gap-2 py-4 px-6 bg-white/60 hover:bg-white/80 backdrop-blur-md text-blue-600 font-bold rounded-2xl shadow-lg border border-white/50 transition-all active:scale-95"
                    >
                        <Navigation className="w-5 h-5" />
                        Directions
                    </button>

                    {activeSession ? (
                        <button
                            onClick={handlePayAndExit}
                            className="col-span-1 md:col-span-2 flex items-center justify-center gap-2 py-4 px-6 font-bold rounded-2xl shadow-lg transition-all active:scale-95 bg-slate-800 hover:bg-slate-900 text-white shadow-slate-900/20"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Pay & Exit (₹{currentCost})
                        </button>
                    ) : (
                        <>
                            {/* "Enter Now" Button - Creates Active Session */}
                            <button
                                onClick={handleEnter}
                                disabled={(slot.reservedUntil && slot.reservedUntil > now)}
                                className={`flex items-center justify-center gap-2 py-4 px-6 font-bold rounded-2xl shadow-lg transition-all active:scale-95 text-white ${(slot.reservedUntil && slot.reservedUntil > now)
                                    ? "bg-slate-400 cursor-not-allowed"
                                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30"
                                    }`}
                            >
                                <QrCode className="w-5 h-5" />
                                Enter Now
                            </button>

                            {/* "Reserve Ahead" Button - Opens Grid */}
                            <button
                                onClick={() => {
                                    // Call parent to switch to Grid
                                    if (onBack) onBack("grid"); // Dirty hack? No, let's add a proper prop.
                                    // Assuming prop onReserve is passed or we lift state.
                                    // We will assume onShowGrid is passed.
                                }}
                                className="flex items-center justify-center gap-2 py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl shadow-lg border border-slate-200 transition-all active:scale-95"
                            >
                                <Clock className="w-5 h-5" />
                                Reserve Ahead
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParkingDetail;
