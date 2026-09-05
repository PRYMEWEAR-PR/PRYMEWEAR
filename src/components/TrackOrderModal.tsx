import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  CheckCheck,
  XCircle,
  MapPin,
  Calendar,
  Copy,
  Check,
  PhoneCall,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  Radio
} from "lucide-react";
import { Order } from "../types";
import { getFirestoreOrder, subscribeToFirestoreOrder } from "../lib/firebaseServices";

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
  onNavigateToShop?: () => void;
}

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({
  isOpen,
  onClose,
  initialOrderId = "",
  onNavigateToShop,
}) => {
  const [orderIdInput, setOrderIdInput] = useState("");
  const [activeOrderId, setActiveOrderId] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [recentOrderIds, setRecentOrderIds] = useState<string[]>([]);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent orders from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("prymewear_recent_searched_orders");
      if (saved) {
        setRecentOrderIds(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  // Save to recent searches
  const saveRecentOrderId = (id: string) => {
    try {
      const updated = [id, ...recentOrderIds.filter((item) => item !== id)].slice(0, 4);
      setRecentOrderIds(updated);
      localStorage.setItem("prymewear_recent_searched_orders", JSON.stringify(updated));
    } catch (e) {}
  };

  // Trigger search when modal opens with initialOrderId or on mount
  useEffect(() => {
    if (isOpen) {
      if (initialOrderId) {
        setOrderIdInput(initialOrderId.toUpperCase());
        executeTrackOrder(initialOrderId.toUpperCase());
      } else if (!activeOrderId) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    } else {
      // Clean up subscription on modal close
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsLiveConnected(false);
    }
  }, [isOpen, initialOrderId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const executeTrackOrder = async (targetId: string) => {
    const cleanId = targetId.trim().toUpperCase();
    if (!cleanId) {
      setError("Please enter a valid Order ID (e.g. ORD-10001)");
      return;
    }

    setLoading(true);
    setError(null);
    setActiveOrderId(cleanId);

    // 1. Clean previous subscription if any
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setIsLiveConnected(false);

    try {
      // 2. Query Firestore first or REST API
      let foundOrder = await getFirestoreOrder(cleanId);

      if (!foundOrder) {
        // Try fallback to REST server endpoint
        try {
          const res = await fetch(`/api/orders/track/${encodeURIComponent(cleanId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.order) {
              foundOrder = data.order;
            }
          }
        } catch (e) {
          console.warn("REST tracking fallback error:", e);
        }
      }

      if (foundOrder) {
        setOrder(foundOrder);
        saveRecentOrderId(cleanId);

        // 3. Attach real-time Firestore listener for live status updates
        try {
          const unsub = subscribeToFirestoreOrder(
            cleanId,
            (updatedDoc) => {
              if (updatedDoc) {
                setOrder(updatedDoc);
                setIsLiveConnected(true);
              }
            },
            (err) => {
              console.warn("Realtime order stream notice:", err);
            }
          );
          unsubscribeRef.current = unsub;
          setIsLiveConnected(true);
        } catch (err) {
          console.warn("Could not attach Firestore real-time listener:", err);
        }
      } else {
        setOrder(null);
        setError(`No active order found matching #${cleanId}. Please check the ID in your SMS / email receipt.`);
      }
    } catch (err: any) {
      setError("Unable to retrieve order details. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeTrackOrder(orderIdInput);
  };

  const handleCopyTracking = (trackNum: string) => {
    navigator.clipboard.writeText(trackNum);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  // Keydown Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Real-time progress calculation
  const statusHierarchy = ["pending", "confirmed", "shipped", "delivered"];
  
  // Normalize status for the 4 key steps
  const normalizedStatus = order?.status === "processing" ? "confirmed" : order?.status || "pending";
  const currentStepIndex = statusHierarchy.indexOf(normalizedStatus);
  const isCancelled = order?.status === "cancelled";

  const stepsConfig = [
    {
      key: "pending",
      title: "Order Placed",
      subtitle: "COD Request Received",
      icon: Clock,
      description: "Order received via Cash on Delivery and logged into system.",
    },
    {
      key: "confirmed",
      title: "Confirmed & Packed",
      subtitle: order?.status === "processing" ? "Currently Packing" : "Stock Reserved",
      icon: CheckCircle2,
      description: "Order verified by admin team and assigned to dispatch station.",
    },
    {
      key: "shipped",
      title: "Dispatched & In Transit",
      subtitle: order?.trackingNumber ? `AWB: ${order.trackingNumber}` : "Express Courier",
      icon: Truck,
      description: "Package handed to courier partner for express doorstep delivery.",
    },
    {
      key: "delivered",
      title: "Delivered",
      subtitle: "Doorstep Received",
      icon: CheckCheck,
      description: "Cash payment collected and shipment successfully handed over.",
    },
  ];

  // Calculate visual progress percentage
  let progressPercentage = 0;
  if (!isCancelled && currentStepIndex >= 0) {
    progressPercentage = (currentStepIndex / (stepsConfig.length - 1)) * 100;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
      id="track-order-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white text-black w-full max-w-3xl border border-neutral-800 shadow-2xl relative my-auto overflow-hidden flex flex-col max-h-[92vh]"
        id="track-order-modal-container"
      >
        {/* Header Bar */}
        <div className="bg-black text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <Package className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-[2px] uppercase font-mono">
                Track Your Order
              </h2>
              <p className="text-[10px] text-neutral-400 tracking-wider uppercase">
                Real-Time Firestore Live Status
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isLiveConnected && (
              <div className="hidden sm:flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Live Firestore Sync</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white transition-colors focus:outline-hidden"
              aria-label="Close track order modal"
              id="close-track-order-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Order ID Input Form */}
          <div className="bg-neutral-50 border border-neutral-200 p-4 sm:p-5">
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <label
                htmlFor="track-order-id-input"
                className="block text-[11px] font-bold uppercase tracking-[1.5px] text-neutral-700"
              >
                Enter PRYME Order Identifier
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    ref={inputRef}
                    id="track-order-id-input"
                    type="text"
                    placeholder="e.g. ORD-10001"
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-10 py-3 bg-white border border-neutral-300 text-xs sm:text-sm font-mono font-bold text-black uppercase tracking-wider focus:outline-hidden focus:border-black transition-colors"
                  />
                  {orderIdInput && (
                    <button
                      type="button"
                      onClick={() => setOrderIdInput("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !orderIdInput.trim()}
                  className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-[1.5px] hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 flex-shrink-0"
                  id="submit-track-order-btn"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Tracking...</span>
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      <span>Track Order</span>
                    </>
                  )}
                </button>
              </div>

              {/* Recent search chips */}
              {recentOrderIds.length > 0 && (
                <div className="pt-2 flex items-center flex-wrap gap-1.5 text-[11px] text-neutral-500">
                  <span className="uppercase text-[10px] font-semibold text-neutral-400 mr-1">
                    Recent:
                  </span>
                  {recentOrderIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setOrderIdInput(id);
                        executeTrackOrder(id);
                      }}
                      className="bg-white border border-neutral-200 px-2 py-0.5 font-mono text-[11px] text-neutral-700 hover:border-black hover:text-black transition-colors"
                    >
                      #{id}
                    </button>
                  ))}
                </div>
              )}
            </form>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 text-center space-y-3 animate-in fade-in duration-150">
              <div className="w-10 h-10 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 font-mono">
                Querying Live Firestore Database for #{activeOrderId}...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 p-4 sm:p-5 flex items-start space-x-3 text-red-800">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider">Order Lookup Notice</h4>
                <p className="text-xs text-red-700 leading-relaxed">{error}</p>
                <p className="text-[11px] text-red-600 pt-1">
                  Need help? Reach out to support at <strong>thekartikbusiness@gmail.com</strong> or call <strong>+91 9211597397</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Order Details & Real-Time Progress View */}
          {order && !loading && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Order Meta Header Card */}
              <div className="bg-neutral-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                      Order ID
                    </span>
                    {isLiveConnected && (
                      <span className="flex items-center space-x-1 text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 uppercase font-bold">
                        <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                        <span>Live Firestore</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-black font-mono tracking-wider text-white mt-0.5">
                    #{order.id}
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Placed on{" "}
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="sm:text-right flex flex-col sm:items-end">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                    Current Status
                  </span>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-black uppercase tracking-widest font-mono border ${
                        order.status === "delivered"
                          ? "bg-emerald-900/80 text-emerald-200 border-emerald-600"
                          : order.status === "shipped"
                          ? "bg-blue-900/80 text-blue-200 border-blue-600"
                          : order.status === "confirmed" || order.status === "processing"
                          ? "bg-amber-900/80 text-amber-200 border-amber-600"
                          : order.status === "cancelled"
                          ? "bg-red-900/80 text-red-200 border-red-600"
                          : "bg-neutral-800 text-neutral-200 border-neutral-700"
                      }`}
                    >
                      {order.status === "processing" ? "PACKING" : order.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-bold mt-1">
                    {order.paymentMethod} • ₹{order.totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Progress Bar (Pending -> Confirmed -> Shipped -> Delivered) */}
              {isCancelled ? (
                <div className="bg-red-50 border border-red-200 p-5 flex items-center space-x-3 text-red-800">
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Order Cancelled</h4>
                    <p className="text-xs text-red-700 mt-0.5">
                      This order has been marked as cancelled. For questions or refunds, please reach out to customer care.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-neutral-200 p-4 sm:p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-[1.5px] text-neutral-900">
                        Fulfillment Progress
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        Step {Math.max(1, currentStepIndex + 1)} of {stepsConfig.length}
                      </p>
                    </div>

                    {order.estimatedDelivery && (
                      <div className="text-right flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold uppercase tracking-wider text-[10px]">
                          Est: {order.estimatedDelivery}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Desktop Step Bar */}
                  <div className="relative pt-4 pb-2">
                    {/* Background track */}
                    <div className="absolute top-7 left-8 right-8 h-1 bg-neutral-200 -translate-y-1/2 hidden md:block" />
                    
                    {/* Active progress fill */}
                    <div
                      className="absolute top-7 left-8 h-1 bg-black -translate-y-1/2 transition-all duration-700 ease-out hidden md:block"
                      style={{ width: `${progressPercentage * 0.84}%` }}
                    />

                    {/* Step Nodes */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
                      {stepsConfig.map((step, idx) => {
                        const Icon = step.icon;
                        const isCompleted = idx < currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        const isUpcoming = idx > currentStepIndex;

                        // Find status note from statusHistory
                        const historyMatch = order.statusHistory?.find(
                          (h) => h.status.toLowerCase() === step.key.toLowerCase()
                        );

                        return (
                          <div
                            key={step.key}
                            className="flex md:flex-col items-center md:text-center space-x-3.5 md:space-x-0"
                          >
                            {/* Step Icon Badge */}
                            <div
                              className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                                isCompleted
                                  ? "bg-black text-white border-black"
                                  : isCurrent
                                  ? "bg-black text-white border-black ring-4 ring-black/15 scale-105"
                                  : "bg-white text-neutral-300 border-neutral-200"
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="w-5 h-5 text-white" />
                              ) : (
                                <Icon className="w-5 h-5" />
                              )}
                            </div>

                            {/* Label & Descriptions */}
                            <div className="md:mt-3 flex-1 md:flex-initial">
                              <p
                                className={`text-xs font-bold uppercase tracking-wider ${
                                  isCompleted || isCurrent ? "text-black" : "text-neutral-400"
                                }`}
                              >
                                {step.title}
                              </p>
                              <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                                {step.subtitle}
                              </p>
                              {historyMatch && (
                                <p className="text-[9px] font-mono text-neutral-400 mt-0.5">
                                  {new Date(historyMatch.timestamp).toLocaleDateString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Courier Tracking Number Box (if available) */}
                  {order.trackingNumber && (
                    <div className="bg-neutral-50 border border-neutral-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-black flex-shrink-0" />
                        <div>
                          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
                            Courier Consignment / AWB Tracking
                          </span>
                          <span className="font-mono font-black text-black text-xs sm:text-sm">
                            {order.trackingNumber}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyTracking(order.trackingNumber!)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-neutral-300 hover:border-black text-[11px] font-bold uppercase tracking-wider text-black transition-colors self-start sm:self-auto"
                      >
                        {copiedTracking ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Number</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Order Information Grid (Delivery Address & Items Preview) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shipping Destination */}
                <div className="bg-neutral-50 border border-neutral-200 p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-neutral-900 border-b border-neutral-200 pb-2">
                    <MapPin className="w-4 h-4 text-black flex-shrink-0" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Shipping Address
                    </h4>
                  </div>
                  <div className="text-xs text-neutral-700 space-y-0.5">
                    <p className="font-bold text-black">{order.shippingAddress.fullName}</p>
                    <p className="text-neutral-600">{order.shippingAddress.addressLine}</p>
                    <p className="text-neutral-600">
                      {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
                      {order.shippingAddress.pincode}
                    </p>
                    <p className="text-neutral-500 text-[11px] pt-1">
                      Contact: {order.shippingAddress.mobile}
                    </p>
                  </div>
                </div>

                {/* Payment & Breakdown Summary */}
                <div className="bg-neutral-50 border border-neutral-200 p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-neutral-900 border-b border-neutral-200 pb-2">
                    <ShieldCheck className="w-4 h-4 text-black flex-shrink-0" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Payment Breakdown
                    </h4>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between text-neutral-600">
                      <span>Subtotal ({order.items.length} items):</span>
                      <span className="font-mono">₹{order.subtotal.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Shipping Fee:</span>
                      <span className="font-mono">
                        {order.shippingCharges === 0 ? (
                          <span className="text-emerald-600 font-bold">FREE</span>
                        ) : (
                          `₹${order.shippingCharges}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-black font-black pt-1.5 border-t border-neutral-200">
                      <span>Total Payable (COD):</span>
                      <span className="font-mono text-sm">
                        ₹{order.totalAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items in this Order */}
              <div className="bg-white border border-neutral-200 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-[1.5px] text-neutral-900 flex items-center space-x-2">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Purchased Pieces ({order.items.length})</span>
                </h4>

                <div className="divide-y divide-neutral-100">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-11 h-13 object-cover object-top bg-neutral-100 border border-neutral-200"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-bold text-black uppercase tracking-wide">
                            {item.productName}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            Size: <span className="font-semibold text-neutral-800">{item.size}</span>{" "}
                            | Color: {item.color} | Qty: {item.quantity}
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
            </div>
          )}

          {/* Quick Help & Contact Footer */}
          <div className="bg-neutral-50 border border-neutral-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
            <div className="flex items-center space-x-2">
              <PhoneCall className="w-4 h-4 text-black flex-shrink-0" />
              <span>
                Need immediate delivery update? WhatsApp Support: <strong>+91 9211597397</strong>
              </span>
            </div>
            <a
              href="https://wa.me/919211597397"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-black text-white text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-neutral-100 border-t border-neutral-200 px-5 py-3.5 flex justify-between items-center flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setOrder(null);
              setOrderIdInput("");
              setActiveOrderId("");
              setError(null);
            }}
            className="text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-black transition-colors"
          >
            Track Another Order
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
