import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { db } from "./db.ts";

const JWT_SECRET = process.env.JWT_SECRET || "prymewear-super-secret-jwt-key-2026-luxury-streetwear";

export interface TokenPayload {
  id: string;
  email: string;
  role: "customer" | "admin";
  name?: string;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): TokenPayload | null {
  if (!token || typeof token !== "string") return null;

  // 1. Try standard server-signed JWT
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (payload && payload.id) {
      return payload;
    }
  } catch (error) {
    // Continue to fallback token decoders
  }

  // 2. Decode Firebase or external OAuth token
  try {
    const decoded: any = jwt.decode(token);
    if (decoded && (decoded.sub || decoded.user_id || decoded.email || decoded.uid)) {
      // Check expiration if present
      if (decoded.exp && typeof decoded.exp === "number") {
        const currentTime = Math.floor(Date.now() / 1000);
        // Allow a 5-minute clock drift buffer
        if (decoded.exp + 300 < currentTime) {
          console.warn("[Auth] Token expired:", { exp: decoded.exp, now: currentTime });
          return null;
        }
      }

      const email = (decoded.email || "").toLowerCase().trim();
      const name = decoded.name || decoded.displayName || (email ? email.split("@")[0] : "Customer");
      const id = decoded.user_id || decoded.sub || decoded.uid || (email ? "usr_" + email.replace(/[^a-zA-Z0-9]/g, "_") : "usr_guest");
      const role = (decoded.role === "admin" || email === "thekartikbusiness@gmail.com") ? "admin" : "customer";

      // Ensure user exists in our local db
      if (email) {
        let user = db.getUserByEmail(email);
        if (!user) {
          user = db.createUser({
            name,
            email,
            mobile: decoded.phone_number || "",
            passwordHash: "firebase_authenticated_session",
            role: role as any,
            savedAddresses: [],
          });
        }
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        };
      }

      return {
        id,
        email: email || "customer@prymewear.store",
        role: role as any,
        name,
      };
    }
  } catch (decodeErr) {
    console.warn("[Auth] Failed to decode token:", decodeErr);
  }

  return null;
}

export function authenticateCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authorization token required. Please log in." });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ success: false, message: "Invalid or expired session. Please log in again." });
  }

  req.user = payload;
  next();
}

export function optionalCustomerAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (token && token !== "null" && token !== "undefined" && token !== "Bearer") {
      const payload = verifyToken(token);
      if (payload) {
        req.user = payload;
      } else {
        try {
          const decoded: any = jwt.decode(token);
          if (decoded && (decoded.email || decoded.sub || decoded.user_id || decoded.uid || decoded.id)) {
            const email = (decoded.email || "").toLowerCase().trim();
            const id = decoded.user_id || decoded.sub || decoded.uid || decoded.id || (email ? "usr_" + email.replace(/[^a-zA-Z0-9]/g, "_") : "usr_guest");
            if (email) {
              const user = db.getUserByEmail(email);
              if (user) {
                req.user = {
                  id: user.id,
                  email: user.email,
                  role: user.role,
                  name: user.name,
                };
              } else {
                req.user = {
                  id,
                  email,
                  role: "customer",
                  name: decoded.name || email.split("@")[0],
                };
              }
            } else if (id) {
              req.user = {
                id,
                email: "customer@prymewear.store",
                role: "customer",
                name: "Customer",
              };
            }
          }
        } catch (e) {}
      }
    }
  }
  next();
}

export function authenticateAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Admin authorization token required." });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload || payload.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied. Administrator privileges required." });
  }

  req.user = payload;
  next();
}
