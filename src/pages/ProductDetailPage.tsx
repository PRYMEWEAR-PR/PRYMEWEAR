import React, { useState } from "react";
import {
  Star,
  ShoppingBag,
  Zap,
  Truck,
  ShieldCheck,
  RotateCcw,
  Check,
  AlertTriangle,
  Send,
  ArrowLeft,
  Ruler,
  X,
} from "lucide-react";
import { Product, Review } from "../types";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { saveReviewToFirestore } from "../lib/firebaseServices";

interface ProductDetailPageProps {
  product: Product;
  reviews: Review[];
  onBack: () => void;
  onNavigateToCheckout: () => void;
  onRefreshProduct: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  reviews,
  onBack,
  onNavigateToCheckout,
  onRefreshProduct,
}) => {
  const { addToCart } = useCart();
  const { user, openAuthModal, token } = useAuth();

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Review Form state
  const [newRating, setNewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState("");

  const discountPercent =
    product.discountPrice && product.discountPrice < product.price
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : 0;

  const currentPrice = product.discountPrice || product.price;
  const isOutOfStock = product.stockQuantity <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    if (product.colors && product.colors.length > 0 && !selectedColor) {
      setSelectionError("Please select a colorway before adding to bag.");
      return;
    }
    if (product.availableSizes && product.availableSizes.length > 0 && !selectedSize) {
      setSelectionError("Please select a size before adding to bag.");
      return;
    }

    setSelectionError("");
    addToCart(product, selectedSize, selectedColor, quantity);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;

    if (product.colors && product.colors.length > 0 && !selectedColor) {
      setSelectionError("Please select a colorway before proceeding.");
      return;
    }
    if (product.availableSizes && product.availableSizes.length > 0 && !selectedSize) {
      setSelectionError("Please select a size before proceeding.");
      return;
    }

    setSelectionError("");
    addToCart(product, selectedSize, selectedColor, quantity);
    onNavigateToCheckout();
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      openAuthModal("login");
      return;
    }
    if (!newReviewText.trim()) return;

    setIsSubmittingReview(true);
    setReviewMsg("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          rating: newRating,
          review: newReviewText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.review) {
          saveReviewToFirestore(data.review).catch((e) => console.warn("Firestore review sync:", e));
        }
        setReviewMsg("Thank you! Your review has been submitted and posted.");
        setNewReviewText("");
        onRefreshProduct();
      } else {
        setReviewMsg(data.message || "Failed to submit review");
      }
    } catch (err: any) {
      setReviewMsg(err.message || "Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const activeImage = product.images[selectedImageIdx] || product.images[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back navigation button */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-[1px] text-[#666666] hover:text-black mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Collection</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Image Gallery */}
        <div className="lg:col-span-7 space-y-3">
          <div className="aspect-3/4 w-full bg-[#f5f5f5] overflow-hidden border border-[#eeeeee] relative">
            <img
              src={activeImage}
              alt={product.name}
              className="w-full h-full object-cover object-top"
              referrerPolicy="no-referrer"
            />
            {discountPercent > 0 && (
              <span className="absolute top-3 left-3 bg-black text-white text-[10px] font-bold uppercase px-2.5 py-0.5 tracking-[1px]">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex space-x-2.5 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`w-18 h-22 flex-shrink-0 border overflow-hidden bg-[#f5f5f5] transition-colors ${
                    selectedImageIdx === idx ? "border-black" : "border-[#eeeeee] opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    className="w-full h-full object-cover object-top"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Product Details & Action Pane */}
        <div className="lg:col-span-5 space-y-5">
          <div>
            <div className="flex items-center justify-between text-[11px] text-[#666666] uppercase tracking-[1px] mb-1">
              <span>{product.category}</span>
              <span className="text-[#999999]">SKU: {product.sku}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-black leading-snug">
              {product.name}
            </h1>

            {/* Ratings */}
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center text-black">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(product.averageRating || 5)
                        ? "fill-black text-black"
                        : "text-[#dddddd]"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[12px] font-bold text-black">{product.averageRating || 5.0}</span>
              <span className="text-[11px] text-[#666666]">({product.reviewCount || reviews.length} reviews)</span>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline space-x-3 pb-4 border-b border-[#eeeeee]">
            <span className="text-2xl font-bold text-black">
              ₹{currentPrice.toLocaleString("en-IN")}
            </span>
            {product.discountPrice && product.discountPrice < product.price && (
              <>
                <span className="text-sm text-[#666666] line-through">
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] font-bold text-black bg-[#f5f5f5] px-2 py-0.5 border border-[#eeeeee] uppercase tracking-[0.5px]">
                  Save ₹{(product.price - product.discountPrice).toLocaleString("en-IN")}
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-[12px] sm:text-[13px] text-[#444444] leading-relaxed">
            {product.description}
          </p>

          {/* Stock Indicator */}
          <div>
            {isOutOfStock ? (
              <div className="flex items-center space-x-2 text-black text-[11px] font-bold bg-[#f5f5f5] p-2.5 border border-black uppercase tracking-[0.5px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Currently Out of Stock. Join waitlist.</span>
              </div>
            ) : product.stockQuantity <= 5 ? (
              <div className="flex items-center space-x-2 text-black text-[11px] font-bold bg-[#f5f5f5] p-2.5 border border-[#eeeeee] uppercase tracking-[0.5px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Low Stock: Only {product.stockQuantity} pieces left in warehouse.</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-black text-[11px] font-bold bg-[#f5f5f5] p-2 border border-[#eeeeee] uppercase tracking-[0.5px]">
                <Check className="w-3.5 h-3.5" />
                <span>In Stock — Ready for Same-Day Dispatch</span>
              </div>
            )}
          </div>

          {/* Selection Error Alert */}
          {selectionError && (
            <div className="bg-red-50 border border-red-500 text-red-700 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.5px] flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{selectionError}</span>
            </div>
          )}

          {/* Color Selector */}
          {product.colors && product.colors.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[1px] text-black">
                  Colorway: {selectedColor ? (
                    <span className="font-semibold text-black">{selectedColor}</span>
                  ) : (
                    <span className="text-red-600 font-bold ml-1">(Please Select Color)</span>
                  )}
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedColor(c);
                      setSelectionError("");
                    }}
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.5px] transition-colors border ${
                      selectedColor === c
                        ? "bg-black text-white border-black"
                        : "bg-[#f5f5f5] text-black border-transparent hover:border-black"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selector & Size Guide */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[1px] text-black">
                Select Size: {selectedSize ? (
                  <span className="font-semibold text-black">{selectedSize}</span>
                ) : (
                  <span className="text-red-600 font-bold ml-1">(Please Select Size)</span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="text-[10px] font-bold text-[#666666] hover:text-black uppercase tracking-[1px] flex items-center space-x-1 underline"
              >
                <Ruler className="w-3 h-3" />
                <span>Size Guide</span>
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {product.availableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setSelectedSize(size);
                    setSelectionError("");
                  }}
                  className={`py-2 text-[11px] font-bold uppercase tracking-[0.5px] transition-colors border ${
                    selectedSize === size
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-[#eeeeee] hover:border-black"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity and Actions */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center space-x-3">
              <div className="flex items-center border border-[#eeeeee] bg-[#f5f5f5]">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-xs font-bold text-black hover:bg-[#e5e5e5]"
                >
                  -
                </button>
                <span className="px-3 py-2 text-xs font-bold text-black min-w-[28px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                  disabled={quantity >= product.stockQuantity}
                  className="px-3 py-2 text-xs font-bold text-black hover:bg-[#e5e5e5] disabled:opacity-30"
                >
                  +
                </button>
              </div>

              {/* Add to Bag Button */}
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="flex-1 py-3 bg-black text-white text-[11px] font-bold uppercase tracking-[1.5px] hover:bg-[#222222] transition-colors flex items-center justify-center space-x-2 disabled:opacity-40"
                id="pdp-add-to-cart-btn"
              >
                {addedAnimation ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Added to Bag!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add to Bag</span>
                  </>
                )}
              </button>
            </div>

            {/* Buy Now Button (Instant Checkout) */}
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleBuyNow}
              className="w-full py-3 bg-[#111111] text-white text-[11px] font-bold uppercase tracking-[1.5px] hover:bg-black transition-colors flex items-center justify-center space-x-2 disabled:opacity-40 border border-[#333333]"
              id="pdp-buy-now-btn"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Buy Now</span>
            </button>
          </div>

          {/* Assurances */}
          <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-[#eeeeee] text-[11px] text-[#666666]">
            <div className="flex items-center space-x-2">
              <Truck className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span>Free delivery over ₹1,999</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span>COD available nationwide</span>
            </div>
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span>7-Day easy size exchange</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span>100% Genuine Milled Cotton</span>
            </div>
          </div>
        </div>
      </div>

      {/* REVIEWS & RATINGS SECTION */}
      <section className="mt-16 pt-10 border-t border-[#eeeeee]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <div className="section-label">Verified Client Feedback</div>
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-[1px] text-black mt-0.5">
              Customer Reviews ({reviews.length})
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center text-black">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-black text-black" />
                ))}
              </div>
              <span className="text-[12px] font-bold text-black">{product.averageRating || 5.0} / 5.0</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Write a Review Box */}
          <div className="lg:col-span-5 bg-[#f5f5f5] border border-[#eeeeee] p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-black mb-2">
              Write a Review
            </h3>
            <p className="text-[11px] text-[#666666] mb-4">
              Share your fit, fabric feel, and sizing impressions with fellow PRYME clients.
            </p>

            {reviewMsg && (
              <div className="mb-4 p-3 bg-white border border-[#eeeeee] text-black text-[11px] font-semibold">
                {reviewMsg}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[1px] text-black mb-1">
                  Your Rating
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="p-0.5 text-black hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= newRating ? "fill-black text-black" : "text-[#dddddd]"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-[11px] font-bold text-black ml-2">{newRating} Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[1px] text-black mb-1">
                  Review Details
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="How is the heavyweight drape? How does it fit?"
                  value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                  className="w-full p-3 bg-white border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="w-full py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingReview ? "Submitting..." : user ? "Submit Review" : "Sign In & Submit Review"}</span>
              </button>
            </form>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-7 space-y-3">
            {reviews.length === 0 ? (
              <div className="text-center py-10 bg-[#f5f5f5] border border-[#eeeeee]">
                <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#666666]">
                  Be the first to review this garment
                </p>
              </div>
            ) : (
              reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 bg-white border border-[#eeeeee] space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-black">{rev.userName}</span>
                      {rev.verifiedPurchase && (
                        <span className="text-[9px] font-bold text-black bg-[#f5f5f5] px-1.5 py-0.5 border border-[#eeeeee] uppercase tracking-[0.5px]">
                          Verified Buyer
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#999999]">
                      {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center text-black">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-black text-black" />
                    ))}
                  </div>

                  <p className="text-[12px] text-[#444444] leading-relaxed">
                    {rev.review}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowSizeGuide(false)}
          />
          <div className="relative bg-white w-full max-w-xl p-6 border border-[#eeeeee] z-10">
            <div className="flex justify-between items-center pb-3 border-b border-[#eeeeee]">
              <h3 className="text-xs font-bold uppercase tracking-[1px] text-black">
                PRYME Architectural Size Chart (Inches)
              </h3>
              <button
                onClick={() => setShowSizeGuide(false)}
                className="p-1 text-[#666666] hover:text-black transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#f5f5f5] text-black font-bold uppercase tracking-[0.5px]">
                    <th className="p-2 border border-[#eeeeee]">Size</th>
                    <th className="p-2 border border-[#eeeeee]">Chest (Inches)</th>
                    <th className="p-2 border border-[#eeeeee]">Length (Inches)</th>
                    <th className="p-2 border border-[#eeeeee]">Shoulder Drop</th>
                  </tr>
                </thead>
                <tbody className="text-[#444444]">
                  <tr>
                    <td className="p-2 border border-[#eeeeee] font-bold text-black">S</td>
                    <td className="p-2 border border-[#eeeeee]">42"</td>
                    <td className="p-2 border border-[#eeeeee]">28"</td>
                    <td className="p-2 border border-[#eeeeee]">Relaxed 21"</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-[#eeeeee] font-bold text-black">M</td>
                    <td className="p-2 border border-[#eeeeee]">44"</td>
                    <td className="p-2 border border-[#eeeeee]">29"</td>
                    <td className="p-2 border border-[#eeeeee]">Relaxed 22"</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-[#eeeeee] font-bold text-black">L</td>
                    <td className="p-2 border border-[#eeeeee]">46"</td>
                    <td className="p-2 border border-[#eeeeee]">30"</td>
                    <td className="p-2 border border-[#eeeeee]">Relaxed 23"</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-[#eeeeee] font-bold text-black">XL</td>
                    <td className="p-2 border border-[#eeeeee]">48"</td>
                    <td className="p-2 border border-[#eeeeee]">31"</td>
                    <td className="p-2 border border-[#eeeeee]">Relaxed 24"</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-[#eeeeee] font-bold text-black">XXL</td>
                    <td className="p-2 border border-[#eeeeee]">50"</td>
                    <td className="p-2 border border-[#eeeeee]">32"</td>
                    <td className="p-2 border border-[#eeeeee]">Relaxed 25"</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[10px] text-[#666666] mt-3">
                * Note: All PRYME garments feature an intentional boxy oversized streetwear silhouette. For a standard fitted look, order one size down.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
