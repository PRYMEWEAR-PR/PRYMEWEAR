import React, { useState } from "react";
import {
  Instagram,
  Twitter,
  Facebook,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { StoreSettings } from "../types";

interface FooterProps {
  settings?: StoreSettings | null;
  onNavigatePolicy: (policyKey: string) => void;
  onNavigate: (view: string, param?: string) => void;
  onOpenTrackOrder?: (orderId?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onNavigatePolicy,
  onNavigate,
  onOpenTrackOrder,
}) => {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail && newsletterEmail.includes("@")) {
      setIsSubscribed(true);
      setNewsletterEmail("");
    }
  };

  const storeName = settings?.storeName || "PRYMEWEAR";
  const supportEmail = settings?.supportEmail || "thekartikbusiness@gmail.com";
  const supportPhone = settings?.supportPhone || "+91 9211597397";
  const storeAddress = settings?.storeAddress || "RZ 57, Shyam Vihar, Najafgarh, Delhi 110043";

  return (
    <footer className="bg-black text-white pt-14 pb-10 border-t border-[#222222]">
      {/* Brand Pillars Value Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 border-b border-[#222222]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#111111] border border-[#222222]">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[1px] text-white">
                Express Shipping
              </h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Free nationwide over ₹1,999
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#111111] border border-[#222222]">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[1px] text-white">
                Cash On Delivery (COD)
              </h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Pay in cash/UPI upon arrival
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#111111] border border-[#222222]">
              <RotateCcw className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[1px] text-white">
                7-Day Easy Returns
              </h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Hassle-free size exchange
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#111111] border border-[#222222]">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[1px] text-white">
                500 GSM Quality
              </h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Heavyweight French terry
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-3.5">
            <span className="text-xl font-black tracking-[3px] uppercase text-white block">
              {storeName}
            </span>
            <p className="text-[12px] text-neutral-400 leading-relaxed max-w-sm">
              {settings?.tagline || "Engineered Streetwear & Minimal Luxury."} Modern luxury silhouettes, 500 GSM loopback cotton fleece, and precision tailoring manufactured for everyday urban wear.
            </p>
            <div className="text-[11px] text-neutral-400 space-y-1 pt-1">
              <p>📍 {storeAddress}</p>
              <p>✉️ {supportEmail}</p>
              <p>📞 {supportPhone}</p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <a
                href={settings?.instagramUrl || "https://instagram.com"}
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 bg-[#111111] border border-[#222222] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>
              <a
                href={settings?.twitterUrl || "https://twitter.com"}
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 bg-[#111111] border border-[#222222] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-3.5 h-3.5" />
              </a>
              <a
                href={settings?.facebookUrl || "https://facebook.com"}
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 bg-[#111111] border border-[#222222] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Shop Links */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[1.5px] text-white mb-3.5">
              Quick Links
            </h4>
            <ul className="space-y-2 text-[12px] text-neutral-400">
              <li>
                <button
                  onClick={() => onNavigate("shop")}
                  className="hover:text-white transition-colors"
                >
                  Shop Collection
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("contact")}
                  className="hover:text-white transition-colors"
                >
                  Contact & Store
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Service & Policies */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[1.5px] text-white mb-3.5">
              Client Service
            </h4>
            <ul className="space-y-2 text-[12px] text-neutral-400">
              <li>
                <button
                  onClick={() => onOpenTrackOrder ? onOpenTrackOrder() : onNavigate("account", "orders")}
                  className="hover:text-white transition-colors flex items-center space-x-1"
                >
                  <span>Track Order Status</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigatePolicy("shipping")}
                  className="hover:text-white transition-colors"
                >
                  Shipping Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigatePolicy("returns")}
                  className="hover:text-white transition-colors"
                >
                  Returns & Refunds
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigatePolicy("privacy")}
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigatePolicy("terms")}
                  className="hover:text-white transition-colors"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigatePolicy("about")}
                  className="hover:text-white transition-colors"
                >
                  About PRYMEWEAR
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter Box */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[1.5px] text-white mb-3.5">
              Newsletter
            </h4>
            <p className="text-[12px] text-neutral-400 mb-3 leading-relaxed">
              Get private release drop access and 10% off your next streetwear purchase.
            </p>
            {isSubscribed ? (
              <div className="flex items-center space-x-2 text-[11px] text-white bg-[#111111] border border-[#222222] p-3">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>You are on the VIP drop list.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
                  <input
                    type="email"
                    placeholder="ENTER YOUR EMAIL"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    required
                    className="w-full pl-8 pr-3 py-2 bg-[#111111] border border-[#222222] text-[11px] text-white placeholder-neutral-500 focus:outline-hidden focus:border-white transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-white text-black text-[11px] font-bold uppercase tracking-[1px] hover:bg-[#f5f5f5] transition-colors"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Copyright & Admin quick link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 border-t border-[#222222] flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500">
        <p>© {new Date().getFullYear()} {storeName} STUDIO. ALL RIGHTS RESERVED.</p>
        <div className="flex items-center space-x-4 mt-3 sm:mt-0">
          <span>SECURE COD VERIFICATION</span>
          <span>•</span>
          <button
            onClick={() => onNavigate("admin")}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            Admin Panel Login →
          </button>
        </div>
      </div>
    </footer>
  );
};
