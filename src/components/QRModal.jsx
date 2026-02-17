import React from "react";
import { X } from "lucide-react";

const QRModal = ({ isOpen, onClose, value, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300"
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-white/80 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-[2.5rem] p-8 text-center animate-in fade-in zoom-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"
                >
                    <X className="w-5 h-5 text-slate-500" />
                </button>

                <h3 className="text-2xl font-bold text-slate-800 mb-2">{title || "Scan QR Code"}</h3>
                <p className="text-slate-500 text-sm mb-6">{message || "Show this code at the gate scanner."}</p>

                <div className="bg-white p-4 rounded-3xl shadow-inner border border-slate-100 inline-block mb-4">
                    {value ? (
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}`}
                            alt="QR Code"
                            className="w-full h-auto max-w-[200px]"
                        />
                    ) : (
                        <div className="w-48 h-48 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl">
                            No Data
                        </div>
                    )}
                </div>

                <p className="text-xs font-mono text-slate-400 break-all px-4">
                    {value}
                </p>
            </div>
        </div>
    );
};

export default QRModal;
