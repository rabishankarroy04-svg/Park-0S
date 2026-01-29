import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import database, { auth } from "../firebase"; // Import auth correctly
import { MapPin, IndianRupee, Car } from "lucide-react";

const ParkingList = ({ userLoc, onSelect }) => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [currentUserRes, setCurrentUserRes] = useState(null);

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

  // 1. Fetch User Active Reservation ID
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setCurrentUserRes(null);
      return;
    }

    const resRef = ref(database, `active_reservations/${user.uid}`);
    const unsubscribe = onValue(resRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.reservedUntil > Date.now()) {
        setCurrentUserRes(data.slotId); // Store the Slot ID of active reservation
      } else {
        setCurrentUserRes(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Places Data
  useEffect(() => {
    const dbRef = ref(database, "/parking_slots");
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let loadedPlaces = [];

        Object.keys(data).forEach((key) => {
          const item = data[key];

          // 1. NESTED STRUCTURE (Place -> Slots)
          if (item.slots) {
            const place = item;
            let availableCount = 0;
            let totalCount = 0;
            let bestSlot = null; // first available slot
            let myReservedSlot = null; // Specially tracked for redirection

            let placeLat = 0, placeLng = 0;
            let countCoords = 0;

            Object.keys(place.slots).forEach((slotKey) => {
              const slot = place.slots[slotKey];
              totalCount++;

              const now = Date.now();
              const isReserved = slot.reservedUntil && slot.reservedUntil > now;
              const isAvailable = !isReserved && slot.status === "FREE";

              if (isAvailable) {
                availableCount++;
                if (!bestSlot) bestSlot = { id: slotKey, ...slot, placeId: key, placeName: place.name };
              }

              // CHECKING IF THIS IS MY SLOT
              if (slotKey === currentUserRes) {
                myReservedSlot = { id: slotKey, ...slot, placeId: key, placeName: place.name };
              }

              if (slot.lat && slot.lng) {
                placeLat += slot.lat;
                placeLng += slot.lng;
                countCoords++;
              }
            });

            const finalLat = countCoords > 0 ? placeLat / countCoords : 0;
            const finalLng = countCoords > 0 ? placeLng / countCoords : 0;
            const dist = userLoc ? calculateDistance(userLoc.lat, userLoc.lng, finalLat, finalLng) : Infinity;

            loadedPlaces.push({
              id: key,
              name: place.name || key,
              address: place.address || "Unknown Location",
              availableCount,
              totalCount,
              bestSlot,
              myReservedSlot, // Store this for click handler
              distance: dist,
              lat: finalLat,
              lng: finalLng,
              slots: place.slots // Pass all slots for Grid View
            });

          } else {
            // 2. FLAT STRUCTURE
            const slot = item;
            const now = Date.now();
            const isReserved = slot.reservedUntil && slot.reservedUntil > now;
            const isAvailable = !isReserved && slot.status === "FREE";
            const dist = userLoc ? calculateDistance(userLoc.lat, userLoc.lng, slot.lat, slot.lng) : Infinity;

            // Check if flat slot is mine
            const isMine = key === currentUserRes;

            loadedPlaces.push({
              id: key,
              name: slot.name,
              address: slot.address || "",
              availableCount: isAvailable ? 1 : 0,
              totalCount: 1,
              bestSlot: isAvailable ? { id: key, ...slot } : null,
              myReservedSlot: isMine ? { id: key, ...slot } : null, // Store if mine
              distance: dist,
              lat: slot.lat,
              lng: slot.lng
            });
          }
        });

        const sorted = loadedPlaces.sort((a, b) => a.distance - b.distance);
        setPlaces(sorted);

      } else {
        setPlaces([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase Read Error:", error);
      setDbError("Permission Denied");
      setLoading(false);
    });
  }, [userLoc, currentUserRes]); // Re-run if my reservation changes

  const handlePlaceClick = (place) => {
    // PRIORITY 1: Redirect to My Active Reservation
    if (place.myReservedSlot) {
      onSelect(place.myReservedSlot);
      return;
    }

    // PRIORITY 2: Best Available Slot (Default)
    if (place.availableCount > 0 && place.bestSlot) {
      onSelect(place.bestSlot);
    } else {
      alert("Sorry, this parking location is currently full.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-400"></div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="w-full text-center text-red-500 bg-red-50 p-4 rounded-xl">
        {dbError}
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-lg mx-auto pb-24 px-4">

      {/* Header Stat */}
      {places.length > 0 && (
        <div className="flex items-center gap-2 px-2 text-slate-500 font-medium">
          <Car className="w-5 h-5 text-blue-600" />
          <span>{places.length} Parking Locations Found</span>
        </div>
      )}

      {places.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-8 text-center text-slate-500">
          No parking locations found.
        </div>
      ) : (
        places.map((place) => (
          <div
            key={place.id}
            onClick={() => handlePlaceClick(place)}
            className={`group cursor-pointer bg-white/40 backdrop-blur-xl border border-white/40 shadow-[0_10px_32px_rgba(0,0,0,0.05)] rounded-[2.5rem] p-6 flex flex-col gap-4 relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] hover:bg-white/60 ${place.availableCount === 0 && !place.myReservedSlot ? 'opacity-70 grayscale-[0.5]' : ''}`}
          >
            {/* Header */}
            <div className="flex justify-between items-start z-10">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{place.name}</h3>
                <div className="flex items-center gap-1.5 mt-1.5 text-slate-600 text-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{place.address}</span>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-md border border-white/50 px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                {place.distance !== Infinity ? `${place.distance.toFixed(1)} km` : "N/A"}
              </div>
            </div>

            {/* Availability Bar */}
            <div className="z-10 mt-2">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-end gap-1">
                  {place.myReservedSlot ? (
                    <span className="text-sm font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                      You have a spot here!
                    </span>
                  ) : (
                    <>
                      <span className={`text-3xl font-extrabold ${place.availableCount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {place.availableCount}
                      </span>
                      <span className="text-sm font-bold text-slate-400 mb-1.5">/ {place.totalCount} Spots Free</span>
                    </>
                  )}
                </div>
                {!place.myReservedSlot && place.bestSlot && (
                  <div className="text-lg font-bold text-slate-900 flex items-center mb-1">
                    <IndianRupee className="w-4 h-4" />
                    {place.bestSlot.pricePerHour || 50}/hr
                  </div>
                )}
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full h-3 bg-slate-200/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${place.availableCount > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${(place.availableCount / place.totalCount) * 100}%` }}
                />
              </div>
            </div>



            {/* Status Badge */}
            <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-3xl text-[10px] font-bold uppercase tracking-wider ${place.myReservedSlot ? "bg-indigo-600 text-white backdrop-blur-md" :
              place.availableCount > 0 ? "bg-emerald-500/80 text-white backdrop-blur-md" :
                "bg-red-500/80 text-white backdrop-blur-md"
              }`}>
              {place.myReservedSlot ? "Reserved" : (place.availableCount > 0 ? "Available" : "Full")}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ParkingList;
