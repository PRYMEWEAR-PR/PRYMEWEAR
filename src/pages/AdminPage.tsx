import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Star,
  Settings,
  Mail,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  LogOut,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Printer,
  Sparkles,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  Truck,
  Upload,
  Camera,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { Product, Order, Customer, Review, StoreSettings, Category } from "../types";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { 
  saveProductToFirestore, 
  deleteProductFromFirestore, 
  saveOrderToFirestore,
  getFirestoreOrders,
  saveSettingsToFirestore 
} from "../lib/firebaseServices";

interface AdminPageProps {
  onNavigateToStore: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigateToStore }) => {
  const { adminToken, admin, loginAdmin, logoutAdmin } = useAuth();
  const { refreshSettings } = useCart();

  // Admin login credentials state (empty by default)
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin navigation tab
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "products" | "orders" | "customers" | "reviews" | "emails" | "settings"
  >("dashboard");

  // Admin Data states
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals & form states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewInvoiceOrder, setViewInvoiceOrder] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState("");
  const [orderStatusUpdating, setOrderStatusUpdating] = useState(false);

  // Product Form fields
  const [pName, setPName] = useState("");
  const [pDescription, setPDescription] = useState("");
  const [pCategory, setPCategory] = useState("Hoodies");
  const [pPrice, setPPrice] = useState<number>(3499);
  const [pDiscountPrice, setPDiscountPrice] = useState<number>(2499);
  const [pStockQuantity, setPStockQuantity] = useState<number>(25);
  const [pSku, setPSku] = useState("");
  const [pAvailableSizes, setPAvailableSizes] = useState<string[]>(["S", "M", "L", "XL", "XXL"]);
  const [pColors, setPColors] = useState<string>("Jet Black, Charcoal Grey, Bone White");
  const [pImages, setPImages] = useState<string>("");
  const [pIsFeatured, setPIsFeatured] = useState(true);
  const [pIsNewArrival, setPIsNewArrival] = useState(true);
  const [pIsBestSeller, setPIsBestSeller] = useState(false);

  // Photo Upload States
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showUrlTextarea, setShowUrlTextarea] = useState(false);

  // Compress high-res phone photos to fast Web-friendly Data URLs
  const compressImageFile = (file: File, maxWidth = 1200, quality = 0.82): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            resolve(dataUrl);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const compressedDataUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          const compressed = await compressImageFile(file, 1200, 0.82);
          compressedDataUrls.push(compressed);
        }
      }

      if (compressedDataUrls.length > 0) {
        const existingList = pImages
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const newList = [...existingList, ...compressedDataUrls];
        setPImages(newList.join("\n"));
      }
    } catch (err) {
      console.error("Error processing product photo:", err);
      alert("Photo upload me error aaya. Kripya phir se try karein.");
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveImageIndex = (indexToRemove: number) => {
    const currentList = pImages
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const updatedList = currentList.filter((_, idx) => idx !== indexToRemove);
    setPImages(updatedList.join("\n"));
  };

  // Order update tracking modal fields
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Admin verification failed");
      }
      loginAdmin(data.token, data.admin);
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchAdminData = async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const safeFetchJson = async (url: string) => {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) {
            console.warn(`[Admin] ${url} responded with status: ${res.status}`);
            return null;
          }
          const contentType = res.headers.get("content-type");
          if (contentType && !contentType.includes("application/json")) {
            console.warn(`[Admin] ${url} returned non-JSON content-type: ${contentType}`);
            return null;
          }
          return await res.json();
        } catch (e) {
          console.warn(`[Admin] Fetch error for ${url}:`, e);
          return null;
        }
      };

      const [stats, prods, ords, custs, revs, ems, settings] = await Promise.all([
        safeFetchJson("/api/admin/dashboard"),
        safeFetchJson("/api/admin/products"),
        safeFetchJson("/api/admin/orders"),
        safeFetchJson("/api/admin/customers"),
        safeFetchJson("/api/admin/reviews"),
        safeFetchJson("/api/admin/emails"),
        safeFetchJson("/api/admin/settings"),
      ]);

      if (stats?.success) setDashboardStats(stats.stats);
      if (prods?.success) setProducts(prods.products || []);
      if (ords?.success) setOrders(ords.orders || []);
      if (custs?.success) setCustomers(custs.customers || []);
      if (revs?.success) setReviews(revs.reviews || []);
      if (ems?.success) setEmails(ems.emails || []);
      if (settings?.success) setStoreSettings(settings.settings || null);
    } catch (err) {
      console.error("Admin data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [adminToken]);

  // Open product edit modal
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPDescription(prod.description);
    setPCategory(prod.category);
    setPPrice(prod.price);
    setPDiscountPrice(prod.discountPrice || prod.price);
    setPStockQuantity(prod.stockQuantity);
    setPSku(prod.sku);
    setPAvailableSizes(prod.availableSizes);
    setPColors(prod.colors.join(", "));
    setPImages(prod.images.join("\n"));
    setPIsFeatured(prod.isFeatured);
    setPIsNewArrival(prod.isNewArrival);
    setPIsBestSeller(prod.isBestSeller);
    setShowProductModal(true);
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setPName("");
    setPDescription("");
    setPCategory("Hoodies");
    setPPrice(3499);
    setPDiscountPrice(2499);
    setPStockQuantity(30);
    setPSku("PRYME-" + Math.floor(100 + Math.random() * 900));
    setPAvailableSizes(["S", "M", "L", "XL", "XXL"]);
    setPColors("Jet Black, Vintage Washed Grey, Snow White");
    setPImages("https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80\nhttps://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&auto=format&fit=crop&q=80");
    setPIsFeatured(true);
    setPIsNewArrival(true);
    setPIsBestSeller(false);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    const imagesArray = pImages
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const colorsArray = pColors
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const productPayload = {
      name: pName,
      description: pDescription,
      category: pCategory,
      price: Number(pPrice),
      discountPrice: Number(pDiscountPrice),
      stockQuantity: Number(pStockQuantity),
      sku: pSku,
      availableSizes: pAvailableSizes,
      colors: colorsArray,
      images: imagesArray.length > 0 ? imagesArray : ["https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80"],
      isFeatured: pIsFeatured,
      isNewArrival: pIsNewArrival,
      isBestSeller: pIsBestSeller,
    };

    try {
      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : "/api/admin/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(productPayload),
      });

      const data = await res.json();
      if (data.success) {
        // Sync to Firestore
        if (data.product) {
          saveProductToFirestore(data.product).catch((e) => console.warn("Firestore product sync:", e));
        }
        setShowProductModal(false);
        fetchAdminData();
      } else {
        alert(data.message || "Failed to save product");
      }
    } catch (err: any) {
      alert(err.message || "Error saving product");
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm("Are you sure you want to delete this garment from catalog?")) return;
    try {
      const res = await fetch(`/api/admin/products/${prodId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success) {
        deleteProductFromFirestore(prodId).catch((e) => console.warn("Firestore delete sync:", e));
        fetchAdminData();
      }
    } catch (err) {}
  };

  // Order status update (e.g. Confirm order, dispatch order)
  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: string,
    trackNum?: string,
    estDeliv?: string
  ) => {
    if (!adminToken) return;
    setOrderStatusUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: newStatus,
          trackingNumber: trackNum || undefined,
          estimatedDelivery: estDeliv || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.order) {
          saveOrderToFirestore(data.order).catch((e) => console.warn("Firestore order update sync:", e));
        }
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.order);
        }
        fetchAdminData();
      } else {
        alert(data.message || "Failed to update order status");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrderStatusUpdating(false);
    }
  };

  const handleUpdateStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !storeSettings) return;
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(storeSettings),
      });
      const data = await res.json();
      if (data.success) {
        saveSettingsToFirestore(storeSettings).catch((e) => console.warn("Firestore settings sync:", e));
        refreshSettings();
        alert("Store settings and shipping rates updated successfully!");
        fetchAdminData();
      }
    } catch (err) {}
  };

  const handleDeleteReview = async (revId: string) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      const res = await fetch(`/api/admin/reviews/${revId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success) fetchAdminData();
    } catch (err) {}
  };

  const handleToggleFeatureReview = async (rev: Review) => {
    try {
      const res = await fetch(`/api/admin/reviews/${rev.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ isFeatured: !rev.isFeatured }),
      });
      const data = await res.json();
      if (data.success) fetchAdminData();
    } catch (err) {}
  };

  // If not logged in as Admin, show high-security Admin Gate Login
  if (!adminToken || !admin) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="text-2xl font-black tracking-[0.25em] uppercase text-white font-mono block">
              PRYMEWEAR
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 bg-neutral-800 px-3 py-1 border border-neutral-700 inline-block">
              COMMAND & CONTROL ADMIN ACCESS
            </span>
          </div>

          {loginError && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-400 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Enter admin email"
                autoComplete="off"
                className="w-full p-2.5 bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-hidden focus:border-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Security Password
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                autoComplete="new-password"
                className="w-full p-2.5 bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-hidden focus:border-white font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors disabled:opacity-50 mt-2 font-mono cursor-pointer"
            >
              {isLoggingIn ? "Verifying Credentials..." : "Authenticate Admin Access →"}
            </button>
          </form>

          <div className="pt-4 border-t border-neutral-800 flex justify-between items-center text-xs text-neutral-500">
            <button
              onClick={onNavigateToStore}
              className="hover:text-white transition-colors"
            >
              ← Return to Public Store
            </button>
            <span className="font-mono text-[10px]">AUTH_MODE: COD_JWT</span>
          </div>
        </div>
      </div>
    );
  }

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "all") return true;
    return o.status.toLowerCase() === orderFilter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col font-sans">
      {/* Top Admin Bar */}
      <header className="bg-black border-b border-neutral-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          <span className="text-lg font-black tracking-[0.2em] uppercase text-white font-mono">
            PRYME<span className="text-neutral-500">ADMIN</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 border border-neutral-700">
            FIREBASE FIRESTORE CONNECTED
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onNavigateToStore}
            className="px-3 py-1.5 bg-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-700 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Store</span>
          </button>
          <button
            onClick={fetchAdminData}
            className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={logoutAdmin}
            className="px-3 py-1.5 bg-red-950 text-red-300 border border-red-800 hover:bg-red-900 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-60 bg-neutral-950 border-r border-neutral-800 p-4 space-y-1 flex-shrink-0">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "dashboard"
                ? "bg-white text-black"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "orders"
                ? "bg-white text-black"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <div className="flex items-center space-x-3">
              <ShoppingBag className="w-4 h-4" />
              <span>Orders</span>
            </div>
            {dashboardStats?.pendingOrders > 0 && (
              <span className="text-[10px] bg-amber-500 text-black font-extrabold px-1.5 py-0.2">
                {dashboardStats.pendingOrders}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "products"
                ? "bg-white text-black"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Garment Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "customers"
                ? "bg-white text-black"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customers</span>
          </button>

          <button
            onClick={() => setActiveTab("reviews")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "reviews"
                ? "bg-white text-black"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Reviews</span>
          </button>

          <button
            onClick={() => setActiveTab("emails")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "emails"
                ? "bg-white text-black"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Outbox ({emails.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "settings"
                ? "bg-white text-black"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Store Settings</span>
          </button>
        </aside>

        {/* Dynamic Content Panel */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {/* 1. DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
                    Overview Analytics
                  </span>
                  <h1 className="text-2xl font-black uppercase tracking-wider text-white font-mono">
                    Administrative Command Center
                  </h1>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenAddProduct}
                    className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Garment</span>
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="flex justify-between items-center text-neutral-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-black text-white font-mono">
                    ₹{(dashboardStats?.totalRevenue || 0).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-neutral-500">Delivered & Confirmed orders</p>
                </div>

                <div className="p-5 bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="flex justify-between items-center text-neutral-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
                    <ShoppingBag className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-black text-white font-mono">
                    {dashboardStats?.totalOrders || 0}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {dashboardStats?.pendingOrders || 0} pending confirmation
                  </p>
                </div>

                <div className="p-5 bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="flex justify-between items-center text-neutral-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Active Garments</span>
                    <Package className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-black text-white font-mono">
                    {dashboardStats?.totalProducts || 0}
                  </p>
                  <p className="text-[11px] text-amber-400 font-medium">
                    {dashboardStats?.lowStockCount || 0} low inventory warnings
                  </p>
                </div>

                <div className="p-5 bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="flex justify-between items-center text-neutral-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Registered Clients</span>
                    <Users className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-black text-white font-mono">
                    {dashboardStats?.totalCustomers || 0}
                  </p>
                  <p className="text-[11px] text-neutral-500">All authenticated accounts</p>
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="bg-neutral-950 border border-neutral-800 p-6 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Pending Orders Requiring Action
                  </h3>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="text-xs text-neutral-400 hover:text-white uppercase font-bold"
                  >
                    View All Orders →
                  </button>
                </div>

                {orders.filter((o) => o.status === "pending").length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    No pending orders currently. All orders are confirmed or processed.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-900">
                    {orders
                      .filter((o) => o.status === "pending")
                      .map((order) => (
                        <div
                          key={order.id}
                          className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-white">#{order.id}</span>
                              <span className="text-neutral-400">•</span>
                              <span className="text-white font-semibold">{order.customerName}</span>
                              <span className="text-neutral-500">({order.customerPhone})</span>
                            </div>
                            <p className="text-neutral-500 text-[11px] mt-0.5">
                              {order.items.length} items • ₹{order.totalAmount.toLocaleString("en-IN")}{" "}
                              {order.paymentMethod === "ONLINE" || order.paymentStatus === "completed" ? (
                                <span className="text-emerald-400 font-bold">(PREPAID)</span>
                              ) : (
                                <span className="text-amber-400 font-bold">(COD)</span>
                              )}{" "}
                              • {order.shippingAddress.city}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, "confirmed")}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-[10px]"
                            >
                              ✓ Confirm & Email Customer
                            </button>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold uppercase tracking-wider text-[10px]"
                            >
                              Inspect
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. ORDERS MANAGEMENT TAB */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
                    Fulfillment Engine
                  </span>
                  <h1 className="text-2xl font-black uppercase tracking-wider text-white font-mono">
                    Order Management ({orders.length})
                  </h1>
                </div>

                {/* Status Filter */}
                <div className="flex items-center space-x-1 bg-neutral-950 p-1 border border-neutral-800 overflow-x-auto max-w-full">
                  {["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => setOrderFilter(st)}
                        className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${
                          orderFilter === st
                            ? "bg-white text-black"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-neutral-950 border border-neutral-800 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-900 text-neutral-400 border-b border-neutral-800 uppercase tracking-wider font-bold">
                      <th className="p-3.5">Order ID</th>
                      <th className="p-3.5">Customer & Phone</th>
                      <th className="p-3.5">Items</th>
                      <th className="p-3.5">Amount & Payment</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-neutral-300">
                    {filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-neutral-900/50">
                        <td className="p-3.5 font-mono font-bold text-white">#{ord.id}</td>
                        <td className="p-3.5">
                          <p className="font-semibold text-white">{ord.customerName}</p>
                          <p className="text-[11px] text-neutral-500 font-mono">{ord.customerPhone}</p>
                        </td>
                        <td className="p-3.5">
                          <p className="font-medium text-neutral-300">{ord.items.length} items</p>
                          <p className="text-[10px] text-neutral-500 line-clamp-1">
                            {ord.items.map((i) => `${i.productName} (${i.size})`).join(", ")}
                          </p>
                        </td>
                        <td className="p-3.5 font-mono">
                          <div className="font-bold text-white">
                            ₹{ord.totalAmount.toLocaleString("en-IN")}
                          </div>
                          {ord.paymentMethod === "ONLINE" || ord.paymentStatus === "completed" ? (
                            <span className="inline-block text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 font-sans font-extrabold uppercase mt-0.5">
                              ✓ PREPAID
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 font-sans font-extrabold uppercase mt-0.5">
                              💵 COD
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <select
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 text-white text-[11px] font-bold uppercase p-1.5 focus:outline-hidden"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-neutral-400 font-mono">
                          {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-white"
                            title="Inspect Order"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setViewInvoiceOrder(ord)}
                            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-white"
                            title="Print Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. PRODUCTS MANAGEMENT TAB */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
                    Inventory & Drops
                  </span>
                  <h1 className="text-2xl font-black uppercase tracking-wider text-white font-mono">
                    Product Catalog ({products.length})
                  </h1>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search product..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="p-2 bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-hidden"
                  />
                  <button
                    onClick={handleOpenAddProduct}
                    className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 flex items-center space-x-1.5 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Product</span>
                  </button>
                </div>
              </div>

              {/* Product Grid / Table */}
              <div className="bg-neutral-950 border border-neutral-800 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-900 text-neutral-400 border-b border-neutral-800 uppercase tracking-wider font-bold">
                      <th className="p-3.5">Image & Name</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Price / MRP</th>
                      <th className="p-3.5">Inventory</th>
                      <th className="p-3.5">Sizes</th>
                      <th className="p-3.5">Badges</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-neutral-300">
                    {products
                      .filter(
                        (p) =>
                          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.category.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.sku.toLowerCase().includes(productSearch.toLowerCase())
                      )
                      .map((prod) => (
                        <tr key={prod.id} className="hover:bg-neutral-900/50">
                          <td className="p-3.5">
                            <div className="flex items-center space-x-3">
                              <img
                                src={prod.images[0]}
                                alt={prod.name}
                                className="w-10 h-12 object-cover object-top bg-neutral-800 flex-shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <p className="font-bold text-white uppercase">{prod.name}</p>
                                <p className="text-[10px] text-neutral-500 font-mono">SKU: {prod.sku}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-medium text-neutral-300">{prod.category}</td>
                          <td className="p-3.5 font-mono">
                            <span className="font-bold text-white">
                              ₹{(prod.discountPrice || prod.price).toLocaleString("en-IN")}
                            </span>
                            {prod.discountPrice && (
                              <span className="text-[10px] text-neutral-500 line-through ml-1.5">
                                ₹{prod.price.toLocaleString("en-IN")}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 font-mono font-bold text-[11px] ${
                                prod.stockQuantity <= 5
                                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                                  : "bg-neutral-900 text-neutral-300"
                              }`}
                            >
                              {prod.stockQuantity} pcs
                            </span>
                          </td>
                          <td className="p-3.5 text-[11px] text-neutral-400 font-mono">
                            {prod.availableSizes.join(", ")}
                          </td>
                          <td className="p-3.5 space-x-1">
                            {prod.isBestSeller && (
                              <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.5 font-extrabold uppercase">
                                Best
                              </span>
                            )}
                            {prod.isNewArrival && (
                              <span className="text-[9px] bg-white text-black px-1.5 py-0.5 font-extrabold uppercase">
                                New
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditProduct(prod)}
                              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-white"
                              title="Edit product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-1.5 bg-red-950 text-red-400 hover:bg-red-900"
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. CUSTOMERS TAB */}
          {activeTab === "customers" && (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
                  Client Directory
                </span>
                <h1 className="text-2xl font-black uppercase tracking-wider text-white font-mono">
                  Registered Customers ({customers.length})
                </h1>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-900 text-neutral-400 border-b border-neutral-800 uppercase tracking-wider font-bold">
                      <th className="p-3.5">Client Name</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Mobile</th>
                      <th className="p-3.5">Joined Date</th>
                      <th className="p-3.5">Saved Addresses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-neutral-300">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-neutral-900/50">
                        <td className="p-3.5 font-bold text-white">{c.name}</td>
                        <td className="p-3.5 font-mono text-neutral-300">{c.email}</td>
                        <td className="p-3.5 font-mono text-neutral-300">{c.mobile || "—"}</td>
                        <td className="p-3.5 font-mono text-neutral-400">
                          {new Date(c.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="p-3.5 text-neutral-400">
                          {(c.savedAddresses || []).length} address saved
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. REVIEWS TAB */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
                  Customer Testimonials
                </span>
                <h1 className="text-2xl font-black uppercase tracking-wider text-white font-mono">
                  Review Moderation ({reviews.length})
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-5 bg-neutral-950 border border-neutral-800 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-1 text-amber-400">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                          ))}
                        </div>
                        <p className="font-bold text-white text-xs mt-1">{rev.productName}</p>
                        <p className="text-[11px] text-neutral-400">By {rev.userName}</p>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {new Date(rev.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 italic">"{rev.review}"</p>

                    <div className="pt-2 border-t border-neutral-900 flex justify-between items-center">
                      <button
                        onClick={() => handleToggleFeatureReview(rev)}
                        className={`text-[11px] font-bold uppercase px-2 py-1 ${
                          rev.isFeatured
                            ? "bg-amber-400 text-black"
                            : "bg-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {rev.isFeatured ? "★ Featured on Homepage" : "Make Featured"}
                      </button>

                      <button
                        onClick={() => handleDeleteReview(rev.id)}
                        className="text-xs text-red-400 hover:underline font-bold uppercase"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. EMAIL OUTBOX TAB */}
          {activeTab === "emails" && (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
                  Transactional Notifications
                </span>
                <h1 className="text-2xl font-black uppercase tracking-wider text-white font-mono">
                  Email Dispatch Log ({emails.length})
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Real-time preview of emails dispatched to customers upon order placement, confirmation, and status updates.
                </p>
              </div>

              {emails.length === 0 ? (
                <div className="py-12 text-center bg-neutral-950 border border-neutral-800 text-xs text-neutral-500">
                  No transactional emails generated yet. Confirm an order to see its generated email template.
                </div>
              ) : (
                <div className="space-y-4">
                  {emails.map((em) => (
                    <div
                      key={em.id}
                      className="bg-neutral-950 border border-neutral-800 p-6 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-neutral-800 gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-emerald-400 bg-emerald-950 px-2 py-0.5 border border-emerald-800">
                            {em.type.toUpperCase()}
                          </span>
                          <h3 className="text-sm font-bold text-white mt-1">{em.subject}</h3>
                          <p className="text-xs text-neutral-400">To: {em.to}</p>
                        </div>
                        <span className="text-xs text-neutral-500 font-mono">
                          {new Date(em.sentAt).toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* HTML Email preview container */}
                      <div className="bg-white text-black p-4 rounded-xs max-h-96 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: em.html }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. STORE SETTINGS TAB */}
          {activeTab === "settings" && storeSettings && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
                  Configuration
                </span>
                <h1 className="text-2xl font-black uppercase tracking-wider text-white font-mono">
                  Store Identity & Policies
                </h1>
              </div>

              <form
                onSubmit={handleUpdateStoreSettings}
                className="bg-neutral-950 border border-neutral-800 p-6 space-y-4"
              >
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Store Brand Name
                  </label>
                  <input
                    type="text"
                    value={storeSettings.storeName}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, storeName: e.target.value })
                    }
                    className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Brand Tagline
                  </label>
                  <input
                    type="text"
                    value={storeSettings.tagline}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, tagline: e.target.value })
                    }
                    className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Announcement Banner Text
                  </label>
                  <input
                    type="text"
                    value={storeSettings.announcementText}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, announcementText: e.target.value })
                    }
                    className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={storeSettings.supportEmail}
                      onChange={(e) =>
                        setStoreSettings({ ...storeSettings, supportEmail: e.target.value })
                      }
                      className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Support Phone
                    </label>
                    <input
                      type="text"
                      value={storeSettings.supportPhone}
                      onChange={(e) =>
                        setStoreSettings({ ...storeSettings, supportPhone: e.target.value })
                      }
                      className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Flagship Studio Address
                  </label>
                  <input
                    type="text"
                    value={storeSettings.storeAddress}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, storeAddress: e.target.value })
                    }
                    className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                  />
                </div>

                {/* Dynamic Shipping Charges Adjustment Section */}
                <div className="pt-4 border-t border-neutral-800 space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <Truck className="w-4 h-4 text-amber-400" />
                    <span>🚚 Shipping & Delivery Charges Adjustment</span>
                  </div>

                  <div className="p-3 bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-300 space-y-1">
                    <p className="font-bold text-white">💡 Code Edit Kare Bina Shipping Charge Adjust Karein:</p>
                    <p className="text-neutral-400 leading-relaxed text-[11px]">
                      Jab bhi aap koi discount sale chalayein ya customer ko Free Shipping offer karein, toh yahan se Standard Shipping Fee ko <code className="bg-neutral-800 text-amber-300 px-1 font-mono">0</code> kar dein. Poori website, Cart, aur Checkout par shipping automatically FREE ho jayegi!
                    </p>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      Quick Shipping Discount Presets:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setStoreSettings({
                            ...storeSettings,
                            standardShippingRate: 0,
                            freeShippingThreshold: 0,
                          })
                        }
                        className={`p-2.5 text-[11px] font-bold border text-left transition-all ${
                          storeSettings.standardShippingRate === 0
                            ? "bg-amber-400 text-black border-amber-400 shadow-md font-extrabold"
                            : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500"
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <span>⚡</span>
                          <span>100% FREE Shipping</span>
                        </div>
                        <span className="block text-[9px] opacity-80 mt-0.5">Rate: ₹0 | Threshold: ₹0</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setStoreSettings({
                            ...storeSettings,
                            standardShippingRate: 99,
                            freeShippingThreshold: 1999,
                          })
                        }
                        className={`p-2.5 text-[11px] font-bold border text-left transition-all ${
                          storeSettings.standardShippingRate === 99 && storeSettings.freeShippingThreshold === 1999
                            ? "bg-amber-400 text-black border-amber-400 shadow-md font-extrabold"
                            : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500"
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <span>🚚</span>
                          <span>Standard ₹99</span>
                        </div>
                        <span className="block text-[9px] opacity-80 mt-0.5">Rate: ₹99 | Free above ₹1,999</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setStoreSettings({
                            ...storeSettings,
                            standardShippingRate: 49,
                            freeShippingThreshold: 999,
                          })
                        }
                        className={`p-2.5 text-[11px] font-bold border text-left transition-all ${
                          storeSettings.standardShippingRate === 49 && storeSettings.freeShippingThreshold === 999
                            ? "bg-amber-400 text-black border-amber-400 shadow-md font-extrabold"
                            : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500"
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <span>📦</span>
                          <span>Low Fee ₹49</span>
                        </div>
                        <span className="block text-[9px] opacity-80 mt-0.5">Rate: ₹49 | Free above ₹999</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1">
                        Standard Shipping Charge (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={storeSettings.standardShippingRate ?? 99}
                        onChange={(e) =>
                          setStoreSettings({
                            ...storeSettings,
                            standardShippingRate: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white font-mono"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">
                        Set to 0 for 100% Free Shipping.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1">
                        Free Shipping Threshold (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={storeSettings.freeShippingThreshold ?? 1999}
                        onChange={(e) =>
                          setStoreSettings({
                            ...storeSettings,
                            freeShippingThreshold: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white font-mono"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">
                        Orders above this subtotal get FREE delivery.
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors mt-4"
                >
                  Save Store Settings
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            onClick={() => setShowProductModal(false)}
          />
          <div className="relative bg-neutral-950 border border-neutral-700 w-full max-w-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto text-neutral-200">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-800">
              <h3 className="text-base font-black uppercase tracking-wider text-white font-mono">
                {editingProduct ? "Edit Streetwear Garment" : "Add New Garment to Catalog"}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                  Garment Name *
                </label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="e.g. Heavyweight 500 GSM Boxy Hoodie"
                  className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value)}
                    className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                  >
                    <option value="Hoodies">Hoodies</option>
                    <option value="T-Shirts">T-Shirts</option>
                    <option value="Cargos">Cargos</option>
                    <option value="Outerwear">Outerwear</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    MRP Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={pPrice}
                    onChange={(e) => setPPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    Discount Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={pDiscountPrice}
                    onChange={(e) => setPDiscountPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    Stock Quantity (Warehouse) *
                  </label>
                  <input
                    type="number"
                    required
                    value={pStockQuantity}
                    onChange={(e) => setPStockQuantity(Number(e.target.value))}
                    className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value)}
                    className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                  Description & Fabric Specifications *
                </label>
                <textarea
                  rows={3}
                  required
                  value={pDescription}
                  onChange={(e) => setPDescription(e.target.value)}
                  className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                  Colorways (comma separated)
                </label>
                <input
                  type="text"
                  value={pColors}
                  onChange={(e) => setPColors(e.target.value)}
                  className="w-full p-2.5 bg-neutral-900 border border-neutral-700 text-xs text-white"
                />
              </div>

              {/* Direct Product Photo Upload Section */}
              <div className="bg-neutral-900/50 p-4 border border-neutral-800 space-y-3 rounded-xs">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-white tracking-wider">
                      Product Photos / Garment Images *
                    </label>
                    <p className="text-[10px] text-neutral-400">
                      Mobile phone camera ya gallery se direct photos upload karein
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUrlTextarea(!showUrlTextarea)}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-mono underline cursor-pointer"
                  >
                    {showUrlTextarea ? "Hide URL Box" : "Paste Image Link / URL"}
                  </button>
                </div>

                {/* Direct Action Buttons: Gallery & Camera */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center justify-center space-x-2 p-3 bg-neutral-900 hover:bg-neutral-800 border border-dashed border-neutral-600 hover:border-white text-xs font-bold text-white cursor-pointer transition-colors rounded-xs">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>📱 Gallery se Photo Choose Karein</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center justify-center space-x-2 p-3 bg-neutral-900 hover:bg-neutral-800 border border-dashed border-neutral-600 hover:border-white text-xs font-bold text-white cursor-pointer transition-colors rounded-xs">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>📷 Phone Camera se Photo Khinche</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Loading indicator during photo processing */}
                {isUploadingImage && (
                  <div className="p-3 bg-neutral-950 border border-amber-900/50 text-xs text-amber-400 flex items-center space-x-2 font-mono">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Photo compress aur optimize ho rahi hai...</span>
                  </div>
                )}

                {/* Interactive Thumbnail Preview Gallery */}
                {(() => {
                  const imagesList = pImages
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean);

                  if (imagesList.length === 0) {
                    return (
                      <div className="p-4 bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-500 rounded-xs">
                        📷 Koi photo uploaded nahi hai. Upar button par click karke phone se photo add karein.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block font-mono">
                        Uploaded Photos ({imagesList.length}):
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {imagesList.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className="relative group aspect-square bg-neutral-950 border border-neutral-800 overflow-hidden rounded-xs"
                          >
                            <img
                              src={imgUrl}
                              alt={`Product ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80";
                              }}
                            />
                            <span className="absolute top-1 left-1 bg-black/90 text-white text-[9px] px-1 py-0.2 font-mono font-bold border border-neutral-700">
                              {idx === 0 ? "MAIN" : `#${idx + 1}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveImageIndex(idx)}
                              className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-xs text-xs transition-opacity shadow-md cursor-pointer"
                              title="Delete this photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Optional Raw Textarea for image URLs */}
                {showUrlTextarea && (
                  <div className="space-y-1 pt-2 border-t border-neutral-800">
                    <label className="block text-[10px] text-neutral-400 font-mono">
                      Image URLs (One URL per line):
                    </label>
                    <textarea
                      rows={3}
                      value={pImages}
                      onChange={(e) => setPImages(e.target.value)}
                      placeholder="Paste image URLs here..."
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 text-xs text-white font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={pIsFeatured}
                    onChange={(e) => setPIsFeatured(e.target.checked)}
                    className="accent-white"
                  />
                  <span>Featured Product</span>
                </label>
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={pIsNewArrival}
                    onChange={(e) => setPIsNewArrival(e.target.checked)}
                    className="accent-white"
                  />
                  <span>New Drop</span>
                </label>
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={pIsBestSeller}
                    onChange={(e) => setPIsBestSeller(e.target.checked)}
                    className="accent-white"
                  />
                  <span>Bestseller</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors mt-4"
              >
                {editingProduct ? "Save Changes" : "Publish to Public Store"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="relative bg-neutral-950 border border-neutral-700 w-full max-w-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-6 text-neutral-200">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-800">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-bold">Admin Inspector</span>
                <h3 className="text-lg font-black text-white font-mono">#{selectedOrder.id}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-neutral-900 p-4 border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase font-bold">Customer Details</span>
                <p className="font-bold text-white">{selectedOrder.customerName}</p>
                <p className="text-neutral-400">{selectedOrder.customerEmail}</p>
                <p className="text-neutral-400">Phone: {selectedOrder.customerPhone}</p>
              </div>

              <div className="bg-neutral-900 p-4 border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase font-bold">Shipping Address</span>
                <p className="text-neutral-300">
                  {selectedOrder.shippingAddress.addressLine}, {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.pincode}
                </p>
                {selectedOrder.notes && (
                  <p className="text-amber-400 mt-1">Note: {selectedOrder.notes}</p>
                )}
              </div>

              <div className="bg-neutral-900 p-4 border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase font-bold">Payment Method</span>
                {selectedOrder.paymentMethod === "ONLINE" || selectedOrder.paymentStatus === "completed" ? (
                  <div>
                    <p className="font-bold text-emerald-400 uppercase text-xs">✓ PREPAID (ONLINE PAID)</p>
                    <p className="text-emerald-300/80 text-[11px] mt-0.5">Collect ₹0 cash from customer.</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-amber-400 uppercase text-xs">💵 CASH ON DELIVERY (COD)</p>
                    <p className="text-amber-300/80 text-[11px] mt-0.5">Collect ₹{selectedOrder.totalAmount.toLocaleString("en-IN")} cash on delivery.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Change Status and Logistics */}
            <div className="bg-neutral-900 p-4 border border-neutral-800 space-y-3">
              <span className="text-[10px] text-neutral-400 uppercase font-bold">
                Order Logistics & Notification
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Courier Tracking #"
                  value={trackingNumber || selectedOrder.trackingNumber || ""}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="p-2 bg-neutral-950 border border-neutral-700 text-xs text-white font-mono"
                />
                <input
                  type="text"
                  placeholder="Estimated Delivery Date"
                  value={estimatedDelivery || selectedOrder.estimatedDelivery || ""}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="p-2 bg-neutral-950 border border-neutral-700 text-xs text-white"
                />
                <select
                  value={selectedOrder.status}
                  onChange={(e) =>
                    handleUpdateOrderStatus(
                      selectedOrder.id,
                      e.target.value,
                      trackingNumber || selectedOrder.trackingNumber,
                      estimatedDelivery || selectedOrder.estimatedDelivery
                    )
                  }
                  className="p-2 bg-white text-black text-xs font-bold uppercase"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-neutral-900 text-xs">
              {selectedOrder.items.map((it, idx) => (
                <div key={idx} className="py-2 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <img
                      src={it.productImage}
                      alt={it.productName}
                      className="w-10 h-12 object-cover object-top bg-neutral-800"
                    />
                    <div>
                      <p className="font-bold text-white uppercase">{it.productName}</p>
                      <p className="text-neutral-400">
                        Size: {it.size} | Color: {it.color} | Qty: {it.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-white">
                    ₹{it.totalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-between items-center font-mono font-bold text-sm text-white">
              <span>
                {selectedOrder.paymentMethod === "ONLINE" || selectedOrder.paymentStatus === "completed"
                  ? "Total Paid (PREPAID - ₹0 Cash Collectable):"
                  : "Total Amount Collectable (COD Cash):"}
              </span>
              <span className={selectedOrder.paymentMethod === "ONLINE" || selectedOrder.paymentStatus === "completed" ? "text-emerald-400" : "text-amber-400"}>
                ₹{selectedOrder.totalAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal for Printing */}
      {viewInvoiceOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            onClick={() => setViewInvoiceOrder(null)}
          />
          <div className="relative bg-white text-black w-full max-w-2xl p-8 shadow-2xl z-10 space-y-6">
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div>
                <h2 className="text-2xl font-black font-mono tracking-widest uppercase">PRYMEWEAR</h2>
                <p className="text-xs text-gray-600">Tax Invoice & Delivery Manifest</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-mono font-bold">INVOICE #{viewInvoiceOrder.id}</p>
                <p className="text-gray-500">
                  {new Date(viewInvoiceOrder.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold uppercase text-gray-500 block">Billed & Shipped To:</span>
                <p className="font-bold">{viewInvoiceOrder.shippingAddress.fullName}</p>
                <p className="text-gray-700">
                  {viewInvoiceOrder.shippingAddress.addressLine}, {viewInvoiceOrder.shippingAddress.city}, {viewInvoiceOrder.shippingAddress.state} - {viewInvoiceOrder.shippingAddress.pincode}
                </p>
                <p className="text-gray-700">Mobile: {viewInvoiceOrder.shippingAddress.mobile}</p>
              </div>
              <div className="text-right">
                <span className="font-bold uppercase text-gray-500 block">Payment Terms:</span>
                {viewInvoiceOrder.paymentMethod === "ONLINE" || viewInvoiceOrder.paymentStatus === "completed" ? (
                  <>
                    <p className="font-extrabold text-emerald-700 text-sm">✓ PREPAID (ONLINE PAID)</p>
                    <p className="text-emerald-600 font-bold text-[11px]">DO NOT COLLECT CASH (₹0)</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-amber-800 text-sm">CASH ON DELIVERY (COD)</p>
                    <p className="text-gray-700 font-medium text-[11px]">Collect Cash Upon Delivery</p>
                  </>
                )}
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-black font-bold uppercase">
                  <th className="py-2">Item Description</th>
                  <th className="py-2">Size / Color</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {viewInvoiceOrder.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-bold uppercase">{it.productName}</td>
                    <td className="py-2">{it.size} / {it.color}</td>
                    <td className="py-2 text-center">{it.quantity}</td>
                    <td className="py-2 text-right font-mono">₹{it.totalPrice.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-4 border-t-2 border-black flex justify-between font-bold text-sm">
              <span>
                {viewInvoiceOrder.paymentMethod === "ONLINE" || viewInvoiceOrder.paymentStatus === "completed"
                  ? "Total Amount Paid (PREPAID - ₹0 Cash):"
                  : "Total Cash Collectable (COD):"}
              </span>
              <span className={`font-mono text-base ${viewInvoiceOrder.paymentMethod === "ONLINE" || viewInvoiceOrder.paymentStatus === "completed" ? "text-emerald-700 font-extrabold" : "text-black"}`}>
                ₹{viewInvoiceOrder.totalAmount.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 flex items-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </button>
              <button
                onClick={() => setViewInvoiceOrder(null)}
                className="px-4 py-2 bg-gray-200 text-black text-xs font-bold uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
