import React, { createContext, useContext, useState, useEffect } from "react";
import { User, AdminUser } from "../types";
import { 
  signInWithGoogle as firebaseGoogleSignIn, 
  registerWithFirebase as fbRegister, 
  loginWithFirebase as fbLogin, 
  resetPasswordFirebase as fbResetPass, 
  logoutFirebase as fbLogout,
  auth as firebaseAuth
} from "../lib/firebaseServices";
import { onAuthStateChanged } from "firebase/auth";

interface AuthContextType {
  user: User | null;
  admin: AdminUser | null;
  token: string | null;
  adminToken: string | null;
  isLoading: boolean;
  loginCustomer: (token: string, user: User) => void;
  logoutCustomer: () => Promise<void>;
  updateCustomerProfile: (user: User) => void;
  loginAdmin: (token: string, admin: AdminUser) => void;
  logoutAdmin: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: "login" | "register") => void;
  closeAuthModal: () => void;
  authModalMode: "login" | "register";
  loginWithGoogle: () => Promise<void>;
  registerWithEmailPass: (name: string, email: string, mobile: string, pass: string) => Promise<void>;
  loginWithEmailPass: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("prymewear_token"));
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem("prymewear_admin_token"));
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");

  const openAuthModal = (mode: "login" | "register" = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Listen to Firebase auth changes & local session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          const fallbackUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split("@")[0] || "PRYME Member",
            email: fbUser.email || "",
            mobile: fbUser.phoneNumber || "",
            role: "customer",
            savedAddresses: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Synchronize with server backend session
          try {
            const syncRes = await fetch("/api/auth/firebase-sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user: fallbackUser, token: idToken }),
            });
            const syncData = await syncRes.json();
            if (syncData.success && syncData.token) {
              setUser(syncData.user);
              setToken(syncData.token);
              localStorage.setItem("prymewear_token", syncData.token);
              localStorage.setItem("prymewear_cached_user", JSON.stringify(syncData.user));
              return;
            }
          } catch (syncErr) {
            console.warn("Backend sync warning:", syncErr);
          }

          // Fallback if sync is offline
          if (!user) {
            setUser(fallbackUser);
            setToken(idToken);
            localStorage.setItem("prymewear_token", idToken);
            localStorage.setItem("prymewear_cached_user", JSON.stringify(fallbackUser));
          }
        } catch (e) {
          console.warn("Firebase token refresh error:", e);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Load customer profile if token exists
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!token) {
        // If not in firebase, check fallback local user
        const storedUser = localStorage.getItem("prymewear_cached_user");
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {}
        }
        return;
      }
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem("prymewear_cached_user", JSON.stringify(data.user));
        } else {
          // If server token is invalid or using Firebase directly
        }
      } catch (err) {
        console.error("Auth fetch error:", err);
      }
    };

    const fetchAdmin = async () => {
      if (!adminToken) {
        setAdmin(null);
        return;
      }
      try {
        const res = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const data = await res.json();
        if (data.success && data.admin) {
          setAdmin(data.admin);
        } else {
          localStorage.removeItem("prymewear_admin_token");
          setAdminToken(null);
          setAdmin(null);
        }
      } catch (err) {
        console.error("Admin auth fetch error:", err);
      }
    };

    Promise.all([fetchCustomer(), fetchAdmin()]).finally(() => {
      setIsLoading(false);
    });
  }, [token, adminToken]);

  const loginCustomer = (newToken: string, newUser: User) => {
    localStorage.setItem("prymewear_token", newToken);
    localStorage.setItem("prymewear_cached_user", JSON.stringify(newUser));
    if (newUser.savedAddresses && newUser.savedAddresses.length > 0) {
      try {
        localStorage.setItem("prymewear_saved_address", JSON.stringify(newUser.savedAddresses[0]));
      } catch (e) {}
    }
    setToken(newToken);
    setUser(newUser);
    closeAuthModal();
  };

  const loginWithGoogle = async () => {
    const { user: fbUser, token: fbToken } = await firebaseGoogleSignIn();
    try {
      const syncRes = await fetch("/api/auth/firebase-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: fbUser, token: fbToken }),
      });
      const syncData = await syncRes.json();
      if (syncData.success && syncData.token) {
        loginCustomer(syncData.token, syncData.user);
        return;
      }
    } catch (e) {}
    loginCustomer(fbToken, fbUser);
  };

  const registerWithEmailPass = async (name: string, email: string, mobile: string, pass: string) => {
    const { user: fbUser, token: fbToken } = await fbRegister(name, email, mobile, pass);
    try {
      const syncRes = await fetch("/api/auth/firebase-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: fbUser, token: fbToken }),
      });
      const syncData = await syncRes.json();
      if (syncData.success && syncData.token) {
        loginCustomer(syncData.token, syncData.user);
        return;
      }
    } catch (e) {}
    loginCustomer(fbToken, fbUser);
  };

  const loginWithEmailPass = async (email: string, pass: string) => {
    const { user: fbUser, token: fbToken } = await fbLogin(email, pass);
    try {
      const syncRes = await fetch("/api/auth/firebase-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: fbUser, token: fbToken }),
      });
      const syncData = await syncRes.json();
      if (syncData.success && syncData.token) {
        loginCustomer(syncData.token, syncData.user);
        return;
      }
    } catch (e) {}
    loginCustomer(fbToken, fbUser);
  };

  const resetPassword = async (email: string) => {
    await fbResetPass(email);
  };

  const logoutCustomer = async () => {
    try {
      await fbLogout();
    } catch (e) {}
    localStorage.removeItem("prymewear_token");
    localStorage.removeItem("prymewear_cached_user");
    setToken(null);
    setUser(null);
  };

  const updateCustomerProfile = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("prymewear_cached_user", JSON.stringify(updatedUser));
    if (updatedUser.savedAddresses && updatedUser.savedAddresses.length > 0) {
      try {
        localStorage.setItem("prymewear_saved_address", JSON.stringify(updatedUser.savedAddresses[0]));
      } catch (e) {}
    }
  };

  const loginAdmin = (newAdminToken: string, newAdmin: AdminUser) => {
    localStorage.setItem("prymewear_admin_token", newAdminToken);
    setAdminToken(newAdminToken);
    setAdmin(newAdmin);
  };

  const logoutAdmin = () => {
    localStorage.removeItem("prymewear_admin_token");
    setAdminToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        admin,
        token,
        adminToken,
        isLoading,
        loginCustomer,
        logoutCustomer,
        updateCustomerProfile,
        loginAdmin,
        logoutAdmin,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalMode,
        loginWithGoogle,
        registerWithEmailPass,
        loginWithEmailPass,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
