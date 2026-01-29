import { useState, useRef } from "react";
import Navbar from "./components/Navbar";
import NearbyButton from "./components/NearbyButton";
import MapView from "./components/MapView";
import ParkingList from "./components/ParkingList";
import "./index.css";

function App() {
  const [hasLocationConsent, setHasLocationConsent] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const mapRef = useRef(null);

  const handleButtonClick = () => {
    if (hasLocationConsent) {
      if (mapRef.current) {
        mapRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      setShowTerms(true);
    }
  };

  const handleConsent = (consent) => {
    setHasLocationConsent(consent);
    setShowTerms(false);
    if (consent && mapRef.current) {
      mapRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col">
      <Navbar />
      <div className="flex justify-center mt-10">
        <NearbyButton onClick={handleButtonClick} />
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="w-full px-4 md:px-10 mt-6" ref={mapRef}>
          <MapView />
          <ParkingList />
        </div>
      </main>

      {showTerms && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Location Access Required</h2>
            <p className="mb-6">
              To find the nearest parking spots, we need access to your current location. Please agree to share your location to use this feature.
            </p>
            <div className="flex justify-between">
              <button
                onClick={() => handleConsent(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500"
              >
                Agree
              </button>
              <button
                onClick={() => handleConsent(false)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Deny
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
