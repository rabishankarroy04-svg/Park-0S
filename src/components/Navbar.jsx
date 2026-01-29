import { useState } from "react";
import { Menu, Wallet as WalletIcon, User, Home, Clock, LogOut, X } from "lucide-react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";


const Navbar = ({ onNavigate, currentUser, walletBalance, currentView }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

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
              onClick={handleLogin}
              className="px-5 py-2 bg-slate-900 text-white rounded-full font-semibold shadow-lg hover:bg-slate-800 transition active:scale-95 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}
        </div>
      </nav>

      {/* Hamburger Menu Drawer */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity duration-300"
          />

          {/* Drawer */}
          <div
            className={`fixed top-0 right-0 h-full w-[80%] max-w-sm bg-white/90 backdrop-blur-2xl z-[60] shadow-2xl p-6 flex flex-col transition-transform duration-300 transform ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-extrabold text-slate-800">Menu</h3>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-100 rounded-full">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            {/* User Info Snippet */}
            <div className="bg-gradient-to-br from-slate-100 to-white border border-white p-4 rounded-2xl mb-6 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
              </div>
              <div>
                <p className="font-bold text-slate-800">{currentUser?.displayName}</p>
                <p className="text-xs text-slate-500 truncate w-32">{currentUser?.email}</p>
              </div>
            </div>

            {/* Nav Items */}
            <div className="space-y-2 flex-1">
              <div onClick={() => { onNavigate('home'); setIsMenuOpen(false); }} className={getNavItemClass('home')}>
                <Home className="w-5 h-5 text-blue-600" />
                Home
              </div>
              <div onClick={() => { onNavigate('profile'); setIsMenuOpen(false); }} className={getNavItemClass('profile')}>
                <User className="w-5 h-5 text-purple-600" />
                My Profile
              </div>
              <div onClick={() => { onNavigate('reservations'); setIsMenuOpen(false); }} className={getNavItemClass('reservations')}>
                <Clock className="w-5 h-5 text-orange-600" />
                History & Reservations
              </div>
            </div>

            {/* Wallet (Mobile visual) */}
            <div className="bg-blue-500 p-4 rounded-2xl text-white mb-4 flex justify-between items-center shadow-lg shadow-blue-500/20">
              <div className="flex items-center gap-2">
                <WalletIcon className="w-5 h-5" />
                <span className="font-medium">Balance</span>
              </div>
              <span className="text-2xl font-bold">₹{walletBalance}</span>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-4 bg-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-300 transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>

          </div>
        </>
      )}
    </>
  );
};

export default Navbar;
