import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem, Product } from "../types";

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, size: string, color?: string, quantity?: number) => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  freeShippingThreshold: number;
  standardShippingRate: number;
  shippingCharges: number;
  progressToFreeShipping: number;
  refreshSettings: () => void;
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "prymewear_cart";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(1999);
  const [standardShippingRate, setStandardShippingRate] = useState<number>(99);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        if (typeof data.settings.freeShippingThreshold === "number") {
          setFreeShippingThreshold(data.settings.freeShippingThreshold);
        }
        if (typeof data.settings.standardShippingRate === "number") {
          setStandardShippingRate(data.settings.standardShippingRate);
        }
      }
    } catch (e) {
      console.warn("CartContext settings load failed:", e);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      console.error("Failed to persist cart:", err);
    }
  }, [cart]);

  const addToCart = (product: Product, size: string, color?: string, quantity: number = 1) => {
    const selectedColor = color || (product.colors && product.colors[0]) || "Jet Black";
    const price = product.discountPrice || product.price;

    setCart(prev => {
      const existingIdx = prev.findIndex(
        item => item.productId === product.id && item.size === size && item.color === selectedColor
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = Math.min(product.stockQuantity, updated[existingIdx].quantity + quantity);
        updated[existingIdx].quantity = newQty;
        return updated;
      }

      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        productImage: (product.images && product.images[0]) || "",
        sku: product.sku,
        size,
        color: selectedColor,
        price: product.price,
        discountPrice: price,
        quantity: Math.min(product.stockQuantity, quantity),
        stockQuantity: product.stockQuantity,
      };
      return [...prev, newItem];
    });

    setIsCartDrawerOpen(true);
  };

  const removeFromCart = (productId: string, size: string, color: string) => {
    setCart(prev =>
      prev.filter(item => !(item.productId === productId && item.size === size && item.color === color))
    );
  };

  const updateQuantity = (productId: string, size: string, color: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }
    setCart(prev =>
      prev.map(item => {
        if (item.productId === productId && item.size === size && item.color === color) {
          return { ...item, quantity: Math.min(item.stockQuantity, quantity) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.discountPrice * item.quantity, 0);
  const isFreeShipping = standardShippingRate === 0 || (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold);
  const shippingCharges = isFreeShipping ? 0 : standardShippingRate;
  const progressToFreeShipping = freeShippingThreshold <= 0 ? 100 : Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        freeShippingThreshold,
        standardShippingRate,
        shippingCharges,
        progressToFreeShipping,
        refreshSettings: fetchSettings,
        isCartDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
