import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { auth, googleProvider, db as firestore } from "./firebase";
import { User, Order, Product, Review, StoreSettings, AdminUser, Address } from "../types";

export { auth, firestore };

// =========================================================
// 1. FIREBASE AUTHENTICATION (Google, Email/Password, Reset)
// =========================================================

/**
 * Sign In with Google Popup (Firebase Auth)
 */
export async function signInWithGoogle(): Promise<{ user: User; token: string }> {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;
  const token = await fbUser.getIdToken();

  // Check or create user doc in Firestore
  const userDocRef = doc(firestore, "users", fbUser.uid);
  const userDocSnap = await getDoc(userDocRef);

  let appUser: User;
  if (!userDocSnap.exists()) {
    appUser = {
      id: fbUser.uid,
      name: fbUser.displayName || "PRYME Member",
      email: fbUser.email || "",
      mobile: fbUser.phoneNumber || "",
      role: "customer",
      savedAddresses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(userDocRef, {
      ...appUser,
      firebaseUid: fbUser.uid,
      updatedAt: serverTimestamp()
    });
  } else {
    appUser = userDocSnap.data() as User;
    // ensure id is set
    appUser.id = fbUser.uid;
  }

  // Also sync with server session
  try {
    await fetch("/api/auth/firebase-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: appUser, token })
    });
  } catch (e) {
    // Non-blocking fallback
  }

  return { user: appUser, token };
}

/**
 * Register with Email & Password in Firebase
 */
export async function registerWithFirebase(name: string, email: string, mobile: string, pass: string): Promise<{ user: User; token: string }> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  const fbUser = cred.user;
  const token = await fbUser.getIdToken();

  const appUser: User = {
    id: fbUser.uid,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    mobile: mobile ? mobile.trim() : "",
    role: "customer",
    savedAddresses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const userDocRef = doc(firestore, "users", fbUser.uid);
  await setDoc(userDocRef, {
    ...appUser,
    firebaseUid: fbUser.uid,
    updatedAt: serverTimestamp()
  });

  return { user: appUser, token };
}

/**
 * Login with Email & Password in Firebase
 */
export async function loginWithFirebase(email: string, pass: string): Promise<{ user: User; token: string }> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  const fbUser = cred.user;
  const token = await fbUser.getIdToken();

  const userDocRef = doc(firestore, "users", fbUser.uid);
  const userDocSnap = await getDoc(userDocRef);

  let appUser: User;
  if (userDocSnap.exists()) {
    appUser = userDocSnap.data() as User;
    appUser.id = fbUser.uid;
  } else {
    appUser = {
      id: fbUser.uid,
      name: fbUser.displayName || email.split("@")[0],
      email: fbUser.email || email,
      mobile: "",
      role: "customer",
      savedAddresses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(userDocRef, appUser);
  }

  return { user: appUser, token };
}

/**
 * Send Firebase Password Reset Email
 */
