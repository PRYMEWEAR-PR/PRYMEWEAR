import React from "react";
import { CheckCircle, Truck, Package, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { Order } from "../types";

interface OrderSuccessPageProps {
  order: Order;
  onNavigateToAccount: () => void;
  onNavigateToShop: () => void;
  onOpenTrackOrder?: (orderId?: string) => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({
  order,
  onNavigateToAccount,
  onNavigateToShop,
  onOpenTrackOrder,
}) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <div className="bg-white border border-gray-200 p-8 sm:p-12 text-center shadow-xl space-y-6">
        {/* Animated Checkmark Circle */}
        <div className="w-16 h-16 bg-black text-white mx-auto rounded-full flex items-center justify-center shadow-lg">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-700 bg-emerald-50 px-3 py-1 border border-emerald-200">
            {order.paymentMethod === "ONLINE" ? "Instant Online Payment Completed" : "Cash On Delivery Order Received"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black font-mono mt-3">
            Thank You, {order.customerName.split(" ")[0]}!
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-2 max-w-md mx-auto">
            {order.paymentMethod === "ONLINE"
              ? "Your payment has been successfully verified. Our team is preparing your package for express dispatch!"
              : "Your order has been recorded. Our administrative team will review and confirm it shortly."}
          </p>
        </div>

        {/* Order Meta Box */}
        <div className="bg-gray-50 border border-gray-200 p-6 text-left space-y-3">
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold">Order Identifier</span>
              <p className="text-base font-black text-black font-mono">#{order.id}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 uppercase font-bold">Payment Method</span>
              <p className="text-xs font-black text-emerald-700 uppercase">
                {order.paymentMethod === "ONLINE" ? "Online Payment (Paid ✓)" : "Cash on Delivery (COD)"}
              </p>
            </div>
          </div>

          <div className="text-xs text-gray-700 space-y-1">
            <p>
              <strong>Deliver To:</strong> {order.shippingAddress.fullName}
            </p>
            <p className="text-gray-500">
              {order.shippingAddress.addressLine}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
            </p>
            <p className="text-gray-500">Phone: {order.shippingAddress.mobile}</p>
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-between items-center text-sm font-black text-black">
            <span>{order.paymentMethod === "ONLINE" ? "Total Amount Paid Online:" : "Total Payable upon Doorstep Delivery:"}</span>
            <span className="text-base font-mono text-emerald-700">₹{order.totalAmount.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Ordered items preview */}
        <div className="text-left">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            Items in this order ({order.items.length})
          </h3>
          <div className="divide-y divide-gray-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-10 h-12 object-cover object-top bg-gray-100"
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

        {/* Email note */}
        <div className="flex items-center space-x-2 text-xs text-gray-600 bg-gray-50 p-3 border border-gray-200 text-left">
          <Mail className="w-4 h-4 text-black flex-shrink-0" />
          <span>
            An Order Confirmation email will be automatically sent to <strong>{order.customerEmail}</strong> as soon as an admin approves the order.
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {onOpenTrackOrder && (
            <button
              onClick={() => onOpenTrackOrder(order.id)}
              className="flex-1 py-3.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2 border border-black shadow-md"
              id="success-track-live-order-btn"
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Track Live Firestore Status</span>
            </button>
          )}
          <button
            onClick={onNavigateToAccount}
            className="flex-1 py-3.5 bg-neutral-100 text-black text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors flex items-center justify-center space-x-2 border border-neutral-300"
          >
            <Package className="w-4 h-4" />
            <span>My Account Orders</span>
          </button>
          <button
            onClick={onNavigateToShop}
            className="flex-1 py-3.5 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-neutral-50 transition-colors flex items-center justify-center space-x-2 border border-neutral-300"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
