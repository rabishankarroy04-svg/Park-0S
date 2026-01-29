import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import database from "../firebase";
import { Clock, MapPin, Calendar, ArrowRight, History } from "lucide-react";

const Reservations = ({ currentUser, onBack, onNavigateToSlot }) => {
    // Separate states to avoid race conditions
    const [reservationData, setReservationData] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allSlotsData, setAllSlotsData] = useState({});

    // 1. Fetch Reference Data (All Slots)
    useEffect(() => {
        const dbRef = ref(database, "/parking_slots");
        onValue(dbRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                let flatSlots = {};
                Object.keys(data).forEach(key => {
                    const item = data[key];
                    if (item.slots) {
                        Object.keys(item.slots).forEach(slotKey => {
                            flatSlots[slotKey] = { ...item.slots[slotKey], id: slotKey, placeName: item.name };
                        });
                    } else {
                        flatSlots[key] = { ...item, id: key };
                    }
                });
                setAllSlotsData(flatSlots);
            }
        });
    }, []);

    // 2. Fetch User Activity (with separate listeners)
    useEffect(() => {
        if (!currentUser) return;

        const activeResRef = ref(database, `active_reservations/${currentUser.uid}`);
        const activeSessRef = ref(database, `active_sessions/${currentUser.uid}`);

        let resLoaded = false;
        let sessLoaded = false;

        const checkLoading = () => {
            if (resLoaded && sessLoaded) setLoading(false);
        };

        const unsubRes = onValue(activeResRef, (snapshot) => {
            setReservationData(snapshot.val());
            resLoaded = true;
            checkLoading();
        });

        const unsubSess = onValue(activeSessRef, (snapshot) => {
            setSessionData(snapshot.val());
            sessLoaded = true;
            checkLoading();
        });

        return () => {
            unsubRes();
            unsubSess();
        };
    }, [currentUser]);

    // Combine and Sort
    const getCategorizedItems = () => {
        const active = [];
        const past = [];
        const now = Date.now();

        // Process Reservation
        if (reservationData) {
            const isExpired = reservationData.reservedUntil < now;
            const item = { ...reservationData, type: 'RESERVATION', status: isExpired ? 'Expired' : 'Upcoming' };

            if (isExpired) past.push(item);
            else active.push(item);
        }

        // Process Session (Always active if in active_sessions node typically, unless we check end time)
        if (sessionData) {
            // If paymentStatus is SUCCESS, it might technically be "past" but usually removed by Gateway.
            // We'll treat active_sessions as Active.
            active.push({ ...sessionData, type: 'SESSION', status: 'Active' });
        }

        return { active, past };
    };

    const handleItemClick = (item) => {
        // Only active items are interactive
        const fullSlotData = allSlotsData[item.slotId];
        if (fullSlotData && onNavigateToSlot) {
            onNavigateToSlot(fullSlotData);
        }
    };

    const { active, past } = getCategorizedItems();

    const renderCard = (item, isClickable) => {
        const slotDetails = allSlotsData[item.slotId] || {};
        return (
            <div
                key={item.slotId + item.type}
                onClick={() => isClickable && handleItemClick(item)}
                className={`group border p-6 rounded-[2rem] shadow-sm relative overflow-hidden transition-all
                    ${isClickable
                        ? 'bg-white/60 backdrop-blur-xl border-white/50 cursor-pointer hover:scale-[1.02] hover:bg-white/80 hover:shadow-md'
                        : 'bg-slate-100/50 border-slate-200 grayscale opacity-80 cursor-default'
                    }`}
            >
                <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-2xl text-[10px] font-bold uppercase tracking-wider 
                    ${item.status === 'Active' ? 'bg-blue-500 text-white' :
                        item.status === 'Upcoming' ? 'bg-orange-500 text-white' :
                            'bg-slate-400 text-white'}`}>
                    {item.status}
                </div>

                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-full ${isClickable ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-400'}`}>
                            {item.type === 'SESSION' ? <Clock className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-slate-800">
                                {slotDetails.name || item.slotId || "Parking Slot"}
                            </h4>
                            {slotDetails.placeName && (
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                    {slotDetails.placeName}
                                </p>
                            )}
                        </div>
                    </div>
                    {isClickable && <ArrowRight className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />}
                </div>

                <div className="flex justify-between items-center text-sm text-slate-600 bg-white/50 p-3 rounded-xl">
                    <span>{item.type === 'SESSION' ? 'Started:' : (item.status === 'Expired' ? 'Expired At:' : 'Reserved Until:')}</span>
                    <span className="font-bold">
                        {item.type === 'SESSION'
                            ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date(item.reservedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full max-w-lg mx-auto pb-24 px-4">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-6 px-2">My Activity</h2>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300"></div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Active Section */}
                    {active.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Current</h3>
                            <div className="space-y-4">
                                {active.map(item => renderCard(item, true))}
                            </div>
                        </div>
                    )}

                    {/* Past Section */}
                    {past.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <History className="w-4 h-4 text-slate-400" />
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">History</h3>
                            </div>
                            <div className="space-y-4">
                                {past.map(item => renderCard(item, false))}
                            </div>
                        </div>
                    )}

                    {active.length === 0 && past.length === 0 && (
                        <div className="bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] text-center text-slate-500">
                            No active reservations or history.
                        </div>
                    )}
                </div>
            )}

            <button
                onClick={onBack}
                className="w-full mt-8 py-4 bg-white/60 text-slate-800 border border-white/40 rounded-2xl font-bold shadow-sm hover:bg-white/80 transition active:scale-95"
            >
                Back to Home
            </button>

        </div>
    );
};

export default Reservations;