export async function resetPasswordFirebase(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Sign Out from Firebase
 */
export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

// =========================================================
// 2. FIRESTORE DATABASE REPOSITORIES & SYNC (Products, Orders, Reviews)
// =========================================================

/**
 * Sync / Save Order into Firestore
 */
export async function saveOrderToFirestore(order: Order): Promise<void> {
  try {
    const orderRef = doc(firestore, "orders", order.id);
    const currentFbUser = auth.currentUser;
    const firebaseUid = currentFbUser ? currentFbUser.uid : (order.userId || "guest");

    await setDoc(orderRef, {
      ...order,
      firebaseUid,
      syncedToFirebaseAt: serverTimestamp(),
      createdAtTimestamp: serverTimestamp()
    }, { merge: true });

    // Sync address & order summary to user's Firestore document
    const effectiveUserId = currentFbUser ? currentFbUser.uid : order.userId;
    if (effectiveUserId && effectiveUserId !== "guest") {
      const userDocRef = doc(firestore, "users", effectiveUserId);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        const existingAddresses = uData.savedAddresses || [];
        const addressExists = existingAddresses.some(
          (a: any) =>
            a.addressLine === order.shippingAddress.addressLine &&
            a.pincode === order.shippingAddress.pincode
        );
        await updateDoc(userDocRef, {
          savedAddresses: addressExists ? existingAddresses : [...existingAddresses, order.shippingAddress],
          lastOrderPlacedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(userDocRef, {
          id: effectiveUserId,
          name: order.customerName,
          email: order.customerEmail,
          mobile: order.customerMobile,
          role: "customer",
          savedAddresses: [order.shippingAddress],
          createdAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    }
  } catch (err) {
    console.warn("Firestore order sync warning:", err);
  }
}

/**
 * Fetch Customer Orders from Firestore by Email or User ID
 */
export async function getFirestoreOrdersForUser(email: string, userId?: string): Promise<Order[]> {
  try {
    const ordersMap = new Map<string, Order>();

    if (userId) {
      const qUser = query(collection(firestore, "orders"), where("userId", "==", userId));
      const snapUser = await getDocs(qUser);
      snapUser.forEach((d) => {
        ordersMap.set(d.id, d.data() as Order);
      });
    }

    if (email) {
      const qEmail = query(collection(firestore, "orders"), where("customerEmail", "==", email.toLowerCase().trim()));
      const snapEmail = await getDocs(qEmail);
      snapEmail.forEach((d) => {
        ordersMap.set(d.id, d.data() as Order);
      });
    }

    return Array.from(ordersMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.warn("Firestore user orders fetch error:", err);
    return [];
  }
}

/**
 * Fetch a Single Order by Order ID from Firestore
 */
export async function getFirestoreOrder(orderId: string): Promise<Order | null> {
  try {
    const cleanId = orderId.trim();
    if (!cleanId) return null;
    const orderDocRef = doc(firestore, "orders", cleanId);
    const snap = await getDoc(orderDocRef);
    if (snap.exists()) {
      return snap.data() as Order;
    }
    return null;
  } catch (err) {
    console.warn("Firestore get order error:", err);
    return null;
  }
}

/**
 * Subscribe to Real-Time Updates for an Order in Firestore
 */
export function subscribeToFirestoreOrder(
  orderId: string,
  onUpdate: (order: Order | null) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const cleanId = orderId.trim();
  const orderDocRef = doc(firestore, "orders", cleanId);
  
  return onSnapshot(
    orderDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as Order);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn("Firestore order subscription error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch All Orders from Firestore for Admin
 */
export async function getFirestoreOrders(): Promise<Order[]> {
  try {
    const q = query(collection(firestore, "orders"));
    const snap = await getDocs(q);
    const orders: Order[] = [];
    snap.forEach((docSnap) => {
      orders.push(docSnap.data() as Order);
    });
    return orders;
  } catch (err) {
    console.warn("Firestore get orders error:", err);
    return [];
  }
}

/**
 * Save / Update Product into Firestore
 */
export async function saveProductToFirestore(product: Product): Promise<void> {
  try {
    const prodRef = doc(firestore, "products", product.id);
    await setDoc(prodRef, {
      ...product,
      syncedToFirebaseAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("Firestore product sync error:", err);
  }
}

/**
 * Delete Product from Firestore
 */
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  try {
    const prodRef = doc(firestore, "products", productId);
    await deleteDoc(prodRef);
  } catch (err) {
    console.warn("Firestore delete product error:", err);
  }
}

/**
 * Save Review to Firestore
 */
export async function saveReviewToFirestore(review: Review): Promise<void> {
  try {
    const revRef = doc(firestore, "reviews", review.id);
    await setDoc(revRef, {
      ...review,
      syncedToFirebaseAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("Firestore review save error:", err);
  }
}

/**
 * Save Store Settings to Firestore
 */
export async function updateUserSavedAddressInFirestore(uid: string, addresses: Address[]): Promise<void> {
  try {
    const userRef = doc(firestore, "users", uid);
    await setDoc(userRef, {
      savedAddresses: addresses,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("Firestore user address sync error:", err);
  }
}

export async function saveSettingsToFirestore(settings: StoreSettings): Promise<void> {
  try {
    const settingsRef = doc(firestore, "settings", "store_config");
    await setDoc(settingsRef, {
      ...settings,
      syncedToFirebaseAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("Firestore settings save error:", err);
  }
}

/**
 * Get Store Settings from Firestore
 */
export async function getFirestoreSettings(): Promise<StoreSettings | null> {
  try {
    const settingsRef = doc(firestore, "settings", "store_config");
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return snap.data() as StoreSettings;
    }
    return null;
  } catch (err) {
    console.warn("Firestore get settings error:", err);
    return null;
  }
}

