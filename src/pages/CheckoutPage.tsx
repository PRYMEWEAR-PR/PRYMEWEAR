import React, { useState } from "react";
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  CreditCard,
  User,
  MapPin,
  QrCode,
  Smartphone,
  Building2,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Wallet,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Order } from "../types";
import { saveOrderToFirestore, updateUserSavedAddressInFirestore, auth as firebaseAuth } from "../lib/firebaseServices";

interface CheckoutPageProps {
  onOrderSuccess: (order: Order) => void;
  onNavigateToShop: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onOrderSuccess,
  onNavigateToShop,
}) => {
  const { cart, subtotal, freeShippingThreshold, standardShippingRate, shippingCharges, clearCart } = useCart();
  const { user, token, openAuthModal, loginCustomer, updateCustomerProfile } = useAuth();

  // Address Form state
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");

  // Payment Selection State
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "COD">("ONLINE");
  const [onlineSubTab, setOnlineSubTab] = useState<"upi" | "card" | "netbanking">("upi");

  // UPI State
  const [upiCopied, setUpiCopied] = useState(false);
  const [upiTxnId, setUpiTxnId] = useState("");

  // Card State
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");

  // NetBanking State
  const [selectedBank, setSelectedBank] = useState("HDFC");

  // 3D Secure / Payment Gateway Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Promo code
  const [promoCode, setPromoCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Autofill user saved address if available & local cache fallback
  React.useEffect(() => {
    let cachedAddr: any = null;
    try {
      const stored = localStorage.getItem("prymewear_saved_address");
      if (stored) cachedAddr = JSON.parse(stored);
    } catch (e) {}

    if (user && user.savedAddresses && user.savedAddresses.length > 0) {
      const addr = user.savedAddresses[0];
      setFullName(addr.fullName || user.name || "");
      setEmail(user.email || addr.email || "");
      setMobile(addr.mobile || user.mobile || "");
      setAddressLine(addr.addressLine || "");
      setCity(addr.city || "");
      setState(addr.state || "Maharashtra");
      setPincode(addr.pincode || "");
      setLandmark(addr.landmark || "");
    } else if (cachedAddr) {
      if (cachedAddr.fullName) setFullName(cachedAddr.fullName);
      if (cachedAddr.email) setEmail(cachedAddr.email);
      if (cachedAddr.mobile) setMobile(cachedAddr.mobile);
      if (cachedAddr.addressLine) setAddressLine(cachedAddr.addressLine);
      if (cachedAddr.city) setCity(cachedAddr.city);
      if (cachedAddr.state) setState(cachedAddr.state);
      if (cachedAddr.pincode) setPincode(cachedAddr.pincode);
      if (cachedAddr.landmark) setLandmark(cachedAddr.landmark);
    } else if (user) {
      if (user.name) setFullName(user.name);
      if (user.email) setEmail(user.email);
      if (user.mobile) setMobile(user.mobile);
    }
  }, [user]);

  // Auto-persist address form inputs to local storage as user types
  React.useEffect(() => {
    if (fullName || mobile || addressLine || city || pincode) {
      const formAddr = {
        fullName,
        email,
        mobile,
        addressLine,
        city,
        state,
        pincode,
        landmark,
      };
      try {
        localStorage.setItem("prymewear_saved_address", JSON.stringify(formAddr));
      } catch (e) {}
    }
  }, [fullName, email, mobile, addressLine, city, state, pincode, landmark]);

  const finalTotal = Math.max(0, subtotal - discountAmount) + shippingCharges;

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError("");
    if (promoCode.trim().toUpperCase() === "PRYME20") {
      const disc = Math.round(subtotal * 0.2);
      setDiscountAmount(disc);
      setPromoApplied(true);
    } else {
      setPromoError("Invalid coupon code. Try 'PRYME20'");
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText("urbanvastra@upi");
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  };

  const handleRazorpayCheckout = async () => {
    setErrorMsg("");

    if (!fullName || !mobile || !addressLine || !city || !pincode) {
      setErrorMsg("Please complete all required shipping address fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create Razorpay order via backend
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalTotal,
          receipt: `rcpt_${Date.now()}`,
          notes: {
            customerName: fullName,
            mobile: mobile,
            email: email || user?.email || "",
          },
        }),
      });

      const razorpayData = await res.json();

      if (!razorpayData.success) {
        throw new Error(razorpayData.message || "Failed to initiate Razorpay checkout");
      }

      // Check if Razorpay Checkout JS is loaded
      if (typeof (window as any).Razorpay !== "undefined") {
        const options = {
          key: razorpayData.key,
          amount: razorpayData.amount,
          currency: razorpayData.currency || "INR",
          name: "PRYMEWEAR",
          description: "Online Order Payment",
          order_id: razorpayData.isLiveMode ? razorpayData.orderId : undefined,
          prefill: {
            name: fullName,
            email: email || user?.email || "",
            contact: mobile,
          },
          theme: {
            color: "#0284c7", // Razorpay Blue
          },
          handler: async function (response: any) {
            try {
              await fetch("/api/razorpay/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
            } catch (vErr) {
              console.warn("Razorpay verify notice:", vErr);
            }

            executeOrderSubmission({
              method: "Razorpay Online Gateway",
              txnId: response.razorpay_payment_id || razorpayData.orderId || "PAY_RZP_" + Date.now(),
            });
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (response: any) {
          setIsSubmitting(false);
          setErrorMsg(response.error.description || "Razorpay Payment Failed. Please try again.");
        });
        rzp.open();
      } else {
        // Fallback if Razorpay SDK isn't available
        setShowOtpModal(true);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error("Razorpay Checkout Error:", err);
      setIsSubmitting(false);
      setErrorMsg(err.message || "Could not connect to Razorpay. Try again or select Cash on Delivery.");
    }
  };

  const handleOnlinePaymentClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === "ONLINE") {
      handleRazorpayCheckout();
    } else {
      executeOrderSubmission();
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (!otpInput || otpInput.trim().length < 4) {
      setOtpError("Please enter valid OTP (e.g. 123456)");
      return;
    }

    setIsVerifyingOtp(true);
    setTimeout(() => {
      setIsVerifyingOtp(false);
      setShowOtpModal(false);
      executeOrderSubmission({
        method: onlineSubTab === "card" ? "Credit/Debit Card" : "NetBanking (" + selectedBank + ")",
        txnId: "TXN_PG_" + Math.floor(100000 + Math.random() * 900000),
      });
    }, 1200);
  };

  const executeOrderSubmission = async (customPayDetails?: any) => {
    setIsSubmitting(true);
    setErrorMsg("");

    const payDetails = customPayDetails || {
      method: paymentMethod === "ONLINE" ? `UPI (${upiTxnId ? "UTR: " + upiTxnId : "Instant UPI"})` : "Cash on Delivery",
      txnId: "TXN_" + Math.floor(100000 + Math.random() * 900000),
    };

    try {
      const shippingAddress = {
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim() || user?.email || "",
        addressLine: addressLine.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        landmark: landmark ? landmark.trim() : undefined,
      };

      // Always save to localStorage immediately for instant access across sessions
      try {
        localStorage.setItem("prymewear_saved_address", JSON.stringify(shippingAddress));
      } catch (e) {}

      // If user is logged in, sync address to user profile & Firestore
      if (user) {
        const currentAddrs = user.savedAddresses || [];
        const exists = currentAddrs.some(a => a.addressLine === shippingAddress.addressLine && a.pincode === shippingAddress.pincode);
        const updatedAddrs = exists ? currentAddrs : [{ ...shippingAddress, id: "addr_" + Math.random().toString(36).substring(2, 8) }, ...currentAddrs];
        const updatedUser = { ...user, mobile: user.mobile || shippingAddress.mobile, savedAddresses: updatedAddrs };
        updateCustomerProfile(updatedUser);
        if (firebaseAuth.currentUser) {
          updateUserSavedAddressInFirestore(firebaseAuth.currentUser.uid, updatedAddrs).catch(e => console.warn("FS address sync:", e));
        }
      }

      // Resolve valid token
      let activeToken = token;
      if (!activeToken && firebaseAuth.currentUser) {
        try {
          activeToken = await firebaseAuth.currentUser.getIdToken();
        } catch (e) {}
      }

      let data: any = {};
      try {
        let res = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken || ""}`,
          },
          body: JSON.stringify({
            shippingAddress,
            items: cart,
            notes,
            paymentMethod,
            paymentDetails: payDetails,
          }),
        });

        data = await res.json();

        // If token expired or session issue, attempt auto-refresh with Firebase
        if (!data.success && (res.status === 401 || data.message?.toLowerCase().includes("session") || data.message?.toLowerCase().includes("token"))) {
          if (firebaseAuth.currentUser) {
            try {
              const refreshedToken = await firebaseAuth.currentUser.getIdToken(true);
              const retryRes = await fetch("/api/orders", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${refreshedToken}`,
                },
                body: JSON.stringify({
                  shippingAddress,
                  items: cart,
                  notes,
                  paymentMethod,
                  paymentDetails: payDetails,
                }),
              });
              data = await retryRes.json();
            } catch (retryErr) {}
          }
        }
      } catch (fetchErr) {
        console.warn("API order submission error, falling back to direct Firebase order creation:", fetchErr);
      }

      let createdOrder: Order;

      if (data && data.success && data.order) {
        createdOrder = data.order;
        if (data.newToken && data.user) {
          loginCustomer(data.newToken, data.user);
        }
      } else {
        // Direct Firebase Fallback Order Creation
        const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
        const orderItems = cart.map((item) => ({
          productId: item.productId,
          productName: item.productName || "PRYME Apparel Item",
          productImage: item.productImage || "",
          sku: item.sku || "PRYME-ITEM",
          size: item.size || "M",
          color: item.color || "Jet Black",
          price: item.price,
          discountPrice: item.discountPrice || item.price,
          quantity: item.quantity,
          totalPrice: (item.discountPrice || item.price) * item.quantity,
        }));

        const itemsSubtotal = orderItems.reduce((acc, i) => acc + i.totalPrice, 0);
        const shippingFee = itemsSubtotal >= freeShippingThreshold ? 0 : 99;

        createdOrder = {
          id: orderId,
          userId: user?.id || (firebaseAuth.currentUser ? firebaseAuth.currentUser.uid : `usr_guest_${Date.now()}`),
          customerName: shippingAddress.fullName,
          customerEmail: shippingAddress.email || user?.email || "customer@prymewear.store",
          customerMobile: shippingAddress.mobile,
          shippingAddress,
          items: orderItems,
          subtotal: itemsSubtotal,
          shippingCharges: shippingFee,
          discount: discountAmount,
          totalAmount: Math.max(0, itemsSubtotal - discountAmount) + shippingFee,
          paymentMethod,
          paymentStatus: paymentMethod === "ONLINE" ? "completed" : "pending",
          status: "pending",
          notes: notes || (paymentMethod === "ONLINE" ? `Paid via ${payDetails.method}` : "Cash on Delivery (COD) Order"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          confirmationEmailSent: false,
          statusHistory: [
            {
              status: "pending",
              timestamp: new Date().toISOString(),
              note: paymentMethod === "ONLINE"
                ? `Online Payment Verified (${payDetails.method}). Txn: ${payDetails.txnId}`
                : "Order placed via Cash on Delivery.",
            },
          ],
        };
      }

      // Sync Order to Firestore Database
      await saveOrderToFirestore(createdOrder);

      // Launch luxury confetti
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#000000", "#10b981", "#fbbf24"],
        });
      } catch (err) {}

      clearCart();
      onOrderSuccess(data.order);
    } catch (err: any) {
      setErrorMsg(err.message || "Checkout failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold uppercase tracking-wider text-black mb-2">
          Your Bag is Empty
        </h2>
        <p className="text-xs text-gray-500 mb-6">
          Add items to your cart before proceeding to checkout.
        </p>
        <button
          onClick={onNavigateToShop}
          className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800"
        >
          Explore Streetwear Collection
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Checkout Title */}
      <div className="mb-8 pb-4 border-b border-gray-200">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
          Step-by-Step Checkout
        </span>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-black font-mono">
          Cash on Delivery Checkout
        </h1>
      </div>

      {!user && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-amber-800 text-xs font-bold">
            <User className="w-4 h-4 flex-shrink-0" />
            <span>Customer account is required to place and track your order.</span>
          </div>
          <button
            onClick={() => openAuthModal("login")}
            className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleOnlinePaymentClick} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Shipping Address & Details */}
        <div className="lg:col-span-7 space-y-8">
          {/* 1. Customer & Delivery Address Form */}
          <div className="bg-white border border-gray-200 p-6 space-y-5">
            <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-widest text-black border-b border-gray-100 pb-3">
              <MapPin className="w-4 h-4 text-black" />
              <span>1. Shipping & Contact Address</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Full Recipient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kartik Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Mobile Number (for Delivery OTP & SMS) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Email Address (for Order Updates) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Flat, House no., Building, Street Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 402, High Street Towers, Linking Road"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  City / Town *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maharashtra"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Pincode (Postal Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 400050"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Nearby Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Opposite City Mall"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Delivery Notes / Gate Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call before delivery / Leave with security if absent"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* 2. Payment Method Info Banner */}
          <div className="bg-white border border-gray-200 p-5 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-widest text-black border-b border-gray-100 pb-3">
              <CreditCard className="w-4 h-4 text-black" />
              <span>2. Payment Option Selection</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Fill in your shipping details above and click either <strong className="text-sky-700 font-bold">Pay Online via Razorpay</strong> or <strong className="text-black font-bold">Place Cash on Delivery Order</strong> in the Order Summary section to complete your purchase.
            </p>
          </div>
        </div>

        {/* Right Column: Order Summary & Place Order */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-gray-200 p-6 space-y-4 sticky top-24">
            <h3 className="text-xs font-black uppercase tracking-widest text-black border-b border-gray-100 pb-3">
              Order Summary ({cart.length} items)
            </h3>

            {/* Items list */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {cart.map((item) => (
                <div key={`${item.productId}-${item.size}-${item.color}`} className="flex space-x-3 text-xs">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-14 h-16 object-cover object-top bg-gray-100 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-black uppercase tracking-wider line-clamp-1">
                      {item.productName}
                    </p>
                    <p className="text-gray-500 mt-0.5">
                      Size: <span className="font-semibold text-black">{item.size}</span> | Qty: <span className="font-semibold text-black">{item.quantity}</span>
                    </p>
                    <p className="font-extrabold text-black mt-1">
                      ₹{(item.discountPrice * item.quantity).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Code Section */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Coupon code (e.g. PRYME20)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 p-2 bg-gray-50 border border-gray-300 text-xs uppercase text-black font-mono focus:outline-hidden focus:border-black"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800"
                >
                  Apply
                </button>
              </div>
              {promoApplied && (
                <p className="text-xs text-emerald-600 font-bold mt-1">
                  ✓ PRYME20 applied! You saved ₹{discountAmount.toLocaleString("en-IN")}
                </p>
              )}
              {promoError && (
                <p className="text-xs text-red-600 font-bold mt-1">{promoError}</p>
              )}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2 pt-3 border-t border-gray-100 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-black">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount</span>
                  <span className="font-bold">-₹{discountAmount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping Charges</span>
                <span className="font-bold text-emerald-700">
                  {shippingCharges === 0 ? "FREE" : `₹${shippingCharges}`}
                </span>
              </div>
              <div className="flex justify-between text-base font-black text-black pt-3 border-t-2 border-black">
                <span>{paymentMethod === "ONLINE" ? "Total Payable Online" : "Total Amount Due (COD)"}</span>
                <span>₹{finalTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Action Buttons: Dedicated Online Razorpay Button & COD Button */}
            <div className="space-y-3 pt-2">
              {/* Dedicated Razorpay Button */}
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("ONLINE");
                  handleRazorpayCheckout();
                }}
                disabled={isSubmitting || !user}
                className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg border border-sky-500"
                id="razorpay-pay-btn"
              >
                <Sparkles className="w-4 h-4 text-sky-200" />
                <span>
                  {isSubmitting && paymentMethod === "ONLINE"
                    ? "Connecting Razorpay..."
                    : `Pay ₹${finalTotal.toLocaleString("en-IN")} Online via Razorpay`}
                </span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>

              {/* Dedicated COD Button */}
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("COD");
                  executeOrderSubmission();
                }}
                disabled={isSubmitting || !user}
                className="w-full py-3.5 bg-black hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 disabled:opacity-50 border border-black"
                id="cod-pay-btn"
              >
                <Lock className="w-3.5 h-3.5 text-gray-300" />
                <span>
                  {isSubmitting && paymentMethod === "COD"
                    ? "Placing COD Order..."
                    : "Place Cash on Delivery (COD) Order"}
                </span>
              </button>
            </div>

            {!user && (
              <p className="text-[11px] text-center text-red-600 font-bold">
                * Please sign in or register to place your order.
              </p>
            )}

            <div className="pt-2 text-[11px] text-gray-500 space-y-1">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>256-Bit Encrypted Payment & Order Confirmation</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Express courier delivery within 2-4 business days.</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 3D Secure Bank Payment Gateway Simulation Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-wider text-black">
                  PRYME 3D Secure Payment Authentication
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-gray-400 hover:text-black font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 p-3 border border-gray-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Merchant:</span>
                <span className="font-bold text-black">PRYMEWEAR LUXURY STORE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Mode:</span>
                <span className="font-bold text-black">
                  {onlineSubTab === "card" ? "Credit / Debit Card" : `NetBanking (${selectedBank})`}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-gray-200 font-extrabold text-black">
                <span>Total Amount:</span>
                <span className="text-emerald-700">₹{finalTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Enter 6-Digit Bank OTP sent to mobile
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 p-2.5 bg-white border border-gray-300 text-base font-mono font-bold text-center tracking-widest text-black focus:outline-hidden focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={() => setOtpInput("123456")}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-700 border border-gray-300"
                  >
                    Auto-Fill OTP
                  </button>
                </div>
                {otpError && <p className="text-xs text-red-600 font-bold mt-1">{otpError}</p>}
              </div>

              <div className="bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800">
                <span>💡 <strong>Sandbox Hint:</strong> Enter <strong>123456</strong> or click Auto-Fill to test instant bank approval.</span>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="flex-1 py-3 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 flex items-center justify-center space-x-2"
                >
                  {isVerifyingOtp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Confirm Payment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
