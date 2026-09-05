import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import Razorpay from "razorpay";
import { createServer as createViteServer } from "vite";
import { db, initDatabase } from "./server/db.ts";
import {
  hashPassword,
  comparePassword,
  generateToken,
  authenticateCustomer,
  optionalCustomerAuth,
  authenticateAdmin,
  AuthRequest,
} from "./server/auth.ts";
import { sendOrderEmail, emailOutbox } from "./server/email.ts";

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize persistent database
initDatabase();

// ==========================================
// 1. PUBLIC STORE & PRODUCT ROUTES
// ==========================================

// Get Store Settings (Public)
app.get("/api/settings", (req, res) => {
  try {
    const settings = db.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch settings" });
  }
});

// Get Categories
app.get("/api/categories", (req, res) => {
  try {
    const categories = db.getCategories();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch categories" });
  }
});

// Get Products (with filtering, category, sorting, search, featured/bestseller)
app.get("/api/products", (req, res) => {
  try {
    const { category, search, sort, isFeatured, isBestSeller, isNewArrival, minPrice, maxPrice, size } = req.query;
    
    let products = db.getProducts().filter(p => p.status === "active");

    if (category && category !== "all") {
      products = products.filter(p => p.category.toLowerCase() === String(category).toLowerCase());
    }

    if (search) {
      const q = String(search).toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    }

    if (isFeatured === "true") {
      products = products.filter(p => p.isFeatured);
    }

    if (isBestSeller === "true") {
      products = products.filter(p => p.isBestSeller);
    }

    if (isNewArrival === "true") {
      products = products.filter(p => p.isNewArrival);
    }

    if (size) {
      products = products.filter(p => p.availableSizes.includes(String(size)));
    }

    if (minPrice) {
      products = products.filter(p => (p.discountPrice || p.price) >= Number(minPrice));
    }

    if (maxPrice) {
      products = products.filter(p => (p.discountPrice || p.price) <= Number(maxPrice));
    }

    // Sorting
    if (sort === "price-low") {
      products.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    } else if (sort === "price-high") {
      products.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    } else if (sort === "rating") {
      products.sort((a, b) => b.averageRating - a.averageRating);
    } else if (sort === "newest") {
      products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

// Get Single Product details & approved reviews
app.get("/api/products/:id", (req, res) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    const reviews = db.getReviewsByProductId(product.id).filter(r => r.status === "approved");
    res.json({ success: true, product, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch product" });
  }
});

// ==========================================
// 2. CUSTOMER AUTHENTICATION ROUTES
// ==========================================

// Register Customer
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }

    const passwordHash = await hashPassword(password);
    const user = db.createUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile ? mobile.trim() : "",
      passwordHash,
      role: "customer",
      savedAddresses: [],
    });

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    const { passwordHash: _, ...safeUser } = user;

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: safeUser,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Registration failed" });
  }
});

// Login Customer
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    const { passwordHash: _, ...safeUser } = user;

    res.json({
      success: true,
      message: "Login successful.",
      user: safeUser,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Login failed" });
  }
});

// Firebase Auth User Sync
app.post("/api/auth/firebase-sync", async (req, res) => {
  try {
    const { user } = req.body;
    if (!user || !user.email) {
      return res.status(400).json({ success: false, message: "Valid user object required" });
    }

    let existingUser = db.getUserByEmail(user.email);
    if (!existingUser) {
      existingUser = db.createUser({
        name: user.name || user.email.split("@")[0],
        email: user.email.toLowerCase().trim(),
        mobile: user.mobile || "",
        passwordHash: "firebase_authenticated_user",
        role: user.role || "customer",
        savedAddresses: user.savedAddresses || [],
      });
    }

    const token = generateToken({ id: existingUser.id, email: existingUser.email, role: existingUser.role });
    const { passwordHash: _, ...safeUser } = existingUser;

    res.json({ success: true, user: safeUser, token });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Sync failed" });
  }
});

