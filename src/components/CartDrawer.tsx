import React from "react";
import { X, Trash2, ArrowRight, ShieldCheck, Truck } from "lucide-react";
import { useCart } from "../context/CartContext";

interface CartDrawerProps {
  onNavigateToCheckout: () => void;
  onNavigateToShop: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onNavigateToCheckout,
  onNavigateToShop,
}) => {
  const {
    cart,
    isCartDrawerOpen,
    closeCartDrawer,
    updateQuantity,
    removeFromCart,
    subtotal,
    freeShippingThreshold,
    standardShippingRate,
    shippingCharges,
    progressToFreeShipping,
  } = useCart();

  if (!isCartDrawerOpen) return null;

  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="cart-drawer-overlay">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={closeCartDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#eeeeee] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#eeeeee] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold tracking-[1.5px] uppercase text-black">
                Your Bag
              </h2>
              <span className="text-[10px] bg-black text-white px-2 py-0.5 font-bold">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>
            <button
              onClick={closeCartDrawer}
              className="p-1 text-[#666666] hover:text-black transition-colors"
              aria-label="Close bag"
              id="close-cart-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Free shipping progress bar */}
          <div className="bg-[#f5f5f5] px-6 py-2.5 border-b border-[#eeeeee]">
            <div className="flex items-center space-x-2 text-[11px] font-medium text-black mb-1">
              <Truck className="w-3.5 h-3.5 text-black" />
              {shippingCharges === 0 ? (
                <span className="text-black font-bold uppercase tracking-[0.5px]">
                  FREE Express Shipping Unlocked
                </span>
              ) : (
                <span>
                  Add <strong className="text-black">₹{remainingForFreeShipping.toLocaleString("en-IN")}</strong> more for <strong>FREE Shipping</strong>
                </span>
              )}
            </div>
            <div className="w-full bg-[#eeeeee] h-1 overflow-hidden">
              <div
                className="bg-black h-full transition-all duration-300 ease-out"
                style={{ width: `${progressToFreeShipping}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm font-bold text-black uppercase tracking-[1px] mb-2">
                  Your bag is empty
                </p>
                <p className="text-[11px] text-[#666666] max-w-xs mx-auto mb-6">
                  Explore our latest architectural streetwear drop and discover luxury heavyweight pieces.
                </p>
                <button
                  onClick={() => {
                    closeCartDrawer();
                    onNavigateToShop();
                  }}
                  className="inline-flex items-center px-5 py-2.5 bg-black text-white text-[11px] font-bold uppercase tracking-[1px] hover:bg-[#222222] transition-colors"
                  id="empty-bag-shop-btn"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={`${item.productId}-${item.size}-${item.color}`}
                  className="flex space-x-3.5 border-b border-[#eeeeee] pb-4"
                >
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-18 h-22 object-cover object-top bg-[#f5f5f5] border border-[#eeeeee] flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-[11px] font-bold text-black uppercase tracking-[0.5px] leading-snug line-clamp-2">
                          {item.productName}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.productId, item.size, item.color)}
                          className="text-[#999999] hover:text-black p-1 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[10px] text-[#666666] uppercase tracking-[0.5px] mt-1">
                        Size: <span className="font-bold text-black">{item.size}</span> | Color: <span className="font-bold text-black">{item.color}</span>
                      </div>
                      <div className="text-[11px] font-bold text-black mt-1">
                        ₹{item.discountPrice.toLocaleString("en-IN")}
                        {item.price > item.discountPrice && (
                          <span className="text-[10px] text-[#999999] line-through ml-2">
                            ₹{item.price.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-[#eeeeee] bg-[#f5f5f5]">
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.size, item.color, item.quantity - 1)
                          }
                          className="px-2 py-0.5 text-xs text-black hover:bg-[#e5e5e5]"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-0.5 text-[11px] font-bold text-black">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.size, item.color, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.stockQuantity}
                          className="px-2 py-0.5 text-xs text-black hover:bg-[#e5e5e5] disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[11px] font-bold text-black">
                        ₹{(item.discountPrice * item.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-[#eeeeee] bg-[#f5f5f5] space-y-3.5">
              <div className="space-y-1 text-[11px] text-[#666666]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-black">₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping (Nationwide)</span>
                  <span className="font-bold text-black">
                    {shippingCharges === 0 ? "FREE" : `₹${shippingCharges}`}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-black pt-2 border-t border-[#eeeeee]">
                  <span>Estimated Total</span>
                  <span>
                    ₹{(subtotal + shippingCharges).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[10px] text-[#666666] bg-white p-2 border border-[#eeeeee]">
                <ShieldCheck className="w-3.5 h-3.5 text-black flex-shrink-0" />
                <span>Cash on Delivery (COD) available across India. 7-day hassle-free returns.</span>
              </div>

              <button
                onClick={() => {
                  closeCartDrawer();
                  onNavigateToCheckout();
                }}
                className="w-full py-3 bg-black text-white text-[11px] font-bold uppercase tracking-[1.5px] hover:bg-[#222222] transition-colors flex items-center justify-center space-x-2"
                id="drawer-checkout-btn"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
