import { useState } from "react";
import { Mail, Lock, User, X, LogIn, UserPlus } from "lucide-react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth } from "../firebase";
import database from "../firebase";

const LoginForm = ({ onClose }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isSignup) {
                // Sign Up
                if (password.length < 6) {
                    setError("Password must be at least 6 characters");
                    setLoading(false);
                    return;
                }

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                // Update profile with name
                await updateProfile(userCredential.user, {
                    displayName: name || email.split('@')[0]
                });

                // Create user data in database
                await set(ref(database, `users/${userCredential.user.uid}`), {
                    email: email,
                    displayName: name || email.split('@')[0],
                    walletBalance: 100, // Starting balance
                    createdAt: Date.now()
                });

                console.log("✅ Signup successful!");
                onClose();
            } else {
                // Sign In
                await signInWithEmailAndPassword(auth, email, password);
                console.log("✅ Login successful!");
                onClose();
            }
        } catch (err) {
            console.error("Auth error:", err);

            // User-friendly error messages
            switch (err.code) {
                case 'auth/email-already-in-use':
                    setError("Email already registered. Try logging in instead.");
                    break;
                case 'auth/invalid-email':
                    setError("Invalid email address.");
                    break;
                case 'auth/weak-password':
                    setError("Password is too weak. Use at least 6 characters.");
                    break;
                case 'auth/user-not-found':
                    setError("No account found. Please sign up first.");
                    break;
                case 'auth/wrong-password':
                    setError("Incorrect password.");
                    break;
                case 'auth/invalid-credential':
                    setError("Invalid email or password.");
                    break;
                default:
                    setError(err.message || "Authentication failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"
                >
                    <X className="w-5 h-5 text-slate-600" />
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
                        {isSignup ? "Create Account" : "Welcome Back"}
                    </h2>
                    <p className="text-slate-500 text-sm">
                        {isSignup ? "Sign up to get started" : "Sign in to continue"}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignup && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">At least 6 characters</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : isSignup ? (
                            <>
                                <UserPlus className="w-5 h-5" />
                                Sign Up
                            </>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                {/* Toggle */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsSignup(!isSignup);
                            setError("");
                        }}
                        className="text-sm text-slate-600 hover:text-slate-900 font-medium"
                    >
                        {isSignup ? "Already have an account? " : "Don't have an account? "}
                        <span className="text-blue-600 font-bold">
                            {isSignup ? "Sign In" : "Sign Up"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;
