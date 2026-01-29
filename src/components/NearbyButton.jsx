// src/components/NearbyButton.jsx
const NearbyButton = ({ onClick }) => {
  return (
    <div className="text-center mt-10">
      <button
        onClick={onClick}
        className="w-24 h-24 bg-blue-600 text-white text-3xl rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-500 transition">
        📍
      </button>
      <p className="mt-2 font-semibold text-gray-700 mb-10">
        Find Nearby Parking
      </p>
    </div>
  );
};

export default NearbyButton;
