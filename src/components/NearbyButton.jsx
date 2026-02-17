import { MapPin } from "lucide-react";

const NearbyButton = ({ onClick, loading }) => {
  return (
    <div className="flex flex-col items-center justify-center mt-10">
      <button
        onClick={onClick}
        disabled={loading}
        className="group relative w-64 h-24 bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:border-white/60"
      >
        <div className="p-3 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
          {loading ? (
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <MapPin className="w-6 h-6 text-blue-600" />
          )}
        </div>
        <span className="text-lg font-semibold text-slate-800 tracking-tight">
          {loading ? "Locating..." : "Find Nearby Parking"}
        </span>
      </button>

      <p className="mt-6 text-slate-400 text-sm max-w-xs text-center">
        Tap to verify your location and see available slots.
      </p>
    </div>
  );
};

export default NearbyButton;
