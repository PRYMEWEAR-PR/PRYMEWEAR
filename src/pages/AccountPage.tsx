import React, { useState, useEffect } from "react";
import {
  User,
  Package,
  MapPin,
  Star,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  ChevronRight,
  Truck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Order, Review, Address } from "../types";
import { OrderTimeline } from "../components/OrderTimeline";
import { getFirestoreOrdersForUser } from "../lib/firebaseServices";

interface AccountPageProps {
  initialTab?: string;
  onNavigateToShop: () => void;
  onOpenTrackOrder?: (orderId?: string) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  initialTab = "orders",
  onNavigateToShop,
  onOpenTrackOrder,
}) => {
  const { user, token, logoutCustomer, updateCustomerProfile, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Profile Edit State
  const [name, setName] = useState(user?.name || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // New Address State
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddrFullName, setNewAddrFullName] = useState("");
  const [newAddrMobile, setNewAddrMobile] = useState("");
  const [newAddrLine, setNewAddrLine] = useState("");
  const [newAddrCity, setNewAddrCity] = useState("");
  const [newAddrState, setNewAddrState] = useState("Maharashtra");
  const [newAddrPincode, setNewAddrPincode] = useState("");
  const [newAddrLandmark, setNewAddrLandmark] = useState("");

  useEffect(() => {
    if (!token) return;

    const fetchOrders = async () => {
      try {
        let loadedOrders: Order[] = [];
        try {
          const res = await fetch("/api/orders", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success && data.orders && data.orders.length > 0) {
            loadedOrders = data.orders;
          }
        } catch (apiErr) {
          console.warn("API orders load error, querying Firestore:", apiErr);
        }

        if (loadedOrders.length === 0 && user) {
          const fsOrders = await getFirestoreOrdersForUser(user.email, user.id);
          if (fsOrders.length > 0) {
            loadedOrders = fsOrders;
          }
        }

        setOrders(loadedOrders);
      } catch (err) {
        console.error("Failed to load customer orders:", err);
      } finally {
        setLoadingOrders(false);
      }
    };

    const fetchReviews = async () => {
      try {
        const res = await fetch("/api/customer/reviews", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setReviews(data.reviews || []);
        }
      } catch (err) {}
    };

    fetchOrders();
    fetchReviews();
  }, [token]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold uppercase tracking-wider text-black mb-2">
          Account Access Required
        </h2>
        <p className="text-xs text-gray-500 mb-6">
          Sign in or create an account to view your orders, addresses, and account details.
        </p>
        <button
          onClick={() => openAuthModal("login")}
          className="px-6 py-3.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");
    setIsUpdatingProfile(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          mobile,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to update profile");
      }
      updateCustomerProfile(data.user);
      setProfileMsg("Profile updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setProfileError(err.message || "Update failed");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAddress: Address = {
      id: "addr_" + Math.random().toString(36).substring(2, 8),
      fullName: newAddrFullName || user.name,
      mobile: newAddrMobile || user.mobile,
      addressLine: newAddrLine,
      city: newAddrCity,
      state: newAddrState,
      pincode: newAddrPincode,
      landmark: newAddrLandmark,
    };

    const currentAddresses = user.savedAddresses || [];
    const updated = [...currentAddresses, newAddress];

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ savedAddresses: updated }),
      });
      const data = await res.json();
      if (data.success) {
        updateCustomerProfile(data.user);
        setShowAddAddress(false);
        setNewAddrLine("");
        setNewAddrCity("");
        setNewAddrPincode("");
        setNewAddrLandmark("");
      }
    } catch (err) {}
  };

  const handleDeleteAddress = async (addrId?: string) => {
    if (!addrId) return;
    const updated = (user.savedAddresses || []).filter((a) => a.id !== addrId);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ savedAddresses: updated }),
      });
      const data = await res.json();
      if (data.success) updateCustomerProfile(data.user);
    } catch (err) {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Account Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-8 border-b border-gray-200 gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
            Client Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-black font-mono">
            Welcome, {user.name}
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{user.email}</p>
        </div>

        <button
          onClick={logoutCustomer}
          className="inline-flex items-center space-x-1.5 px-4 py-2 border border-gray-300 text-xs font-bold uppercase tracking-wider text-gray-700 hover:text-black hover:border-black transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Account Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-8">
        {/* Left Nav */}
        <div className="md:col-span-3 space-y-1">
          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "orders"
                ? "bg-black text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-black"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Package className="w-4 h-4" />
              <span>Orders ({orders.length})</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab("addresses")}
            className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "addresses"
                ? "bg-black text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-black"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <MapPin className="w-4 h-4" />
              <span>Saved Addresses ({(user.savedAddresses || []).length})</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "profile"
                ? "bg-black text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-black"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <User className="w-4 h-4" />
              <span>Profile Settings</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab("reviews")}
            className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "reviews"
                ? "bg-black text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-black"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Star className="w-4 h-4" />
              <span>My Reviews ({reviews.length})</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Content Area */}
        <div className="md:col-span-9">
          {/* 1. ORDERS TAB */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h2 className="text-base font-black uppercase tracking-wider text-black">
                  Order History & Live Tracking
                </h2>
              </div>

              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-gray-500 font-semibold">
                  Loading your orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center bg-gray-50 border border-gray-200 p-8">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-bold uppercase tracking-wider text-black mb-1">
                    No orders placed yet
                  </p>
                  <p className="text-xs text-gray-500 mb-6">
                    Discover our heavyweight French terry streetwear pieces and place your first COD order.
                  </p>
                  <button
                    onClick={onNavigateToShop}
                    className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800"
                  >
                    Shop PRYME Drops
                  </button>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border border-gray-200 p-6 space-y-6 shadow-xs"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-100 gap-2">
                      <div>
                        <div className="flex items-center space-x-3">
                          <span className="text-base font-black text-black font-mono">
                            #{order.id}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 tracking-wider ${
                              order.status === "confirmed"
                                ? "bg-emerald-100 text-emerald-800"
                                : order.status === "delivered"
                                ? "bg-green-100 text-green-900"
                                : order.status === "shipped"
                                ? "bg-blue-100 text-blue-800"
                                : order.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {order.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Placed on{" "}
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="text-right flex items-center space-x-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-500">
                            {order.paymentMethod === "ONLINE" || order.paymentStatus === "completed"
                              ? "PREPAID (Paid Online)"
                              : "Payable (COD)"}
                          </span>
                          <p className="text-sm font-extrabold text-black font-mono">
                            ₹{order.totalAmount.toLocaleString("en-IN")}
                          </p>
                        </div>
                        {onOpenTrackOrder && (
                          <button
                            onClick={() => onOpenTrackOrder(order.id)}
                            className="px-3 py-1.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors flex items-center space-x-1"
                            title="Open Real-Time Tracking Modal"
                          >
                            <Truck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Track Live</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 bg-gray-100 text-black text-xs font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </div>
                    </div>

                    {/* Visual Order Timeline Tracker */}
                    <OrderTimeline
                      status={order.status}
                      statusHistory={order.statusHistory}
                      estimatedDelivery={order.estimatedDelivery}
                      trackingNumber={order.trackingNumber}
                    />

                    {/* Ordered Items Preview */}
                    <div className="divide-y divide-gray-100">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-3">
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-12 h-14 object-cover object-top bg-gray-100"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-bold text-black uppercase">{item.productName}</p>
                              <p className="text-[11px] text-gray-500">
                                Size: {item.size} | Color: {item.color} | Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-black font-mono">
                            ₹{item.totalPrice.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 2. SAVED ADDRESSES TAB */}
          {activeTab === "addresses" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h2 className="text-base font-black uppercase tracking-wider text-black">
                  Saved Delivery Addresses
                </h2>
                <button
                  onClick={() => setShowAddAddress(!showAddAddress)}
                  className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800"
                >
                  {showAddAddress ? "Cancel" : "+ Add New Address"}
                </button>
              </div>

              {showAddAddress && (
                <form onSubmit={handleSaveAddress} className="bg-gray-50 border border-gray-300 p-6 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                    Add New Delivery Address
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddrFullName}
                        onChange={(e) => setNewAddrFullName(e.target.value)}
                        placeholder="Recipient full name"
                        className="w-full p-2.5 bg-white border border-gray-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={newAddrMobile}
                        onChange={(e) => setNewAddrMobile(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full p-2.5 bg-white border border-gray-300 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddrLine}
                        onChange={(e) => setNewAddrLine(e.target.value)}
                        placeholder="Flat / House / Street"
                        className="w-full p-2.5 bg-white border border-gray-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddrCity}
                        onChange={(e) => setNewAddrCity(e.target.value)}
                        placeholder="City"
                        className="w-full p-2.5 bg-white border border-gray-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddrPincode}
                        onChange={(e) => setNewAddrPincode(e.target.value)}
                        placeholder="Pincode"
                        className="w-full p-2.5 bg-white border border-gray-300 text-xs"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800"
                  >
                    Save Address
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(user.savedAddresses || []).map((addr, idx) => (
                  <div key={idx} className="p-4 bg-white border border-gray-200 space-y-2 relative">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      Address #{idx + 1}
                    </span>
                    <p className="text-xs font-bold text-black">{addr.fullName}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {addr.addressLine}, {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                    <p className="text-xs text-gray-500">Phone: {addr.mobile}</p>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-[10px] text-red-600 hover:underline font-bold uppercase mt-2 block"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. PROFILE SETTINGS TAB */}
          {activeTab === "profile" && (
            <div className="bg-white border border-gray-200 p-6 space-y-6 max-w-xl">
              <h2 className="text-base font-black uppercase tracking-wider text-black pb-2 border-b border-gray-100">
                Account Details & Password
              </h2>

              {profileMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  {profileMsg}
                </div>
              )}
              {profileError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {profileError}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Email (Immutable)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full p-2.5 bg-gray-100 border border-gray-200 text-xs text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Mobile Number (for COD updates)
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black"
                  />
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">
                    Change Password (Optional)
                  </h3>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  {isUpdatingProfile ? "Saving Changes..." : "Save Profile Details"}
                </button>
              </form>
            </div>
          )}

          {/* 4. REVIEWS TAB */}
          {activeTab === "reviews" && (
            <div className="space-y-4">
              <h2 className="text-base font-black uppercase tracking-wider text-black pb-2 border-b border-gray-100">
                Your Submitted Reviews
              </h2>
              {reviews.length === 0 ? (
                <div className="py-12 text-center bg-gray-50 border border-gray-200">
                  <p className="text-xs font-bold uppercase text-gray-500">
                    You haven't submitted any reviews yet
                  </p>
                </div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-white border border-gray-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-black uppercase">{rev.productName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(rev.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center text-amber-500">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-500" />
                      ))}
                    </div>
                    <p className="text-xs text-gray-700 italic font-light">"{rev.review}"</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Complete Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="relative bg-white w-full max-w-2xl p-6 sm:p-8 shadow-2xl border border-neutral-300 z-10 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Order Details</span>
                <h3 className="text-lg font-black text-black font-mono uppercase">
                  #{selectedOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <OrderTimeline
              status={selectedOrder.status}
              statusHistory={selectedOrder.statusHistory}
              estimatedDelivery={selectedOrder.estimatedDelivery}
              trackingNumber={selectedOrder.trackingNumber}
            />

            {/* Delivery address & items */}
            <div className="space-y-4 text-xs">
              <div className="bg-gray-50 p-4 border border-gray-200">
                <span className="font-bold uppercase text-gray-500 block mb-1">
                  Shipping Address
                </span>
                <p className="font-bold text-black">{selectedOrder.shippingAddress.fullName}</p>
                <p className="text-gray-600">
                  {selectedOrder.shippingAddress.addressLine}, {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.pincode}
                </p>
                <p className="text-gray-500 mt-1">Phone: {selectedOrder.shippingAddress.mobile}</p>
              </div>

              <div className="divide-y divide-gray-100">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-black uppercase">{item.productName}</p>
                      <p className="text-gray-500">
                        Size: {item.size} | Color: {item.color} | Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-bold text-black font-mono">
                      ₹{item.totalPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-200 space-y-1">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>₹{selectedOrder.subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span>{selectedOrder.shippingCharges === 0 ? "FREE" : "₹" + selectedOrder.shippingCharges}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-black pt-2 border-t border-gray-200">
                  <span>Total Due (COD)</span>
                  <span>₹{selectedOrder.totalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
