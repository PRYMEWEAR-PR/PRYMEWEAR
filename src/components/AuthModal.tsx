import React, { useState } from "react";
import { X, Lock, Mail, User, Phone, ArrowRight, Eye, EyeOff, AlertCircle, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalMode, 
    loginCustomer,
    loginWithGoogle,
    loginWithEmailPass,
    registerWithEmailPass,
    resetPassword
  } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot">(authModalMode || "login");
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sync mode when modal opens
  React.useEffect(() => {
    if (authModalMode) setMode(authModalMode);
    setErrorMsg("");
    setSuccessMsg("");
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      closeAuthModal();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setErrorMsg(err.message || "Failed to sign in with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (mode === "login") {
        try {
          // Attempt Firebase Auth login first
          await loginWithEmailPass(email, password);
        } catch (firebaseErr: any) {
          // Fallback to server direct login if Firebase user wasn't registered in Firebase Auth yet
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!data.success) {
            throw new Error(firebaseErr.message || data.message || "Invalid credentials");
          }
          loginCustomer(data.token, data.user);
        }
      } else if (mode === "register") {
        if (!name || !email || !password) {
          throw new Error("Please complete all required fields");
        }
        try {
          // Register with Firebase Auth & Firestore
          await registerWithEmailPass(name, email, mobile, password);
        } catch (firebaseErr: any) {
          // Fallback to server registration
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, mobile, password }),
          });
          const data = await res.json();
          if (!data.success) {
            throw new Error(firebaseErr.message || data.message || "Registration failed");
          }
          loginCustomer(data.token, data.user);
        }
      } else if (mode === "forgot") {
        try {
          await resetPassword(email);
          setSuccessMsg("Password reset email sent via Firebase! Please check your inbox.");
        } catch (e: any) {
          const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, newPassword }),
          });
          const data = await res.json();
          if (!data.success) {
            throw new Error(data.message || "Password reset failed");
          }
          setSuccessMsg("Password reset successfully! You can now log in.");
        }
        setTimeout(() => setMode("login"), 2500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" id="auth-modal-wrapper">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={closeAuthModal}
      />

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-md p-8 shadow-2xl border border-neutral-200 z-10 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Branding */}
        <div className="text-center mb-6">
          <span className="text-xl font-black tracking-[0.25em] uppercase text-black font-mono">
            PRYMEWEAR
          </span>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-1">
            {mode === "login"
              ? "Sign in to your Firebase client account"
              : mode === "register"
              ? "Create your PRYME Firebase account"
              : "Reset Account Password"}
          </p>
        </div>

        {/* 1-Click Google Sign In (Firebase) */}
        {mode !== "forgot" && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 bg-white border border-[#dddddd] hover:border-black text-black text-xs font-bold uppercase tracking-[1px] flex items-center justify-center space-x-3 transition-colors shadow-xs"
              id="google-signin-btn"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12c0 2.02.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{googleLoading ? "Connecting Firebase..." : "Continue with Google"}</span>
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-[#eeeeee]" />
              <span className="px-3 text-[10px] uppercase tracking-wider text-[#888888] font-bold">or with email</span>
              <div className="flex-1 border-t border-[#eeeeee]" />
            </div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        {mode !== "forgot" && (
          <div className="flex border-b border-gray-200 mb-5">
            <button
              onClick={() => {
                setMode("login");
                setErrorMsg("");
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                mode === "login"
                  ? "text-black border-b-2 border-black"
                  : "text-gray-400 hover:text-black"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode("register");
                setErrorMsg("");
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                mode === "register"
                  ? "text-black border-b-2 border-black"
                  : "text-gray-400 hover:text-black"
              }`}
            >
              Register
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Mobile Number (for COD delivery SMS/updates)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>
            </div>
          )}

          {mode !== "forgot" ? (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700">
                  Password *
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErrorMsg("");
                    }}
                    className="text-[11px] text-gray-500 hover:text-black underline font-medium"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-black"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Choose New Password / Reset *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="Enter new password (optional)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            id="auth-submit-btn"
          >
            <span>
              {loading
                ? "Processing Firebase Auth..."
                : mode === "login"
                ? "Sign In"
                : mode === "register"
                ? "Create Account"
                : "Send Reset Link"}
            </span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {mode === "forgot" && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setMode("login")}
              className="text-xs text-gray-600 hover:text-black font-semibold underline uppercase tracking-wider"
            >
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