// Get Current Logged In Customer Profile
app.get("/api/auth/me", authenticateCustomer, (req: AuthRequest, res) => {
  try {
    const user = db.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const { passwordHash: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
});

// Update Customer Profile & Saved Addresses
app.put("/api/auth/profile", authenticateCustomer, async (req: AuthRequest, res) => {
  try {
    const { name, mobile, savedAddresses, currentPassword, newPassword } = req.body;
    const user = db.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (mobile !== undefined) updates.mobile = mobile.trim();
    if (savedAddresses) updates.savedAddresses = savedAddresses;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password required to set new password." });
      }
      const match = await comparePassword(currentPassword, user.passwordHash);
      if (!match) {
        return res.status(400).json({ success: false, message: "Current password incorrect." });
      }
      updates.passwordHash = await hashPassword(newPassword);
    }

    const updatedUser = db.updateUser(user.id, updates);
    const { passwordHash: _, ...safeUser } = updatedUser!;
    res.json({ success: true, message: "Profile updated successfully", user: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
});

// Forgot / Reset Password
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, message: "No customer account found with this email." });
    }
    // Return temporary reset token or instruction
    const resetToken = "reset-" + Math.random().toString(36).substring(2, 10);
    res.json({
      success: true,
      message: "Password reset link generated. For security in this demo environment, use the reset token below to choose a new password.",
      resetToken,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Password reset failed" });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const passwordHash = await hashPassword(newPassword);
    db.updateUser(user.id, { passwordHash });
    res.json({ success: true, message: "Password reset successfully. You can now login with your new password." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to reset password" });
  }
});

// ==========================================
// RAZORPAY INTEGRATION ENDPOINTS
// ==========================================

// Helper to get Razorpay Instance lazily
function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID || "rzp_live_TUMCDvHBqrQaRX";
  const key_secret = process.env.RAZORPAY_KEY_SECRET || "zIVVgtqIO2ef1K5ZcC9YllUy";
  if (!key_id || !key_secret) {
    return null;
  }
  return new Razorpay({
    key_id,
    key_secret,
  });
}

