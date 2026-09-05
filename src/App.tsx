import React, { useState, useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { CartDrawer } from "./components/CartDrawer";
import { AuthModal } from "./components/AuthModal";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrderSuccessPage } from "./pages/OrderSuccessPage";
import { AccountPage } from "./pages/AccountPage";
import { PolicyPage } from "./pages/PolicyPage";
import { ContactPage } from "./pages/ContactPage";
import { AdminPage } from "./pages/AdminPage";
import { TrackOrderModal } from "./components/TrackOrderModal";
import { Product, Category, Review, StoreSettings, Order } from "./types";

export function AppContent() {
  const [currentView, setCurrentView] = useState<string>("home");
  const [viewParam, setViewParam] = useState<string | undefined>(undefined);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [trackOrderId, setTrackOrderId] = useState<string>("");

  // Global Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGlobalData = async () => {
    try {
      const [prodRes, catRes, revRes, setRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/reviews"),
        fetch("/api/settings"),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.success) setProducts(prodData.products || []);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.success) setCategories(catData.categories || []);
      }
      if (revRes.ok) {
        const revData = await revRes.json();
        if (revData.success) setReviews(revData.reviews || []);
      }
      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData.success) setSettings(setData.settings || null);
      }
    } catch (err) {
      console.error("Failed to load store data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();

    // Support window hash routing (e.g. #/admin)
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "").replace("/", "");
      if (hash === "admin") {
        setCurrentView("admin");
      } else if (hash.startsWith("product/")) {
        const pId = hash.split("/")[1];
        setSelectedProductId(pId);
        setCurrentView("product");
      } else if (hash.startsWith("shop")) {
        setCurrentView("shop");
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handleNavigate = (view: string, param?: string) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentView(view);
    setViewParam(param);
    if (view === "admin") {
      window.location.hash = "/admin";
    } else {
      window.location.hash = "";
    }
  };

  const handleSelectProduct = (productId: string) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setSelectedProductId(productId);
    setCurrentView("product");
  };

  const handleOrderSuccess = (order: Order) => {
    setLastPlacedOrder(order);
    setCurrentView("order-success");
    fetchGlobalData();
  };

  const handleOpenTrackOrder = (orderId?: string) => {
    setTrackOrderId(orderId || "");
    setIsTrackOrderOpen(true);
  };

  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const activeProductReviews = reviews.filter((r) => r.productId === selectedProductId);

  // If in Admin panel, render dedicated admin layout without store header/footer
  if (currentView === "admin") {
    return <AdminPage onNavigateToStore={() => handleNavigate("home")} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Top Header */}
      <Header
        settings={settings}
        categories={categories}
        onNavigate={handleNavigate}
        onSelectProduct={handleSelectProduct}
        onOpenAdmin={() => handleNavigate("admin")}
        onOpenTrackOrder={handleOpenTrackOrder}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {loading ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center space-y-3">
              <span className="text-2xl font-black tracking-[0.25em] uppercase text-black font-mono animate-pulse">
                PRYMEWEAR
              </span>
              <p className="text-xs uppercase tracking-widest text-neutral-400 font-bold">
                Loading Engineered Streetwear...
              </p>
            </div>
          </div>
        ) : (
          <>
            {currentView === "home" && (
              <HomePage
                products={products}
                categories={categories}
                reviews={reviews}
                onSelectProduct={handleSelectProduct}
                onNavigate={handleNavigate}
              />
            )}

            {currentView === "shop" && (
              <ShopPage
                products={products}
                categories={categories}
                initialCategory={viewParam || "all"}
                onSelectProduct={handleSelectProduct}
              />
            )}

            {currentView === "product" && activeProduct && (
              <ProductDetailPage
                product={activeProduct}
                reviews={activeProductReviews}
                onBack={() => handleNavigate("shop")}
                onNavigateToCheckout={() => handleNavigate("checkout")}
                onRefreshProduct={fetchGlobalData}
              />
            )}

            {currentView === "checkout" && (
              <CheckoutPage
                onOrderSuccess={handleOrderSuccess}
                onNavigateToShop={() => handleNavigate("shop")}
              />
            )}

            {currentView === "order-success" && lastPlacedOrder && (
              <OrderSuccessPage
                order={lastPlacedOrder}
                onNavigateToAccount={() => handleNavigate("account", "orders")}
                onNavigateToShop={() => handleNavigate("shop")}
                onOpenTrackOrder={handleOpenTrackOrder}
              />
            )}

            {currentView === "account" && (
              <AccountPage
                initialTab={viewParam || "orders"}
                onNavigateToShop={() => handleNavigate("shop")}
                onOpenTrackOrder={handleOpenTrackOrder}
              />
            )}

            {currentView === "policy" && (
              <PolicyPage
                policyKey={(viewParam as any) || "shipping"}
                onNavigateToShop={() => handleNavigate("shop")}
              />
            )}

            {currentView === "contact" && <ContactPage settings={settings} />}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer
        settings={settings}
        onNavigate={handleNavigate}
        onNavigatePolicy={(key) => handleNavigate("policy", key)}
        onOpenTrackOrder={handleOpenTrackOrder}
      />

      {/* Global Slide-over Cart Drawer */}
      <CartDrawer onNavigateToCheckout={() => handleNavigate("checkout")} />

      {/* Customer Login / Register Modal */}
      <AuthModal />

      {/* Real-Time Track Order Modal */}
      <TrackOrderModal
        isOpen={isTrackOrderOpen}
        onClose={() => setIsTrackOrderOpen(false)}
        initialOrderId={trackOrderId}
        onNavigateToShop={() => {
          setIsTrackOrderOpen(false);
          handleNavigate("shop");
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
