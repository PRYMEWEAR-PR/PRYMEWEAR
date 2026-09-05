import React from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Product, Category, Review } from "../types";

interface HomePageProps {
  products: Product[];
  categories: Category[];
  reviews: Review[];
  onSelectProduct: (productId: string) => void;
  onNavigate: (view: string, param?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
}) => {
  return (
    <div className="space-y-12 sm:space-y-16 pb-16 pt-8">
      {/* CLEAN LANDING HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-black text-white p-8 sm:p-14 border border-neutral-900 text-center relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <div className="inline-flex items-center space-x-2 text-[10px] font-bold uppercase tracking-[2px] text-neutral-400 bg-neutral-900 px-3 py-1 border border-neutral-800">
              <Sparkles className="w-3 h-3 text-white" />
              <span>OFFICIAL PRYMEWEAR CATALOGUE</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-tight">
              ARCHITECTURAL STREETWEAR
            </h1>

            <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
              Explore our full collection of heavyweight 500 GSM French terry hoodies, boxy oversized tees, and structured garments.
            </p>

            <div className="pt-2 flex justify-center">
              <button
                onClick={() => onNavigate("shop")}
                id="home-shop-collection-btn"
                className="px-10 py-4 bg-white text-black text-xs font-bold uppercase tracking-[2px] hover:bg-neutral-200 transition-colors flex items-center space-x-2 cursor-pointer shadow-lg group"
              >
                <span>Shop Collection</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-center space-x-6 pt-4 text-neutral-400 text-[11px] uppercase tracking-[1px] font-medium">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>Cash on Delivery</span>
              </div>
              <span>•</span>
              <div>Free Shipping Over ₹1,999</div>
            </div>
          </div>
        </div>
      </section>

      {/* PROMOTIONAL COUPON BANNER */}
      <section className="bg-black text-white py-8 sm:py-10 relative overflow-hidden border-y border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex justify-center">
          <div className="w-full max-w-md p-5 bg-neutral-900 border border-neutral-800 text-center space-y-1">
            <p className="text-sm text-white font-bold uppercase tracking-[1.5px]">
              USE CODE: PRYME20
            </p>
            <p className="text-xs text-neutral-400">
              Get 20% Instant Discount on First COD Order
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

