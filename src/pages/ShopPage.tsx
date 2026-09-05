import React, { useState, useMemo } from "react";
import { SlidersHorizontal, Search, X, RotateCcw } from "lucide-react";
import { Product, Category } from "../types";
import { ProductCard } from "../components/ProductCard";

interface ShopPageProps {
  products: Product[];
  categories: Category[];
  initialCategory?: string;
  initialSearch?: string;
  onSelectProduct: (productId: string) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  products,
  categories,
  initialCategory = "all",
  initialSearch = "",
  onSelectProduct,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [selectedSize, setSelectedSize] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [maxPrice, setMaxPrice] = useState<number>(8000);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Sync initial parameters
  React.useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
    if (initialSearch !== undefined) setSearchQuery(initialSearch);
  }, [initialCategory, initialSearch]);

  const allSizes = ["S", "M", "L", "XL", "XXL"];

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category match
      if (selectedCategory && selectedCategory !== "all") {
        if (selectedCategory === "new") {
          if (!p.isNewArrival) return false;
        } else if (selectedCategory === "bestsellers") {
          if (!p.isBestSeller) return false;
        } else {
          const matchCat =
            p.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
            selectedCategory.toLowerCase().includes(p.category.toLowerCase());
          if (!matchCat) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      // Size match
      if (selectedSize !== "all") {
        const hasSize = p.availableSizes.some((s) => s.startsWith(selectedSize));
        if (!hasSize) return false;
      }

      // Price filter
      const effectivePrice = p.discountPrice || p.price;
      if (effectivePrice > maxPrice) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === "price-low") {
        return (a.discountPrice || a.price) - (b.discountPrice || b.price);
      }
      if (sortBy === "price-high") {
        return (b.discountPrice || b.price) - (a.discountPrice || a.price);
      }
      if (sortBy === "rating") {
        return b.averageRating - a.averageRating;
      }
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });
  }, [products, selectedCategory, searchQuery, selectedSize, maxPrice, sortBy]);

  const resetFilters = () => {
    setSelectedCategory("all");
    setSearchQuery("");
    setSelectedSize("all");
    setMaxPrice(8000);
    setSortBy("featured");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-[#eeeeee] gap-4">
        <div>
          <div className="section-label">PRYMEWEAR Catalog</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-black mt-0.5">
            {selectedCategory === "all"
              ? "All Garments"
              : selectedCategory === "new"
              ? "New Arrivals"
              : selectedCategory === "bestsellers"
              ? "Essentials"
              : selectedCategory.toUpperCase()}
          </h1>
          <p className="text-[12px] text-[#666666] mt-1">
            Showing {filteredProducts.length} items designed with heavy architectural drape
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center space-x-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#666666]" />
            <input
              type="text"
              placeholder="SEARCH CATALOG..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-[#f5f5f5] border border-[#eeeeee] text-[11px] font-medium uppercase tracking-wider text-black focus:outline-hidden focus:border-black focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-[#666666] hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="py-2 px-3 bg-white border border-[#eeeeee] text-[11px] font-bold uppercase tracking-[1px] text-black focus:outline-hidden focus:border-black cursor-pointer"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest Drops</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Top Customer Rated</option>
          </select>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className="md:hidden p-2 border border-[#eeeeee] text-black flex items-center space-x-1 text-xs font-bold"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-8">
        {/* Left Filter Sidebar */}
        <div className={`md:block ${showFiltersMobile ? "block" : "hidden"} space-y-7`}>
          {/* Size Filter */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-black mb-3">
              Filter by Size
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedSize("all")}
                className={`text-[11px] font-bold px-3 py-1.5 border transition-colors ${
                  selectedSize === "all"
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-[#eeeeee] hover:border-black"
                }`}
              >
                ALL
              </button>
              {allSizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={`text-[11px] font-bold px-3 py-1.5 border transition-colors ${
                    selectedSize === s
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-[#eeeeee] hover:border-black"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-black">
                Max Price
              </h3>
              <span className="text-[12px] font-bold text-black">
                ₹{maxPrice.toLocaleString("en-IN")}
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="8000"
              step="500"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#666666] mt-1">
              <span>₹1,000</span>
              <span>₹8,000</span>
            </div>
          </div>

          {/* Reset Filters Button */}
          <button
            onClick={resetFilters}
            className="w-full py-2.5 bg-[#f5f5f5] text-black text-[11px] font-bold uppercase tracking-[1px] hover:bg-[#e5e5e5] transition-colors flex items-center justify-center space-x-1.5 border border-[#eeeeee]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Right Product Grid */}
        <div className="md:col-span-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-[#f5f5f5] border border-[#eeeeee] p-8">
              <p className="text-sm font-bold uppercase tracking-[1px] text-black mb-1.5">
                No matching garments found
              </p>
              <p className="text-xs text-[#666666] mb-5">
                Try loosening your filters or searching with different keywords.
              </p>
              <button
                onClick={resetFilters}
                className="px-6 py-2.5 bg-black text-white text-[11px] font-bold uppercase tracking-[1px] hover:bg-[#222222]"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelectProduct={onSelectProduct}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
