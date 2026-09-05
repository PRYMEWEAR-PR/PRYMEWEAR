import React from "react";
import { ShieldCheck, Truck, RotateCcw, FileText, Building2 } from "lucide-react";

interface PolicyPageProps {
  policyKey: "shipping" | "returns" | "privacy" | "terms" | "about";
  onNavigateToShop: () => void;
}

export const PolicyPage: React.FC<PolicyPageProps> = ({ policyKey, onNavigateToShop }) => {
  const renderContent = () => {
    switch (policyKey) {
      case "shipping":
        return (
          <div className="space-y-6 text-gray-700 leading-relaxed text-xs sm:text-sm">
            <div className="flex items-center space-x-2 text-black mb-4">
              <Truck className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-wider font-mono">
                Shipping & Delivery Policy
              </h2>
            </div>
            <p>
              At PRYMEWEAR, every order is processed and packed with utmost architectural precision from our central fulfillment hub in Mumbai, India.
            </p>
            <h3 className="text-sm font-bold uppercase text-black pt-2">1. Dispatch & Delivery Timelines</h3>
            <p>
              All orders are dispatched within 24 to 48 hours of order confirmation. Delivery timelines vary by location:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Metro Cities (Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai): 2 to 3 Business Days</li>
              <li>Tier-2 & Regional Towns: 3 to 5 Business Days</li>
              <li>North-East & Remote Locations: 5 to 7 Business Days</li>
            </ul>
            <h3 className="text-sm font-bold uppercase text-black pt-2">2. Shipping Charges</h3>
            <p>
              We offer <strong>Free Standard Shipping</strong> on all domestic orders valued above <strong>₹1,999</strong>. For orders below ₹1,999, a flat nominal handling fee of ₹99 is applied at checkout.
            </p>
            <h3 className="text-sm font-bold uppercase text-black pt-2">3. Cash on Delivery (COD)</h3>
            <p>
              Cash on Delivery is available across 25,000+ PIN codes in India. Please ensure the exact cash amount or active UPI scanning capability is ready upon doorstep arrival of our courier executive.
            </p>
          </div>
        );

      case "returns":
        return (
          <div className="space-y-6 text-gray-700 leading-relaxed text-xs sm:text-sm">
            <div className="flex items-center space-x-2 text-black mb-4">
              <RotateCcw className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-wider font-mono">
                7-Day Return & Size Exchange Policy
              </h2>
            </div>
            <p>
              We stand behind the engineering of every PRYMEWEAR garment. If the fit or silhouette is not what you anticipated, you can request an easy exchange or return within <strong>7 days</strong> of delivery.
            </p>
            <h3 className="text-sm font-bold uppercase text-black pt-2">1. Conditions for Return</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>The garment must be unused, unwashed, and in its original pristine condition.</li>
              <li>Original tags, polybags, and branding labels must remain attached.</li>
              <li>Free reverse pickup will be scheduled directly from your delivery address.</li>
            </ul>
            <h3 className="text-sm font-bold uppercase text-black pt-2">2. Refunds on COD Orders</h3>
            <p>
              For Cash on Delivery orders, once the returned piece is inspected at our studio, refunds are credited directly to your preferred Bank Account / UPI ID within 24 to 48 business hours.
            </p>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6 text-gray-700 leading-relaxed text-xs sm:text-sm">
            <div className="flex items-center space-x-2 text-black mb-4">
              <ShieldCheck className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-wider font-mono">
                Privacy & Data Security Policy
              </h2>
            </div>
            <p>
              PRYMEWEAR respects and guards your personal data. We only collect information essential for fulfilling your orders, verifying Cash on Delivery logistics, and enhancing your browsing experience.
            </p>
            <h3 className="text-sm font-bold uppercase text-black pt-2">1. Information We Collect</h3>
            <p>
              When you register or place an order, we collect your name, shipping address, mobile contact number, and email address. We do not store sensitive payment card information on our servers.
            </p>
            <h3 className="text-sm font-bold uppercase text-black pt-2">2. Data Security</h3>
            <p>
              All customer sessions and passwords are encrypted using industry-standard bcrypt hashing and JSON Web Tokens.
            </p>
          </div>
        );

      case "terms":
        return (
          <div className="space-y-6 text-gray-700 leading-relaxed text-xs sm:text-sm">
            <div className="flex items-center space-x-2 text-black mb-4">
              <FileText className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-wider font-mono">
                Terms & Conditions of Sale
              </h2>
            </div>
            <p>
              By accessing the PRYMEWEAR platform, creating an account, or placing an order, you agree to comply with our terms of service.
            </p>
            <h3 className="text-sm font-bold uppercase text-black pt-2">1. Product Authenticity & Sizing</h3>
            <p>
              All garments displayed on prymewear.com are authentic, original designs manufactured under proprietary specifications. Please refer to our detailed sizing charts before placing orders.
            </p>
            <h3 className="text-sm font-bold uppercase text-black pt-2">2. Order Acceptance</h3>
            <p>
              PRYMEWEAR reserves the right to cancel or refuse any order in cases of stock unavailability, pricing typographical errors, or unverified COD contact details.
            </p>
          </div>
        );

      case "about":
      default:
        return (
          <div className="space-y-6 text-gray-700 leading-relaxed text-xs sm:text-sm">
            <div className="flex items-center space-x-2 text-black mb-4">
              <Building2 className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-wider font-mono">
                The PRYMEWEAR Philosophy
              </h2>
            </div>
            <p className="text-base text-black font-medium leading-relaxed">
              Born at the intersection of architectural geometry and heavyweight luxury textiles, PRYMEWEAR represents a refusal to compromise on fabric density and construction integrity.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
              <div className="p-4 bg-gray-50 border border-gray-200">
                <h4 className="font-bold text-black uppercase mb-1">500 GSM Fleece</h4>
                <p className="text-xs text-gray-500">
                  Custom knitted French terry providing unmatched structure and drape.
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200">
                <h4 className="font-bold text-black uppercase mb-1">Architectural Fit</h4>
                <p className="text-xs text-gray-500">
                  Boxy drop-shoulder silhouettes designed for dynamic modern movement.
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200">
                <h4 className="font-bold text-black uppercase mb-1">Doorstep COD</h4>
                <p className="text-xs text-gray-500">
                  Trust-first logistics covering all major pin codes across the nation.
                </p>
              </div>
            </div>
            <p>
              Our flagship studio and design team work out of Mumbai, ensuring rigorous quality checks from the first yarn selection to the final package sealing.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white border border-gray-200 p-8 sm:p-12 shadow-xs">
        {renderContent()}

        <div className="mt-10 pt-8 border-t border-gray-200 flex justify-between items-center">
          <span className="text-xs text-gray-400">PRYMEWEAR Customer Support: thekartikbusiness@gmail.com</span>
          <button
            onClick={onNavigateToShop}
            className="px-6 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800"
          >
            Explore Collection
          </button>
        </div>
      </div>
    </div>
  );
};
