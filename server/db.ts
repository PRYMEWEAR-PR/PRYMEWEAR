import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export interface Address {
  id?: string;
  fullName: string;
  mobile: string;
  email?: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  passwordHash: string;
  role: "customer" | "admin";
  savedAddresses: Address[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin";
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  featured: boolean;
  itemCount: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: string;
  availableSizes: string[];
  colors: string[];
  stockQuantity: number;
  sku: string;
  status: "active" | "draft" | "archived";
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  discountPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  shippingAddress: Address;
  items: OrderItem[];
  subtotal: number;
  shippingCharges: number;
  discount: number;
  totalAmount: number;
  paymentMethod: "COD" | "ONLINE";
  paymentStatus: "pending" | "completed" | "failed";
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  notes?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  confirmationEmailSent: boolean;
  statusHistory: {
    status: string;
    timestamp: string;
    note?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  rating: number;
  review: string;
  status: "approved" | "pending" | "rejected";
  isFeatured: boolean;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  storeAddress: string;
  instagramUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  freeShippingThreshold: number;
  standardShippingRate: number;
  shippingPolicy: string;
  returnPolicy: string;
  privacyPolicy: string;
  termsConditions: string;
  aboutStory: string;
}

export interface DatabaseSchema {
  users: User[];
  admins: AdminUser[];
  categories: Category[];
  products: Product[];
  orders: Order[];
  reviews: Review[];
  settings: StoreSettings;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "database.json");

// In-memory cache synced to JSON file
let inMemoryData: DatabaseSchema | null = null;

function saveToDisk(data: DatabaseSchema) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("[PRYMEWEAR DB] Failed to save database to disk:", error);
  }
}

function loadFromDisk(): DatabaseSchema | null {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error("[PRYMEWEAR DB] Failed to load database from disk:", error);
  }
  return null;
}

