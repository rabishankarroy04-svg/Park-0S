import React, { useState } from 'react';
import { Clock, IndianRupee, X, CheckCircle, AlertCircle } from 'lucide-react';

const ReservationModal = ({ isOpen, onClose, slot, onConfirm }) => {
    const [duration, setDuration] = useState(15); // Default 15 mins
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen || !slot) return null;

    const rate = slot.pricePerHour || 50;
    const amount = Math.ceil(rate * (duration / 60));

    const handlePayment = async () => {
        setIsProcessing(true);
        // Simulate Payment Gateway Delay
        setTimeout(() => {
            setIsProcessing(false);
            onConfirm(duration, amount);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-white/90 backdrop-blur-xl border border-white/50 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 pb-2 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Reserve Slot</h3>
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">{slot.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* Time Selection */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Hold Duration
                            </label>
                            <span className="text-xl font-bold text-blue-600">{duration} min</span>
                        </div>
                        <input
                            type="range"
                            min="15"
                            max="60"
                            step="15"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-xs font-medium text-slate-400 px-1">
                            <span>15m</span>
                            <span>30m</span>
                            <span>45m</span>
                            <span>60m</span>
                        </div>
                        <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            The slot will be held for you for {duration} minutes. If you don't arrive by then, reservation expires.
                        </p>
                    </div>

                    {/* Cost Calculation */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex justify-between items-center">
                        <span className="text-sm font-bold text-blue-800/70 uppercase tracking-wider">Total Payable</span>
                        <div className="flex items-center gap-1 text-2xl font-extrabold text-blue-700">
                            <IndianRupee className="w-6 h-6" />
                            {amount}
                        </div>
                    </div>

                    {/* Non-Refundable Warning */}
                    <div className="flex items-start gap-2 text-[10px] text-amber-600 font-medium bg-amber-50 p-3 rounded-xl border border-amber-100/50">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Payment is <b>non-refundable</b>. Ensure you arrive within the selected window.</span>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {isProcessing ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Pay & Reserve
                            </>
                        )}
                    </button>

                </div>
            </div>
        </div>
    );
};

export default ReservationModal;
