import React from "react";
import { CheckCircle2, Clock, Package, Truck, CheckCheck, XCircle } from "lucide-react";
import { OrderStatusHistoryItem } from "../types";

interface OrderTimelineProps {
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  statusHistory?: OrderStatusHistoryItem[];
  estimatedDelivery?: string;
  trackingNumber?: string;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  status,
  statusHistory = [],
  estimatedDelivery,
  trackingNumber,
}) => {
  if (status === "cancelled") {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-xs">
        <div className="flex items-center space-x-3 text-red-700">
          <XCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider">Order Cancelled</h4>
            <p className="text-xs text-red-600 mt-0.5">
              This order has been cancelled. For queries, please contact PRYMEWEAR support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { key: "pending", label: "Order Placed", icon: Clock, desc: "Cash on delivery order received" },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle2, desc: "Verified & confirmed by Admin" },
    { key: "processing", label: "Packing", icon: Package, desc: "Quality-checked & boxed" },
    { key: "shipped", label: "Dispatched", icon: Truck, desc: "Handed over to Express Courier" },
    { key: "delivered", label: "Delivered", icon: CheckCheck, desc: "Payment received & signed" },
  ];

  const statusOrder = ["pending", "confirmed", "processing", "shipped", "delivered"];
  const currentIndex = statusOrder.indexOf(status);

  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-100 gap-2">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
            Live Order Status
          </span>
          <h3 className="text-base font-black uppercase tracking-wider text-black mt-0.5">
            {status.toUpperCase()}
          </h3>
        </div>
        {estimatedDelivery && (
          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
              Estimated Delivery
            </span>
            <p className="text-xs font-bold text-emerald-700">{estimatedDelivery}</p>
          </div>
        )}
      </div>

      {/* Progress Step Bar */}
      <div className="pt-8 pb-4">
        <div className="relative">
          {/* Background Connecting Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 hidden md:block" />
          
          {/* Active Connecting Line */}
          <div
            className="absolute top-1/2 left-0 h-1 bg-black -translate-y-1/2 transition-all duration-500 hidden md:block"
            style={{
              width: `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%`,
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx <= currentIndex;
              const isCurrent = idx === currentIndex;

              // Find timestamp from history
              const historyItem = statusHistory.find(
                (h) => h.status.toLowerCase() === step.key.toLowerCase()
              );

              return (
                <div key={step.key} className="flex md:flex-col items-center md:text-center space-x-3 md:space-x-0">
                  {/* Step Icon Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isDone
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-400 border-gray-300"
                    } ${isCurrent ? "ring-4 ring-black/10 scale-110" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Step Label */}
                  <div className="md:mt-3 flex-1 md:flex-initial">
                    <p
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isDone ? "text-black" : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] text-gray-500 hidden md:block mt-0.5">
                      {step.desc}
                    </p>
                    {historyItem && (
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {new Date(historyItem.timestamp).toLocaleDateString("en-IN", {
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
      </div>

      {trackingNumber && (
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500">Tracking Number:</span>
          <span className="font-mono font-bold text-black bg-gray-100 px-2 py-1">
            {trackingNumber}
          </span>
        </div>
      )}
    </div>
  );
};
