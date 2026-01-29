import React, { useState } from 'react';
import { ArrowLeft, Clock, MapPin, IndianRupee, Car, Check } from 'lucide-react';
import ReservationModal from './ReservationModal';

const ParkingLotGrid = ({ place, onBack, onReserveSuccess, currentUser }) => {
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Convert Slots Object to Array and Sort by ID (Ascending)
    const slots = place.slots ? Object.keys(place.slots).sort().map(key => ({
        id: key,
        ...place.slots[key]
    })) : [];

    const handleSlotClick = (slot) => {
        const now = Date.now();
        const isReserved = slot.reservedUntil && slot.reservedUntil > now;
        if (slot.status === 'FREE' && !isReserved) {
            setSelectedSlot(slot);
            setShowModal(true);
        } else if (slot.myReservedSlot) {
            // If it's my slot, maybe show details? For now, do nothing or alert.
            alert("You have already reserved this slot!");
        }
    };

    const handleConfirmReservation = (duration, amount) => {
        setShowModal(false);
        if (onReserveSuccess && selectedSlot) {
            onReserveSuccess(selectedSlot, duration, amount);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto pb-24 px-4">
            <ReservationModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                slot={selectedSlot}
                onConfirm={handleConfirmReservation}
            />

            {/* Header */}
            <div className="flex items-center gap-4 mb-8 pt-4">
                <button
                    onClick={onBack}
                    className="p-3 bg-white/40 backdrop-blur-md border border-white/20 rounded-full shadow-md hover:bg-white/60 transition-all text-slate-700 hover:scale-105 active:scale-95 group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{place.name}</h2>
                    <p className="text-slate-500 text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {place.address || "Visual Parking Layout"}
                    </p>
                </div>
            </div>

            {/* Screen / Entry Visual */}
            <div className="w-full h-2 bg-gradient-to-r from-transparent via-slate-300 to-transparent rounded-full mb-8 opacity-50 relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Entry this way</div>
            </div>

            {/* Grid */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                {slots.map((slot) => {
                    const now = Date.now();
                    const isReserved = slot.reservedUntil && slot.reservedUntil > now;
                    // We need to check if 'myReservedSlot' logic was passed or needs re-check. 
                    // Ideally 'place' passed from parent has 'myReservedSlot' field, but individual slots need check.
                    // For simplicity, we just check generic reserved status.
                    // We assume 'currentUser' is passed to check ownership if needed, but for 'Free/Values', generic is fine.

                    // Simple "Is Mine" check if we had user ID.
                    const isMine = slot.reservedBy === currentUser?.uid && isReserved;

                    let statusClass = "bg-white/40 border-slate-200 text-slate-500 hover:bg-white/60 hover:scale-105 cursor-pointer"; // Default Free
                    if (isReserved) {
                        if (isMine) statusClass = "bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/30 cursor-default ring-4 ring-indigo-200";
                        else statusClass = "bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed opacity-60";
                    } else if (slot.status !== 'FREE') { // Occupied by sensor
                        statusClass = "bg-red-100 text-red-300 border-red-100 cursor-not-allowed opacity-50";
                    }

                    return (
                        <button
                            key={slot.id}
                            disabled={isReserved || slot.status !== 'FREE'}
                            onClick={() => handleSlotClick(slot)}
                            className={`relative w-24 h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 p-2 transition-all duration-300 shadow-sm ${statusClass}`}
                        >
                            <span className="absolute top-2 left-3 text-[10px] font-bold opacity-70">{slot.name || slot.id}</span>

                            {isReserved ? (
                                isMine ? <Car className="w-8 h-8" /> : <div className="w-8 h-8 rounded-full bg-slate-300/50" />
                            ) : (
                                <div className="text-xl font-bold text-slate-700">
                                    <span className="text-xs font-normal align-top opacity-50">₹</span>
                                    {slot.pricePerHour || 50}
                                </div>
                            )}

                            {/* Status Label */}
                            <div className={`absolute bottom-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isReserved ? (isMine ? "bg-white/20" : "bg-slate-300/50 text-slate-500") : "bg-emerald-100 text-emerald-700"
                                }`}>
                                {isReserved ? (isMine ? "Yours" : "Booked") : "Free"}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-12 flex justify-center gap-6 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-lg bg-white/40 border-2 border-slate-200"></div>
                    Available
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-lg bg-indigo-600 border-2 border-indigo-600"></div>
                    Your Spot
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-lg bg-slate-200 border-2 border-slate-200 opacity-60"></div>
                    Occupied
                </div>
            </div>

        </div>
    );
};

export default ParkingLotGrid;
