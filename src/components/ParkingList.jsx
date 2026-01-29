import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import database from "../firebase";
import { Star, MapPin, IndianRupee } from "lucide-react";

const ParkingList = ({ userLoc, onSelect }) => {
  const [parkingSlots, setParkingSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");

  // Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    const dbRef = ref(database, "/parking_slots");
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      console.log("DEBUG: Firebase Snapshot:", data); // Debug Log
      if (data) {
        let allSlots = [];

        // Iterate over Places (place_A, place_B) or plain slots
        Object.keys(data).forEach((key) => {
          const item = data[key];

          // CHECK: Is this a Place with nested slots?
          if (item.slots) {
            const place = item;
            Object.keys(place.slots).forEach((slotKey) => {
              const slot = place.slots[slotKey];
              // Calculate availability
              const now = Date.now();
              const isReserved = slot.reservedUntil && slot.reservedUntil > now;
              const isAvailable = !isReserved && slot.status === "FREE";

              const dist = userLoc
                ? calculateDistance(userLoc.lat, userLoc.lng, slot.lat, slot.lng)
                : Infinity;

              allSlots.push({
                id: slotKey,
                ...slot,
                address: slot.address || place.address,
                isAvailable: isAvailable,
                distance: dist,
                placeName: place.name,
                placeId: key
              });
            });
          } else {
            // FALLBACK: Old structure (flat slots)
            const slot = item;
            const now = Date.now();
            const isReserved = slot.reservedUntil && slot.reservedUntil > now;
            const isAvailable = !isReserved && slot.status === "FREE";
            const dist = userLoc
              ? calculateDistance(userLoc.lat, userLoc.lng, slot.lat, slot.lng)
              : Infinity;

            allSlots.push({
              id: key,
              ...slot,
              isAvailable: isAvailable,
              distance: dist
            });
          }
        });

        const sortedSlots = allSlots.sort((a, b) => a.distance - b.distance);
        setParkingSlots(sortedSlots);
      } else {
        setParkingSlots([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase Read Error:", error);
      setDbError("Permission Denied: Unable to access parking data.");
      setLoading(false);
    });
  }, [userLoc]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-400"></div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="w-full max-w-lg mx-auto bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-600 px-6 py-4 rounded-[2rem] text-center">
        <h3 className="font-bold text-lg mb-1">Connection Error</h3>
        <p className="text-sm opacity-90">{dbError}</p>
        <p className="text-xs mt-3 bg-white/20 inline-block px-3 py-1 rounded-full">
          Check Firebase Console &gt; Realtime Database &gt; Rules
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-lg mx-auto pb-24 px-4">
      {parkingSlots.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-xl border border-white/40 shadow-[0_10px_32px_rgba(0,0,0,0.05)] rounded-[2.5rem] p-8 text-center text-slate-500">
          No parking slots found nearby.
        </div>
      ) : (
        parkingSlots.map((slot) => (
          <div
            key={slot.id}
            onClick={() => onSelect(slot)}
            className="group cursor-pointer bg-white/40 backdrop-blur-xl border border-white/40 shadow-[0_10px_32px_rgba(0,0,0,0.05)] rounded-[2.5rem] p-6 flex flex-col gap-4 relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] hover:bg-white/60"
          >
            {/* Safety Monitor Pulse (Hardware Integration) */}
            {slot.isFail && (
              <div className="absolute inset-0 bg-red-500/10 z-0 animate-pulse pointer-events-none rounded-[2.5rem]" />
            )}

            {/* Header */}
            <div className="flex justify-between items-start z-10">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{slot.name}</h3>
                <div className="flex items-center gap-1.5 mt-1.5 text-slate-600 text-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{slot.address || "No address provided"}</span>
                </div>
                {slot.placeName && (
                  <div className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wide">
                    {slot.placeName}
                  </div>
                )}
              </div>
              <div className="bg-white/70 backdrop-blur-md border border-white/50 px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                {slot.distance !== Infinity ? `${slot.distance.toFixed(1)} km` : "N/A"}
              </div>
            </div>

            {/* Footer info */}
            <div className="flex justify-between items-end mt-1 z-10">
              <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-1 rounded-lg border border-yellow-500/20">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                <span className="text-slate-800 font-bold text-sm">{slot.rating || "4.5"}</span>
              </div>
              <div className="text-xl font-bold text-slate-900 flex items-center">
                <IndianRupee className="w-5 h-5" />
                {slot.pricePerHour || "50"}<span className="text-sm font-medium text-slate-500 ml-0.5">/hr</span>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-3xl text-[10px] font-bold uppercase tracking-wider ${slot.isAvailable
                ? "bg-emerald-500/80 text-white backdrop-blur-md"
                : "bg-red-500/80 text-white backdrop-blur-md"
              }`}>
              {slot.isAvailable ? "Open" : "Full"}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ParkingList;