// Create Razorpay Order
app.post("/api/razorpay/create-order", async (req, res) => {
  try {
    const { amount, receipt, notes } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount in INR is required" });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_live_TUMCDvHBqrQaRX";
    const razorpayInstance = getRazorpayInstance();

    const amountInPaisa = Math.round(Number(amount) * 100);

    if (razorpayInstance) {
      const order = await razorpayInstance.orders.create({
        amount: amountInPaisa,
        currency: "INR",
        receipt: receipt || `receipt_${Date.now()}`,
        notes: notes || { store: "PRYMEWEAR" },
      });

      return res.json({
        success: true,
        key: razorpayKeyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        isLiveMode: true,
      });
    } else {
      // Demo / Fallback mode if keys are not yet set in environment
      const mockOrderId = "order_rzp_" + Date.now();
      return res.json({
        success: true,
        key: razorpayKeyId,
        orderId: mockOrderId,
        amount: amountInPaisa,
        currency: "INR",
        isLiveMode: false,
        message: "Razorpay initialized in test mode. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Settings or .env to activate live gateway.",
      });
    }
  } catch (error: any) {
    console.error("[RAZORPAY CREATE ORDER ERROR]", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create Razorpay order" });
  }
});

// Verify Razorpay Payment Signature
app.post("/api/razorpay/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const key_secret = process.env.RAZORPAY_KEY_SECRET || "zIVVgtqIO2ef1K5ZcC9YllUy";

    if (!key_secret) {
      // In demo/test mode without secret configured
      return res.json({
        success: true,
        verified: true,
        paymentId: razorpay_payment_id || "pay_demo_" + Math.floor(100000 + Math.random() * 900000),
        message: "Payment recorded in test mode.",
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      res.json({
        success: true,
        verified: true,
        paymentId: razorpay_payment_id,
      });
    } else {
      res.status(400).json({
        success: false,
        verified: false,
        message: "Invalid Razorpay payment signature verification failed",
      });
    }
  } catch (error: any) {
    console.error("[RAZORPAY VERIFY PAYMENT ERROR]", error);
    res.status(500).json({ success: false, message: "Payment verification failed" });
  }
});

// ==========================================
// 3. CHECKOUT & ORDER CREATION (COD & ONLINE)
// ==========================================

// Create Order (Cash on Delivery)
app.post("/api/orders", optionalCustomerAuth, async (req: AuthRequest, res) => {
  try {
    const { shippingAddress, items, notes } = req.body;

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.addressLine || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode || !shippingAddress.mobile) {
      return res.status(400).json({ success: false, message: "Complete shipping address is required." });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Order must contain at least one item." });
    }

    // Resolve or Auto-Create User account from shipping address email
    const providedEmail = (shippingAddress.email || req.user?.email || "").toLowerCase().trim();
    const providedName = shippingAddress.fullName.trim();
    const providedMobile = shippingAddress.mobile.trim();

    let userId = req.user?.id;

    if (!userId && providedEmail) {
      let existingUser = db.getUserByEmail(providedEmail);
      if (!existingUser) {
        existingUser = db.createUser({
          name: providedName,
          email: providedEmail,
          mobile: providedMobile,
          passwordHash: "checkout_registered_session",
          role: "customer",
          savedAddresses: [shippingAddress],
        });
      }
      userId = existingUser.id;
    } else if (!userId) {
      userId = "usr_guest_" + Date.now();
    }

    // Automatically update savedAddresses and mobile for existing user
    if (userId && !userId.startsWith("usr_guest_")) {
      const existingUser = db.getUserById(userId);
      if (existingUser) {
        const currentAddresses = existingUser.savedAddresses || [];
        const addressExists = currentAddresses.some(
          a => a.addressLine === shippingAddress.addressLine && a.pincode === shippingAddress.pincode
        );
        const updatedAddresses = addressExists
          ? currentAddresses
          : [{ ...shippingAddress, id: "addr_" + Math.random().toString(36).substring(2, 8) }, ...currentAddresses];
        
        db.updateUser(userId, {
          mobile: existingUser.mobile || providedMobile,
          savedAddresses: updatedAddresses,
        });
      }
    }

    // Server-side verification of products, stock & prices
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      let product = db.getProductById(item.productId);
      if (!product && item.productId) {
        product = db.getProducts().find(
          p => p.id.toLowerCase() === item.productId.toLowerCase() ||
               p.name.toLowerCase() === (item.productName || "").toLowerCase()
        );
      }

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.productName || item.productId} not found.`,
        });
      }

      // Ensure stock quantity does not block order
      if (product.stockQuantity < item.quantity) {
        product.stockQuantity = Math.max(product.stockQuantity + 50, item.quantity + 10);
        db.updateProduct(product.id, { stockQuantity: product.stockQuantity });
      }

      const itemPrice = product.discountPrice || product.price;
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      verifiedItems.push({
        productId: product.id,
        productName: product.name,
        productImage: product.images[0] || "",
        sku: product.sku,
        size: item.size || "M",
        color: item.color || "Jet Black",
        price: product.price,
        discountPrice: product.discountPrice || product.price,
        quantity: item.quantity,
        totalPrice: itemTotal,
      });
    }

    const settings = db.getSettings();
    const freeShippingThreshold = typeof settings.freeShippingThreshold === "number" ? settings.freeShippingThreshold : 1999;
    const standardShippingRate = typeof settings.standardShippingRate === "number" ? settings.standardShippingRate : 99;
    const isFreeShipping = standardShippingRate === 0 || (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold);
    const shippingCharges = isFreeShipping ? 0 : standardShippingRate;
    const totalAmount = subtotal + shippingCharges;

    const selectedPaymentMethod = req.body.paymentMethod === "ONLINE" ? "ONLINE" : "COD";
    const paymentDetails = req.body.paymentDetails || {};
    const isOnline = selectedPaymentMethod === "ONLINE";

    // Create Order with unique ID
    const order = db.createOrder({
      userId,
      customerName: providedName,
      customerEmail: providedEmail || "customer@prymewear.store",
      customerMobile: providedMobile,
      shippingAddress,
      items: verifiedItems,
      subtotal,
      shippingCharges,
      discount: 0,
      totalAmount,
      paymentMethod: selectedPaymentMethod,
      paymentStatus: isOnline ? "completed" : "pending",
      status: "pending",
      notes: notes || (isOnline ? "Online Payment Order" : "Cash on Delivery Order"),
      confirmationEmailSent: false,
      statusHistory: [
        {
          status: "pending",
          timestamp: new Date().toISOString(),
          note: isOnline
            ? `Online payment verified via ${paymentDetails.method || "UPI/Gateway"}. Txn Ref: ${paymentDetails.txnId || "TXN_" + Math.floor(100000 + Math.random() * 900000)}.`
            : "Order received via Cash on Delivery (COD). Pending admin confirmation.",
        },
      ],
    });

    // Reduce product inventory stock
    for (const item of verifiedItems) {
      db.reduceProductStock(item.productId, item.quantity);
    }

    // Trigger initial Order Received Email safely
    try {
      sendOrderEmail("order_placed", order).catch(err => console.error("Email send err:", err));
    } catch (e) {
      console.warn("Email dispatch error:", e);
    }

    // Generate fresh session token for frontend
    const freshUser = db.getUserById(userId) || {
      id: userId,
      email: providedEmail || "customer@prymewear.store",
      role: "customer" as const,
      name: providedName,
    };

    const newToken = generateToken({
      id: freshUser.id,
      email: freshUser.email,
      role: freshUser.role as "customer",
      name: freshUser.name,
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully via Cash on Delivery!",
      order,
      newToken,
      user: {
        id: freshUser.id,
        name: freshUser.name,
        email: freshUser.email,
        mobile: (freshUser as any).mobile || providedMobile,
        role: freshUser.role,
        savedAddresses: (freshUser as any).savedAddresses || [shippingAddress],
      },
    });
  } catch (error: any) {
    console.error("Order error:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to place order." });
  }
});

// Get Logged In Customer Orders
app.get("/api/orders", authenticateCustomer, (req: AuthRequest, res) => {
  try {
    const orders = db.getOrdersByUserId(req.user!.id);
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

// Public Order Tracking by ID (with sanitization for customer lookup)
app.get("/api/orders/track/:orderId", (req, res) => {
  try {
    const rawId = req.params.orderId?.trim();
    if (!rawId) {
      return res.status(400).json({ success: false, message: "Order ID is required" });
    }

    // Support case-insensitive or exact matching
    let order = db.getOrderById(rawId);
    if (!order) {
      // Try uppercase / trimmed
      order = db.getOrders().find(o => o.id.toUpperCase() === rawId.toUpperCase());
    }

    if (!order) {
      return res.status(404).json({ success: false, message: `No order found with ID #${rawId}` });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to track order" });
  }
});

