import React, { useState } from "react";
import { Star, ShoppingBag, Check } from "lucide-react";
import { Product } from "../types";
import { useCart } from "../context/CartContext";

interface ProductCardProps {
  product: Product;
  onSelectProduct: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
}) => {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [isHovered, setIsHovered] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const discountPercent =
    product.discountPrice && product.discountPrice < product.price
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : 0;

  const currentPrice = product.discountPrice || product.price;
  const isOutOfStock = product.stockQuantity <= 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (!selectedSize) {
      onSelectProduct(product.id);
      return;
    }
    addToCart(product, selectedSize, product.colors[0] || "Default", 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const primaryImage = product.images[0] || "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80";
  const hoverImage = product.images[1] || primaryImage;

  return (
    <div
      onClick={() => onSelectProduct(product.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group cursor-pointer flex flex-col bg-white border border-[#eeeeee] hover:border-black transition-colors duration-200 relative text-left"
      id={`product-card-${product.id}`}
    >
      {/* Minimalist Badges */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 pointer-events-none">
        {discountPercent > 0 && (
          <span className="bg-black text-white text-[9px] font-bold uppercase px-2 py-0.5 tracking-[1px]">
            {discountPercent}% OFF
          </span>
        )}
        {product.isBestSeller && (
          <span className="bg-black text-white text-[9px] font-bold uppercase px-2 py-0.5 tracking-[1px]">
            BESTSELLER
          </span>
        )}
        {product.isNewArrival && !product.isBestSeller && (
          <span className="bg-white text-black text-[9px] font-bold uppercase px-2 py-0.5 tracking-[1px] border border-black">
            NEW DROP
          </span>
        )}
      </div>

      {/* Product Image Container */}
      <div className="relative aspect-3/4 w-full overflow-hidden bg-[#f5f5f5]">
        <img
          src={isHovered ? hoverImage : primaryImage}
          alt={product.name}
          className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-103"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-black text-white text-[11px] font-bold uppercase tracking-[1px] px-3 py-1.5">
              Sold Out
            </span>
          </div>
        )}

        {/* Quick Add Overlay on Desktop Hover */}
        {!isOutOfStock && (
          <div
            className={`hidden md:flex absolute bottom-0 inset-x-0 bg-white/95 p-2.5 transition-transform duration-150 ${
              isHovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
            } flex-col gap-2 border-t border-[#eeeeee]`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Size Pills */}
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {product.availableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`text-[10px] font-bold px-2 py-1 transition-colors ${
                    selectedSize === size
                      ? "bg-black text-white"
                      : "bg-[#f5f5f5] text-black hover:bg-[#e5e5e5]"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleQuickAdd}
              className="w-full py-2 bg-black text-white text-[11px] font-bold uppercase tracking-[1px] hover:bg-[#222222] transition-colors flex items-center justify-center space-x-1.5"
            >
              {justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Added to Bag</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{selectedSize ? `Quick Add (${selectedSize})` : "Select Size & Buy"}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3.5 flex flex-col flex-1 justify-between bg-white">
        <div>
          <div className="flex items-center justify-between text-[11px] text-[#666666] uppercase tracking-[1px] mb-1">
            <span>{product.category}</span>
            <div className="flex items-center space-x-1 text-black font-medium">
              <Star className="w-3 h-3 fill-black text-black" />
              <span>{product.averageRating || 5.0}</span>
            </div>
          </div>

          <h3 className="text-[13px] font-[600] text-black uppercase tracking-[0.5px] leading-snug line-clamp-1 mb-1.5">
            {product.name}
          </h3>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline space-x-2 pt-2 border-t border-[#eeeeee]">
          <span className="text-[13px] font-bold text-black">
            ₹{currentPrice.toLocaleString("en-IN")}
          </span>
          {product.discountPrice && product.discountPrice < product.price && (
            <span className="text-[12px] text-[#666666] line-through">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