export function initDatabase() {
  const loaded = loadFromDisk();
  if (loaded && loaded.products && loaded.products.length > 0) {
    inMemoryData = loaded;
    console.log("[PRYMEWEAR DB] Loaded persistent database from disk.");
    return;
  }

  // Pre-seed database with default luxury streetwear catalog
  const adminEmail = process.env.ADMIN_EMAIL || "thekartikbusiness@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Manoj@1981";
  const adminSalt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync(adminPassword, adminSalt);

  const initialAdmins: AdminUser[] = [
    {
      id: "admin_01",
      name: "Kartik (PRYMEWEAR Admin)",
      email: adminEmail.toLowerCase().trim(),
      passwordHash: adminHash,
      role: "admin",
      createdAt: new Date().toISOString(),
    },
  ];

  const initialCategories: Category[] = [
    {
      id: "cat_hoodies",
      name: "Hoodies & Sweatshirts",
      slug: "hoodies",
      description: "Heavyweight French terry oversized hoodies with architectural silhouettes.",
      image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80",
      featured: true,
      itemCount: 4,
    },
    {
      id: "cat_tees",
      name: "Oversized Tees",
      slug: "t-shirts",
      description: "280 GSM luxury combed cotton boxy cut graphic & minimal tees.",
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
      featured: true,
      itemCount: 4,
    },
    {
      id: "cat_cargos",
      name: "Technical Cargo Pants",
      slug: "cargo-pants",
      description: "Modular streetwear cargo pants with waterproof hardware and adjustable cuffs.",
      image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80",
      featured: true,
      itemCount: 3,
    },
    {
      id: "cat_outerwear",
      name: "Outerwear & Jackets",
      slug: "outerwear",
      description: "Weather-resistant tactical bombers, sherpa flannels, and cropped utility jackets.",
      image: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&auto=format&fit=crop&q=80",
      featured: true,
      itemCount: 3,
    },
    {
      id: "cat_accessories",
      name: "Headwear & Accessories",
      slug: "accessories",
      description: "Structured dad caps, raw brass hardware necklaces, and cross-body holster bags.",
      image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80",
      featured: false,
      itemCount: 2,
    },
  ];

  const initialProducts: Product[] = [
    {
      id: "prod_09",
      name: "Spider Emblem Boxy Lightweight Oversized Tee",
      slug: "spider-emblem-boxy-Lightweight-oversized-tee",
      description: "Premium 280 GSM luxury combed cotton boxy oversized fit tee. Features a high-density embroidered spider emblem on the chest, dropped shoulders, and a heavy rib knit collar that maintains its shape. Available in 4 high-fashion colorways.",
      price: 1999,
      discountPrice: 1099,
      images: [
        "https://i.ibb.co/j92wN435/Gemini-Generated-Image-swpsvbswpsvbswps.png",
        "https://i.ibb.co/8DgBCYy3/Gemini-Generated-Image-wca24gwca24gwca2.png",
        "https://i.ibb.co/XrJC6C0f/Front-1-c-51.jpg",
        "https://i.ibb.co/Nd3HFjNp/Front-1-c-49.jpg",
        "https://i.ibb.co/05sF4qs/Front-1-c-45.jpg",
        "https://i.ibb.co/rGX1JCC2/Front-1-c-4.jpg",
      ],
      category: "Oversized Tees",
      availableSizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["White", "Cream", "Lavender", "Grey"],
      stockQuantity: 100,
      sku: "PRY-TEE-SPD-1099",
      status: "active",
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: true,
      averageRating: 5.0,
      reviewCount: 18,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const initialSettings: StoreSettings = {
    storeName: "PRYMEWEAR",
    tagline: "Engineered Streetwear & Minimal Luxury",
    supportEmail: "thekrtikbusinesss@gmail.com",
    supportPhone: "+91 9211597397",
    storeAddress: "RZ 57, Shyam Vihar, Najafgarh, Delhi 110043",
    instagramUrl: "https://instagram.com/prymewear",
    twitterUrl: "https://twitter.com/prymewear",
    facebookUrl: "https://facebook.com/prymewear",
    freeShippingThreshold: 1999,
    standardShippingRate: 99,
    shippingPolicy: `PRYMEWEAR provides express nationwide delivery across India.

• Processing Time: All orders are inspected, quality-checked, and packed within 24-48 hours of confirmation.
• Delivery Time: Metro cities: 2-4 business days. Rest of India: 4-7 business days.
• Free Shipping: Free standard shipping on all orders over ₹1,999. Orders below ₹1,999 incur a flat ₹99 shipping fee.
• Cash on Delivery (COD): COD is available on all eligible postal codes across India. Our courier partners will collect payment upon physical delivery.
• Tracking: Real-time tracking IDs will be shared via email and your customer account order timeline as soon as the package is dispatched.`,
    returnPolicy: `We stand behind the craftsmanship of every PRYMEWEAR garment.

• 7-Day Hassle-Free Exchange & Return Window: You may initiate an exchange or return within 7 calendar days of delivery.
• Condition Requirements: Items must be unwashed, unworn, and returned in original condition with all garment tags intact and original packaging.
• Easy Returns Process: Log in to your customer account, navigate to 'Orders', select the item, and click 'Request Return/Exchange'.
• Refunds: For COD orders, refund will be transferred via NEFT/UPI bank transfer to your provided account within 3-5 working days of our inspection team approving the return.`,
    privacyPolicy: `PRYMEWEAR values and respects your personal privacy.

• Information Collected: We collect your name, email, delivery address, and phone number exclusively for order processing, customer support, and shipment updates.
• Zero Third-Party Selling: We never sell, rent, or trade your personal data to external advertisers.
• Secure Encryption: All customer account credentials, passwords, and sessions are encrypted using industry-standard salted hashing and secure tokens.`,
    termsConditions: `By browsing or placing an order on PRYMEWEAR, you agree to our standard terms of service.

• Product Pricing & Availability: All prices are in Indian Rupees (INR) and inclusive of applicable GST. We reserve the right to correct any typographical pricing errors.
• Order Acceptance: Placement of an order represents an offer to purchase. An order is confirmed when approved by our administrative team and an Order Confirmation email is generated.
• Intellectual Property: All PRYMEWEAR designs, logos, product imagery, and text copy are proprietary to PRYMEWEAR.`,
    aboutStory: `Born in Mumbai with global streetwear sensibilities, PRYMEWEAR merges architectural silhouettes, uncompromising heavyweight textiles, and raw brutalist design. Every piece is constructed to withstand everyday urban wear while maintaining a sharp luxury aesthetic.`,
  };

  const initialReviews: Review[] = [
    {
      id: "rev_01",
      productId: "prod_01",
      productName: "PRYME Architectural 500GSM Heavyweight Hoodie",
      userId: "demo_usr_01",
      userName: "Rohan Malhotra",
      rating: 5,
      review: "The 500 GSM weight is unreal. It holds its boxy silhouette perfectly and the double-layered hood stands without slumping. Best luxury hoodie in India hands down.",
      status: "approved",
      isFeatured: true,
      verifiedPurchase: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    },
    {
      id: "rev_02",
      productId: "prod_01",
      productName: "PRYME Architectural 500GSM Heavyweight Hoodie",
      userId: "demo_usr_02",
      userName: "Ananya Deshmukh",
      rating: 5,
      review: "Clean minimal luxury. No annoying logo spam, just premium heavyweight fabric and immaculate stitching. Arrived in 3 days with COD.",
      status: "approved",
      isFeatured: true,
      verifiedPurchase: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    },
    {
      id: "rev_03",
      productId: "prod_02",
      productName: "Acid Wash Distressed Boxy Vintage Tee",
      userId: "demo_usr_03",
      userName: "Vikram Mehta",
      rating: 5,
      review: "The vintage acid wash look is super authentic. Thick collar that doesn't bacon after washes. Fits oversized exactly as pictured.",
      status: "approved",
      isFeatured: true,
      verifiedPurchase: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
  ];

  inMemoryData = {
    users: [],
    admins: initialAdmins,
    categories: initialCategories,
    products: initialProducts,
    orders: [],
    reviews: initialReviews,
    settings: initialSettings,
  };

  saveToDisk(inMemoryData);
  console.log("[PRYMEWEAR DB] Initialized seed data successfully with pre-configured Admin.");
}

export const db = {
  getRawData(): DatabaseSchema {
    if (!inMemoryData) initDatabase();
    return inMemoryData!;
  },

  // USERS
  getUsers(): User[] {
    return this.getRawData().users;
  },
  getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  },
  getUserByEmail(email: string): User | undefined {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  },
  createUser(user: Omit<User, "id" | "createdAt" | "updatedAt">): User {
    const data = this.getRawData();
    const newUser: User = {
      ...user,
      id: "usr_" + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.users.push(newUser);
    saveToDisk(data);
    return newUser;
  },
  updateUser(id: string, updates: Partial<User>): User | undefined {
    const data = this.getRawData();
    const idx = data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    data.users[idx] = {
      ...data.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveToDisk(data);
    return data.users[idx];
  },

  // ADMINS
  getAdmins(): AdminUser[] {
    return this.getRawData().admins;
  },
  getAdminByEmail(email: string): AdminUser | undefined {
    return this.getAdmins().find(a => a.email.toLowerCase() === email.toLowerCase().trim());
  },
  getAdminById(id: string): AdminUser | undefined {
    return this.getAdmins().find(a => a.id === id);
  },

  // PRODUCTS
  getProducts(): Product[] {
    return this.getRawData().products;
  },
  getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id || p.slug === id);
  },
  createProduct(product: Omit<Product, "id" | "createdAt" | "updatedAt">): Product {
    const data = this.getRawData();
    const newProduct: Product = {
      ...product,
      id: "prod_" + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.products.push(newProduct);
    saveToDisk(data);
    return newProduct;
  },
  updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const data = this.getRawData();
    const idx = data.products.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    data.products[idx] = {
      ...data.products[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveToDisk(data);
    return data.products[idx];
  },
  deleteProduct(id: string): boolean {
    const data = this.getRawData();
    const initialLen = data.products.length;
    data.products = data.products.filter(p => p.id !== id);
    if (data.products.length !== initialLen) {
      saveToDisk(data);
      return true;
    }
    return false;
  },
  reduceProductStock(productId: string, quantity: number) {
    const data = this.getRawData();
    const product = data.products.find(p => p.id === productId);
    if (product) {
      product.stockQuantity = Math.max(0, product.stockQuantity - quantity);
      product.updatedAt = new Date().toISOString();
      saveToDisk(data);
    }
  },
  increaseProductStock(productId: string, quantity: number) {
    const data = this.getRawData();
    const product = data.products.find(p => p.id === productId);
    if (product) {
      product.stockQuantity += quantity;
      product.updatedAt = new Date().toISOString();
      saveToDisk(data);
    }
  },

  // CATEGORIES
  getCategories(): Category[] {
    return this.getRawData().categories;
  },
  createCategory(category: Omit<Category, "id">): Category {
    const data = this.getRawData();
    const newCat: Category = {
      ...category,
      id: "cat_" + Math.random().toString(36).substring(2, 10),
    };
    data.categories.push(newCat);
    saveToDisk(data);
    return newCat;
  },
  deleteCategory(id: string): boolean {
    const data = this.getRawData();
    const initialLen = data.categories.length;
    data.categories = data.categories.filter(c => c.id !== id);
    if (data.categories.length !== initialLen) {
      saveToDisk(data);
      return true;
    }
    return false;
  },

  // ORDERS
  getOrders(): Order[] {
    return this.getRawData().orders;
  },
  getOrdersByUserId(userId: string): Order[] {
    return this.getOrders().filter(o => o.userId === userId);
  },
  getOrderById(id: string): Order | undefined {
    return this.getOrders().find(o => o.id === id);
  },
  createOrder(order: Omit<Order, "id" | "createdAt" | "updatedAt">): Order {
    const data = this.getRawData();
    // Unique human-readable luxury order code: e.g. ORD-84920
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const newOrder: Order = {
      ...order,
      id: `ORD-${randomDigits}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.orders.unshift(newOrder); // newest first
    saveToDisk(data);
    return newOrder;
  },
  updateOrder(id: string, updates: Partial<Order>): Order | undefined {
    const data = this.getRawData();
    const idx = data.orders.findIndex(o => o.id === id);
    if (idx === -1) return undefined;
    data.orders[idx] = {
      ...data.orders[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveToDisk(data);
    return data.orders[idx];
  },

  // REVIEWS
  getReviews(): Review[] {
    return this.getRawData().reviews;
  },
  getReviewsByProductId(productId: string): Review[] {
    return this.getReviews().filter(r => r.productId === productId);
  },
  createReview(review: Omit<Review, "id" | "createdAt">): Review {
    const data = this.getRawData();
    const newReview: Review = {
      ...review,
      id: "rev_" + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
    };
    data.reviews.unshift(newReview);

    // Update product rating and review count
    const prodReviews = data.reviews.filter(r => r.productId === review.productId && r.status === "approved");
    const product = data.products.find(p => p.id === review.productId);
    if (product && prodReviews.length > 0) {
      const avg = prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length;
      product.averageRating = Number(avg.toFixed(1));
      product.reviewCount = prodReviews.length;
    }

    saveToDisk(data);
    return newReview;
  },
  updateReview(id: string, updates: Partial<Review>): Review | undefined {
    const data = this.getRawData();
    const idx = data.reviews.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    data.reviews[idx] = { ...data.reviews[idx], ...updates };
    saveToDisk(data);
    return data.reviews[idx];
  },
  deleteReview(id: string): boolean {
    const data = this.getRawData();
    const initialLen = data.reviews.length;
    data.reviews = data.reviews.filter(r => r.id !== id);
    if (data.reviews.length !== initialLen) {
      saveToDisk(data);
      return true;
    }
    return false;
  },

  // SETTINGS
  getSettings(): StoreSettings {
    return this.getRawData().settings;
  },
  updateSettings(updates: Partial<StoreSettings>): StoreSettings {
    const data = this.getRawData();
    data.settings = { ...data.settings, ...updates };
    saveToDisk(data);
    return data.settings;
  },
};