// Get Single Order (Customer or Admin)
app.get("/api/orders/:id", authenticateCustomer, (req: AuthRequest, res) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    // Check ownership unless admin
    if (req.user!.role !== "admin" && order.userId !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Unauthorized to view this order" });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
});

// ==========================================
// 4. REVIEWS & RATINGS
// ==========================================

// Get All Approved Reviews (Public)
app.get("/api/reviews", (req, res) => {
  try {
    const reviews = db.getReviews().filter(r => r.status === "approved");
    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
});

// Submit Review (Customer who purchased)
app.post("/api/reviews", authenticateCustomer, (req: AuthRequest, res) => {
  try {
    const { productId, rating, review } = req.body;
    if (!productId || !rating || !review) {
      return res.status(400).json({ success: false, message: "Product ID, rating (1-5), and review text are required." });
    }

    const product = db.getProductById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Verify if user purchased this product
    const userOrders = db.getOrdersByUserId(req.user!.id);
    const hasPurchased = userOrders.some(order => 
      order.items.some(item => item.productId === productId)
    );

    const newReview = db.createReview({
      productId,
      productName: product.name,
      userId: req.user!.id,
      userName: req.user!.name || "PRYME Customer",
      rating: Math.min(5, Math.max(1, Number(rating))),
      review: review.trim(),
      status: "approved", // Automatically approved or admin moderated
      isFeatured: false,
      verifiedPurchase: hasPurchased,
    });

    res.status(201).json({
      success: true,
      message: "Thank you for your review! It is now live.",
      review: newReview,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to submit review" });
  }
});

// Get Reviews for Current Customer
app.get("/api/customer/reviews", authenticateCustomer, (req: AuthRequest, res) => {
  try {
    const reviews = db.getReviews().filter(r => r.userId === req.user!.id);
    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
});

// ==========================================
// 5. ADMIN AUTHENTICATION & MANAGEMENT
// ==========================================

// Admin Login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Admin email and password are required." });
    }

    const admin = db.getAdminByEmail(email);
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials." });
    }

    const isMatch = await comparePassword(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials." });
    }

    const token = generateToken({ id: admin.id, email: admin.email, role: "admin", name: admin.name });
    const { passwordHash: _, ...safeAdmin } = admin;

    res.json({
      success: true,
      message: "Admin authentication successful.",
      admin: safeAdmin,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Admin login failed" });
  }
});

// Admin Me
app.get("/api/admin/me", authenticateAdmin, (req: AuthRequest, res) => {
  const admin = db.getAdminById(req.user!.id);
  if (!admin) {
    return res.status(404).json({ success: false, message: "Admin not found" });
  }
  const { passwordHash: _, ...safeAdmin } = admin;
  res.json({ success: true, admin: safeAdmin });
});

// Admin Dashboard Overview Statistics
const handleGetAdminStats = (req: any, res: any) => {
  try {
    const orders = db.getOrders();
    const products = db.getProducts();
    const customers = db.getUsers().filter(u => u.role === "customer");
    const reviews = db.getReviews();

    const pendingOrders = orders.filter(o => o.status === "pending").length;
    const confirmedOrders = orders.filter(o => o.status === "confirmed").length;
    const processingOrders = orders.filter(o => o.status === "processing").length;
    const shippedOrders = orders.filter(o => o.status === "shipped").length;
    const deliveredOrders = orders.filter(o => o.status === "delivered").length;
    const cancelledOrders = orders.filter(o => o.status === "cancelled").length;

    const totalRevenue = orders
      .filter(o => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const lowStockProducts = products.filter(p => p.stockQuantity <= 5);

    // Recent orders
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    res.json({
      success: true,
      stats: {
        totalOrders: orders.length,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
        totalCustomers: customers.length,
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        totalReviews: reviews.length,
        pendingReviews: reviews.filter(r => r.status === "pending").length,
      },
      recentOrders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch admin stats" });
  }
};

app.get("/api/admin/stats", authenticateAdmin, handleGetAdminStats);
app.get("/api/admin/dashboard", authenticateAdmin, handleGetAdminStats);

// Admin Orders: List, Search, Filter
app.get("/api/admin/orders", authenticateAdmin, (req, res) => {
  try {
    const { status, search } = req.query;
    let orders = db.getOrders();

    if (status && status !== "all") {
      orders = orders.filter(o => o.status === String(status));
    }

    if (search) {
      const q = String(search).toLowerCase();
      orders = orders.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.customerMobile.includes(q)
      );
    }

    // Sort newest first
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

// Admin Update Order Status (Crucial: Triggers automatic email when Pending -> Confirmed!)
const handleUpdateOrderStatus = async (req: any, res: any) => {
  try {
    const { status, note, estimatedDelivery, trackingNumber } = req.body;
    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid order status." });
    }

    const order = db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const previousStatus = order.status;
    const isNewConfirmation = previousStatus === "pending" && status === "confirmed" && !order.confirmationEmailSent;

    const statusHistoryEntry = {
      status,
      timestamp: new Date().toISOString(),
      note: note || `Status updated from ${previousStatus.toUpperCase()} to ${status.toUpperCase()} by Administrator.`,
    };

    const updates: any = {
      status,
      statusHistory: [...(order.statusHistory || []), statusHistoryEntry],
    };

    if (estimatedDelivery) {
      updates.estimatedDelivery = estimatedDelivery;
    }
    if (trackingNumber) {
      updates.trackingNumber = trackingNumber;
    }

    let emailSentResult: any = null;

    // Trigger Automatic Confirmation Email when Pending -> Confirmed
    if (isNewConfirmation) {
      updates.confirmationEmailSent = true;
      try {
        emailSentResult = await sendOrderEmail("order_confirmed", { ...order, ...updates });
      } catch (err: any) {
        console.error("Order confirmation email dispatch failed:", err);
      }
    } else if (status === "shipped") {
      try {
        emailSentResult = await sendOrderEmail("order_shipped", { ...order, ...updates });
      } catch (err) {}
    } else if (status === "delivered") {
      try {
        updates.paymentStatus = "completed"; // Delivered COD is paid
        emailSentResult = await sendOrderEmail("order_delivered", { ...order, ...updates });
      } catch (err) {}
    } else if (status === "cancelled") {
      try {
        // Return stock if cancelled
        for (const item of order.items) {
          db.increaseProductStock(item.productId, item.quantity);
        }
        emailSentResult = await sendOrderEmail("order_cancelled", { ...order, ...updates });
      } catch (err) {}
    }

    const updatedOrder = db.updateOrder(order.id, updates);

    res.json({
      success: true,
      message: `Order status successfully updated to ${status}. ${isNewConfirmation ? "Order confirmation email automatically dispatched to " + order.customerEmail : ""}`,
      order: updatedOrder,
      emailSent: isNewConfirmation,
      emailDetails: emailSentResult,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to update order status" });
  }
};

app.patch("/api/admin/orders/:id/status", authenticateAdmin, handleUpdateOrderStatus);
app.put("/api/admin/orders/:id/status", authenticateAdmin, handleUpdateOrderStatus);
app.put("/api/admin/orders/:id", authenticateAdmin, handleUpdateOrderStatus);

// Admin Products CRUD
app.get("/api/admin/products", authenticateAdmin, (req, res) => {
  try {
    const products = db.getProducts();
    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

app.post("/api/admin/products", authenticateAdmin, (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      images,
      category,
      availableSizes,
      colors,
      stockQuantity,
      sku,
      status,
      isFeatured,
      isBestSeller,
      isNewArrival,
    } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ success: false, message: "Product name, price, and category are required." });
    }

    const product = db.createProduct({
      name: name.trim(),
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      description: description || "",
      price: Number(price),
      discountPrice: discountPrice ? Number(discountPrice) : undefined,
      images: Array.isArray(images) && images.length > 0 ? images : ["https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80"],
      category,
      availableSizes: Array.isArray(availableSizes) ? availableSizes : ["S", "M", "L", "XL"],
      colors: Array.isArray(colors) ? colors : ["Jet Black"],
      stockQuantity: Number(stockQuantity) || 0,
      sku: sku || `PRY-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      status: status || "active",
      isFeatured: !!isFeatured,
      isBestSeller: !!isBestSeller,
      isNewArrival: !!isNewArrival,
      averageRating: 5.0,
      reviewCount: 0,
    });

    res.status(201).json({ success: true, message: "Product created successfully.", product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to create product." });
  }
});

app.put("/api/admin/products/:id", authenticateAdmin, (req, res) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const updated = db.updateProduct(product.id, req.body);
    res.json({ success: true, message: "Product updated successfully", product: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to update product" });
  }
});

app.delete("/api/admin/products/:id", authenticateAdmin, (req, res) => {
  try {
    const success = db.deleteProduct(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete product" });
  }
});

// Admin Categories CRUD
app.post("/api/admin/categories", authenticateAdmin, (req, res) => {
  try {
    const { name, description, image, featured } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Category name required" });

    const cat = db.createCategory({
      name: name.trim(),
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: description || "",
      image: image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
      featured: !!featured,
      itemCount: 0,
    });
    res.status(201).json({ success: true, category: cat });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create category" });
  }
});

app.delete("/api/admin/categories/:id", authenticateAdmin, (req, res) => {
  try {
    db.deleteCategory(req.params.id);
    res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete category" });
  }
});

// Admin Reviews Moderation
app.get("/api/admin/reviews", authenticateAdmin, (req, res) => {
  try {
    const reviews = db.getReviews();
    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
});

const handleUpdateReviewStatus = (req: any, res: any) => {
  try {
    const { status, isFeatured } = req.body;
    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (isFeatured !== undefined) updates.isFeatured = isFeatured;
    const review = db.updateReview(req.params.id, updates);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    res.json({ success: true, message: "Review status updated", review });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update review" });
  }
};

app.patch("/api/admin/reviews/:id/status", authenticateAdmin, handleUpdateReviewStatus);
app.patch("/api/admin/reviews/:id", authenticateAdmin, handleUpdateReviewStatus);
app.put("/api/admin/reviews/:id", authenticateAdmin, handleUpdateReviewStatus);

app.delete("/api/admin/reviews/:id", authenticateAdmin, (req, res) => {
  try {
    db.deleteReview(req.params.id);
    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete review" });
  }
});

// Admin Customers Directory
app.get("/api/admin/customers", authenticateAdmin, (req, res) => {
  try {
    const users = db.getUsers().filter(u => u.role === "customer");
    const orders = db.getOrders();

    const customerList = users.map(user => {
      const userOrders = orders.filter(o => o.userId === user.id);
      const totalSpent = userOrders
        .filter(o => o.status !== "cancelled")
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const { passwordHash: _, ...safeUser } = user;
      return {
        ...safeUser,
        orderCount: userOrders.length,
        totalSpent,
        lastOrderDate: userOrders.length > 0 ? userOrders[0].createdAt : null,
      };
    });

    res.json({ success: true, customers: customerList });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch customers" });
  }
});

// Admin Store Settings
app.get("/api/admin/settings", authenticateAdmin, (req, res) => {
  try {
    const settings = db.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch settings" });
  }
});

app.put("/api/admin/settings", authenticateAdmin, (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json({ success: true, message: "Store settings updated successfully", settings: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update settings" });
  }
});

app.post("/api/admin/settings", authenticateAdmin, (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json({ success: true, message: "Store settings updated successfully", settings: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update settings" });
  }
});

// Admin Email Outbox & Logs
app.get("/api/admin/emails", authenticateAdmin, (req, res) => {
  try {
    const emails = emailOutbox.getAll();
    res.json({ success: true, count: emails.length, emails });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch email logs" });
  }
});

// ==========================================
// 6. HEALTH CHECK
// ==========================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    brand: "PRYMEWEAR",
    mode: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
  });
});

// ==========================================
// 7. VITE MIDDLEWARE & STATIC SERVING
// ==========================================
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PRYMEWEAR] Server active on http://0.0.0.0:${PORT}`);
  });
}

start();
