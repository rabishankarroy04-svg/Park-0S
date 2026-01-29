import React from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { ArrowLeft, Navigation, Star, IndianRupee, AlertTriangle, ShieldCheck, Clock, CheckCircle } from "lucide-react";
import { update, ref, set, onValue } from "firebase/database";
import database from "../firebase";

const containerStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "1.5rem",
};

const ParkingDetail = ({ slot, onBack, currentUser }) => {
    const [now, setNow] = React.useState(0);
    const [activeSession, setActiveSession] = React.useState(null);

    React.useEffect(() => {
        setNow(Date.now());
        const interval = setInterval(() => setNow(Date.now()), 1000 * 60); // Update every minute
        return () => clearInterval(interval);
    }, []);

    // Listen for Active Session (Phase 4)
    React.useEffect(() => {
        if (!currentUser) {
            return;
        }
        const sessionRef = ref(database, `active_sessions/${currentUser.uid}`);
        const unsubscribe = onValue(sessionRef, (snapshot) => {
            const data = snapshot.val();
            // Check if session is for THIS slot and still active (paymentStatus != SUCCESS)
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

    // Phase 1: Reservation Logic
    const handleReserve = async () => {
        if (!currentUser) {
            alert("Please login to reserve a slot.");
            return;
        }

        const reservationDuration = 15 * 60 * 1000; // 15 minutes
        const reservedUntil = Date.now() + reservationDuration;

        try {
            // 1. Create Active Reservation Record
            await set(ref(database, `active_reservations/${currentUser.uid}`), {
                slotId: slot.id,
                reservedAt: Date.now(),
                reservedUntil: reservedUntil,
                userId: currentUser.uid,
                status: "PENDING"
            });

            // 2. Block the slot globally
            // Path depends on if it's nested (has placeId) or root
            const slotPath = slot.placeId
                ? `parking_slots/${slot.placeId}/slots/${slot.id}`
                : `parking_slots/${slot.id}`;

            await update(ref(database, slotPath), {
                reservedUntil: reservedUntil,
                reservedBy: currentUser.uid
            });

            alert(`Slot ${slot.name} reserved for 15 minutes! Please arrive by then.`);
        } catch (error) {
            console.error("Reservation failed:", error);
            alert(`Failed to reserve slot: ${error.message}`);
        }
    };

    // Phase 4: Pay & Exit Logic
    const handlePayAndExit = async () => {
        if (!currentUser || !activeSession) return;

        // Calculate Bill
        const rate = slot.pricePerHour || 50;
        const durationHours = Math.max(0.5, (Date.now() - activeSession.startTime) / 3600000); // Min 30 mins
        const amount = Math.ceil(durationHours * rate);

        if (!window.confirm(`Confirm Payment of ₹${amount} for parking duration?`)) return;

        try {
            // 1. Deduct Balance Logic (Mock for frontend)
            // In real app, we check balance < amount

            // 2. Mark Payment Success
            await update(ref(database, `active_sessions/${currentUser.uid}`), {
                paymentStatus: "SUCCESS",
                endTime: Date.now(),
                amountPaid: amount
            });

            alert(`Payment Successful! Gate Opening...`);
            onBack(); // Return to list

        } catch (error) {
            console.error("Payment failed:", error);
            alert("Payment failed. Please try again.");
        }
    };

    const handleGetDirections = () => {
        if (!slot.lat || !slot.lng) return;
        window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${slot.lat},${slot.lng}`,
            "_blank"
        );
    };

    // Callback refs needed for Google Maps
    const onLoad = React.useCallback(function callback() { }, []);
    const onUnmount = React.useCallback(function callback() { }, []);

    // Calculate Dynamic Cost for Display
    const currentCost = activeSession
        ? Math.ceil(Math.max(0.5, (now - activeSession.startTime) / 3600000) * (slot.pricePerHour || 50))
        : 0;

    return (
        <div className="w-full max-w-2xl mx-auto pb-24 px-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 pt-4">
                <button
                    onClick={onBack}
                    className="p-3 bg-white/40 backdrop-blur-md border border-white/20 rounded-full shadow-md hover:bg-white/60 transition-all text-slate-700 hover:scale-105 active:scale-95 group"
                    aria-label="Back"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight truncate">
                        {slot.name}
                    </h2>
                </div>
            </div>

            {/* Main Content Card */}
            <div className={`bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-[0_10px_32px_rgba(0,0,0,0.05)] overflow-hidden p-6 space-y-6 relative transition-all duration-500 ${slot.isFail ? 'shadow-[0_0_40px_rgba(239,68,68,0.15)] border-red-500/30' : ''}`}>

                {/* Hardware Safety Monitor Alert */}
                {slot.isFail ? (
                    <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 text-red-700 p-4 rounded-3xl flex items-center gap-4 animate-pulse">
                        <div className="p-2 bg-red-500/20 rounded-full shrink-0">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="font-bold text-base">Alignment Issue Detected</p>
                            <p className="text-sm opacity-90 mt-0.5">{slot.alignmentDetails || "Sensors indicating improper parking."}</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-emerald-700 px-4 py-3 rounded-3xl flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="font-semibold text-sm">System Active & Monitored</span>
                    </div>
                )}

                {/* Map */}
                <div className="rounded-[2rem] overflow-hidden shadow-inner border border-white/30 h-[300px] w-full relative">
                    {isLoaded ? (
                        <GoogleMap
                            mapContainerStyle={containerStyle}
                            center={center}
                            zoom={15}
                            onLoad={onLoad}
                            onUnmount={onUnmount}
                            options={{
                                disableDefaultUI: true,
                                zoomControl: true,
                                styles: [
                                    {
                                        featureType: "poi",
                                        elementType: "labels",
                                        stylers: [{ visibility: "off" }],
                                    },
                                ],
                            }}
                        >
                            <Marker position={center} />
                        </GoogleMap>
                    ) : (
                        <div className="h-full w-full bg-slate-100/50 animate-pulse flex items-center justify-center text-slate-400">
                            Loading Map...
                        </div>
                    )}
                </div>

                {/* Session Info / Price Grid */}
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
                        <div className="bg-white/50 backdrop-blur-sm p-5 rounded-3xl border border-white/30 hover:bg-white/60 transition shadow-sm">
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Price</p>
                            <div className="flex items-end">
                                <IndianRupee className="w-6 h-6 text-slate-800 mb-0.5" />
                                <p className="text-2xl font-bold text-slate-800 leading-none">
                                    {slot.pricePerHour || "50"}
                                </p>
                                <span className="text-sm font-medium text-slate-500 ml-1 mb-0.5">/hr</span>
                            </div>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm p-5 rounded-3xl border border-white/30 hover:bg-white/60 transition shadow-sm">
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Rating</p>
                            <div className="flex items-center gap-1.5">
                                <Star className="w-6 h-6 fill-yellow-500 text-yellow-500" />
                                <span className="text-2xl font-bold text-slate-800 leading-none">
                                    {slot.rating || "4.5"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white/50 backdrop-blur-sm p-5 rounded-3xl border border-white/30 hover:bg-white/60 transition shadow-sm">
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Address</p>
                    <p className="text-lg font-semibold text-slate-800 leading-relaxed">
                        {slot.address || "No address details available."}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <button
                        onClick={handleGetDirections}
                        className="flex items-center justify-center gap-2 py-4 px-6 bg-white/60 hover:bg-white/80 backdrop-blur-md text-blue-600 font-bold rounded-2xl shadow-lg border border-white/50 transition-all hover:scale-[1.02] active:scale-95 group"
                    >
                        <Navigation className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        Get Directions
                    </button>

                    {activeSession ? (
                        <button
                            onClick={handlePayAndExit}
                            className="flex items-center justify-center gap-2 py-4 px-6 font-bold rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 bg-slate-800 hover:bg-slate-900 text-white shadow-slate-900/20"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Pay & Exit (₹{currentCost})
                        </button>
                    ) : (
                        <button
                            onClick={handleReserve}
                            disabled={slot.reservedUntil && slot.reservedUntil > now}
                            className={`flex items-center justify-center gap-2 py-4 px-6 font-bold rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 ${slot.reservedUntil && slot.reservedUntil > now
                                ? "bg-slate-400 cursor-not-allowed text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30"
                                }`}
                        >
                            {slot.reservedUntil && slot.reservedUntil > now ? "Reserved" : "Reserve Now"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParkingDetail;
