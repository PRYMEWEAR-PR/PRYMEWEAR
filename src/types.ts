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
  role: "customer" | "admin";
  savedAddresses: Address[];
  createdAt: string;
  updatedAt?: string;
  firebaseUid?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
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

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  discountPrice: number;
  quantity: number;
  stockQuantity: number;
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

export interface OrderStatusHistoryItem {
  status: string;
  timestamp: string;
  note?: string;
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
  statusHistory: OrderStatusHistoryItem[];
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
  announcementText?: string;
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

export type Customer = User;

export interface EmailLogEntry {
  id: string;
  orderId: string;
  toEmail: string;
  template: "order_placed" | "order_confirmed" | "order_shipped" | "order_delivered" | "order_cancelled";
  subject: string;
  htmlContent: string;
  sentStatus: "sent" | "logged" | "failed";
  error?: string;
  sentAt: string;
}
