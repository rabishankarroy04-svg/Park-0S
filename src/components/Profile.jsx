import React from "react";
import { User, Mail, CreditCard, Shield } from "lucide-react";

const Profile = ({ user, walletBalance, onBack }) => {
    return (
        <div className="w-full max-w-lg mx-auto pb-24 px-4">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-6 px-2">My Profile</h2>

            {/* Profile Card */}
            <div className="bg-white/40 backdrop-blur-xl border border-white/40 shadow-[0_10px_32px_rgba(0,0,0,0.05)] rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden">

                {/* Avatar Section */}
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl mb-4 text-3xl font-bold">
                        {user?.displayName ? user.displayName[0].toUpperCase() : "U"}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">{user?.displayName || "User"}</h3>
                    <p className="text-slate-500 text-sm">{user?.email}</p>
                </div>

                {/* Info List */}
                <div className="space-y-4">
                    <div className="bg-white/50 p-4 rounded-2xl flex items-center gap-4">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">User ID</p>
                            <p className="text-sm font-mono text-slate-700 truncate w-48">{user?.uid}</p>
                        </div>
                    </div>

                    <div className="bg-white/50 p-4 rounded-2xl flex items-center gap-4">
                        <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Wallet Balance</p>
                            <p className="text-xl font-bold text-slate-800">₹{walletBalance}</p>
                        </div>
                    </div>

                    <div className="bg-white/50 p-4 rounded-2xl flex items-center gap-4">
                        <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Account Type</p>
                            <p className="text-sm font-semibold text-slate-700">Standard Member</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onBack}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition active:scale-95"
                >
                    Back to Home
                </button>

            </div>
        </div>
    );
};

export default Profile;
