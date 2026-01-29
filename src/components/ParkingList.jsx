import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import database from "../firebase";

const ParkingList = () => {
  const [parkingData, setParkingData] = useState([]);

  useEffect(() => {
    const dbRef = ref(database, "/");
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const spots = Object.values(data).filter(
          (spot) => spot.lat && spot.lng && spot.name
        );
        setParkingData(spots);
      }
    });
  }, []);

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-2">Available Parking Spots:</h2>
      {parkingData.length === 0 ? (
        <p>No parking spots available.</p>
      ) : (
        <ul className="list-disc pl-5">
          {parkingData.map((spot, index) => (
            <li key={index}>
              {spot.name} - {spot.status} - {spot.alignmentDetails}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ParkingList;
