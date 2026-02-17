import { useState } from "react";
import { Menu, Wallet as WalletIcon, User, Home, Clock, LogOut, X } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import LoginForm from "./LoginForm";


const Navbar = ({ onNavigate, currentUser, walletBalance, currentView }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsMenuOpen(false);
      onNavigate('home');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const getNavItemClass = (viewName) => {
    const baseClass = "flex items-center gap-4 p-4 rounded-xl transition-all active:scale-95 font-bold cursor-pointer";
    return currentView === viewName
      ? `${baseClass} bg-blue-100 text-blue-700` // Active
      : `${baseClass} text-slate-700 hover:bg-slate-100`; // Inactive
  };

  return (
    <>
      {showLogin && <LoginForm onClose={() => setShowLogin(false)} />}

      <nav className="fixed top-0 left-0 w-full z-40 h-20 bg-white/60 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-4 md:px-10 shadow-sm transition-all duration-300">
        {/* Logo */}
        <div
          className="text-slate-800 text-2xl font-extrabold cursor-pointer tracking-tight"
          onClick={() => onNavigate('home')}
        >
          Park-0S
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">

          {/* Wallet Badge (Always Visible if Logged In) */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/40 border border-white/40 rounded-full shadow-sm">
              <WalletIcon className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-slate-700">₹{walletBalance}</span>
              <button
                onClick={async () => {
                  const amount = prompt("Add balance (₹):", "100");
                  if (amount && !isNaN(amount)) {
                    const { ref, update } = await import('firebase/database');
                    const { default: database } = await import('../firebase');
                    await update(ref(database, `users/${currentUser.uid}`), {
                      walletBalance: walletBalance + parseInt(amount)
                    });
                  }
                }}
                className="ml-1 w-6 h-6 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold transition active:scale-90"
                title="Add Balance"
              >
                +
              </button>
            </div>
          )}

          {currentUser ? (
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-3 bg-white/50 rounded-full hover:bg-white/80 transition shadow-sm text-slate-800"
            >
              <Menu className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="px-5 py-2 bg-slate-900 text-white rounded-full font-semibold shadow-lg hover:bg-slate-800 transition active:scale-95 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}
        </div>
      </nav>

      {/* Side Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{currentUser?.displayName || currentUser?.email}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <WalletIcon className="w-4 h-4 text-blue-300" />
                  <span className="text-blue-100 font-semibold">₹{walletBalance}</span>
                </div>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Add Balance Button */}
            <div className="px-6 py-4 border-b border-slate-200">
              <button
                onClick={async () => {
                  const { ref, update } = await import('firebase/database');
                  const { default: database } = await import('../firebase');
                  await update(ref(database, `users/${currentUser.uid}`), {
                    walletBalance: walletBalance + 1000
                  });
                  alert('₹1000 added to your wallet!');
                }}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <WalletIcon className="w-5 h-5" />
                Add ₹1000 Balance
              </button>
            </div>

            {/* Nav Items */}
            <div className="flex-1 px-6 py-4 space-y-2">
              <div onClick={() => { onNavigate('home'); setIsMenuOpen(false); }} className={getNavItemClass('home')}>
                <Home className="w-5 h-5" />
                Home
              </div>
              <div onClick={() => { onNavigate('profile'); setIsMenuOpen(false); }} className={getNavItemClass('profile')}>
                <User className="w-5 h-5" />
                My Profile
              </div>
              <div onClick={() => { onNavigate('reservations'); setIsMenuOpen(false); }} className={getNavItemClass('reservations')}>
                <Clock className="w-5 h-5" />
                History & Reservations
              </div>
            </div>

            {/* Logout Button */}
            <div className="p-6 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg transition active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
