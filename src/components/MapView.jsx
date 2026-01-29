import React, { useEffect, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { ref, onValue } from "firebase/database";
import database from "../firebase";

const containerStyle = {
  width: "100%",
  height: "400px"
};

const MapView = () => {
  const [parkingData, setParkingData] = useState([]);
  const [center, setCenter] = useState({ lat: 22.5726, lng: 88.3639 }); // Default Kolkata

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBZ6hORn9aGpBdcKVewYlAVDkc1ZpnLuFk"
  });

  useEffect(() => {
    const dbRef = ref(database, "/");
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const spots = Object.values(data).filter(
          (spot) => spot.lat && spot.lng
        );
        setParkingData(spots);
      }
    });
  }, []);

  if (loadError) return <div>Error loading Google Maps</div>;
  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
      {parkingData.map((spot, index) => {
        const lat = parseFloat(spot.lat);
        const lng = parseFloat(spot.lng);
        if (isNaN(lat) || isNaN(lng)) return null;

        return (
          <Marker
            key={index}
            position={{ lat, lng }}
            title={spot.name || "Parking Spot"}
          />
        );
      })}
    </GoogleMap>
  );
};

export default MapView;
