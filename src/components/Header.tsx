import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  User,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
  Package,
  Truck,
  Sparkles,
  Flame,
  Phone,
  Layers,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  currentView?: string;
  onNavigate: (view: string, param?: string) => void;
  onSearchQuery?: (q: string) => void;
  onOpenTrackOrder?: (orderId?: string) => void;
  settings?: any;
  categories?: any[];
  onSelectProduct?: (productId: string) => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView = "home",
  onNavigate,
  onSearchQuery,
  onOpenTrackOrder,
  categories = [],
}) => {
  const { totalItems, openCartDrawer } = useCart();
  const { user, logoutCustomer, openAuthModal } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        setIsSearchOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll when side drawer is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchQuery) {
      onSearchQuery(searchValue);
    }
    onNavigate("shop", searchValue);
    setIsSearchOpen(false);
  };

  const navLinks = [
    {
      id: "contact",
      label: "Contact & Store",
      subtitle: "Delhi flagship & customer helpdesk",
      icon: Phone,
      action: () => onNavigate("contact"),
      isActive: currentView === "contact",
    },
    {
      id: "track-order",
      label: "Track Order",
      subtitle: "Live courier AWB status & timeline",
      icon: Truck,
      action: () => onOpenTrackOrder && onOpenTrackOrder(),
      isHighlight: true,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#eeeeee] shadow-xs">
      {/* Top Luxury Announcement Bar */}
      <div className="bg-black text-white text-[10px] sm:text-[11px] font-medium tracking-[1.5px] uppercase py-2 px-4 text-center flex items-center justify-center">
        <div className="flex items-center justify-center space-x-2 sm:space-x-3 text-center">
          <span className="hidden sm:inline">EXCLUSIVE DROP</span>
          <span className="truncate">FREE EXPRESS SHIPPING ON ORDERS OVER ₹1,999</span>
          <span className="hidden md:inline">• CASH ON DELIVERY (COD) NATIONWIDE</span>
        </div>
      </div>

      {/* Main Single-Tier Header: Menu Button | Logo | Actions (Search, Account, Bag) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[64px] sm:h-[72px]">
          {/* Left: Side Menu Hamburger Button */}
          <div className="flex items-center">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-2 text-black hover:text-neutral-600 focus:outline-hidden flex items-center space-x-2 transition-colors cursor-pointer group"
              id="main-menu-toggle-btn"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 group-hover:scale-105 transition-transform" />
              <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-[1.5px]">
                Menu
              </span>
            </button>
          </div>

          {/* Center: Brand Logo */}
          <div className="flex items-center">
            <button
              onClick={() => onNavigate("home")}
              className="inline-block focus:outline-hidden group text-center cursor-pointer"
              id="brand-logo-btn"
            >
              <span className="text-[21px] sm:text-[25px] font-[900] tracking-[3px] sm:tracking-[4px] uppercase text-black group-hover:opacity-85 transition-opacity font-mono">
                PRYMEWEAR
              </span>
            </button>
          </div>

          {/* Right Action Icons (Search, User Account, Shopping Bag) */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search Toggle Button */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-black hover:text-neutral-600 transition-colors focus:outline-hidden flex items-center space-x-1.5 cursor-pointer"
              aria-label="Search catalog"
              id="search-toggle-btn"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline-block text-[11px] uppercase font-bold tracking-[1px]">
                Search
              </span>
            </button>

            {/* Customer Account Dropdown */}
            <div className="relative">
              {user ? (
                <div>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-[1px] text-black hover:text-neutral-600 p-2 focus:outline-hidden cursor-pointer"
                    id="user-menu-btn"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline-block max-w-[90px] truncate">
                      {user.name.split(" ")[0]}
                    </span>
                    <ChevronDown className="w-3 h-3 text-neutral-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-52 bg-white border border-neutral-200 shadow-xl py-2 z-50 animate-in fade-in duration-150"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <div className="px-4 py-2.5 border-b border-neutral-100 bg-neutral-50">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                          Signed in as
                        </p>
                        <p className="text-xs font-bold text-black truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => onNavigate("account")}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-black hover:bg-neutral-100 flex items-center space-x-2.5 transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-neutral-700" />
                        <span>My Account</span>
                      </button>
                      <button
                        onClick={() => onNavigate("account", "orders")}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-black hover:bg-neutral-100 flex items-center space-x-2.5 transition-colors cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5 text-neutral-700" />
                        <span>Order History</span>
                      </button>
                      {onOpenTrackOrder && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenTrackOrder();
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-black hover:bg-neutral-100 flex items-center space-x-2.5 transition-colors border-t border-neutral-100 cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Track Live Order</span>
                        </button>
                      )}
                      <button
                        onClick={logoutCustomer}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center space-x-2.5 border-t border-neutral-100 mt-1 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => openAuthModal("login")}
                  className="flex items-center space-x-1.5 p-2 text-black hover:text-neutral-600 transition-colors focus:outline-hidden cursor-pointer"
                  id="header-login-btn"
                  title="Sign In / Register"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-[1px]">
                    Account
                  </span>
                </button>
              )}
            </div>

            {/* Shopping Bag Drawer Button */}
            <button
              onClick={openCartDrawer}
              className="p-2 text-black hover:text-neutral-600 transition-colors focus:outline-hidden flex items-center space-x-1.5 relative cursor-pointer"
              id="cart-drawer-toggle"
              aria-label="Open Shopping Bag"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-[1px]">
                Bag
              </span>
              {totalItems > 0 && (
                <span className="bg-black text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center leading-3">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {isSearchOpen && (
          <div className="py-3 border-t border-[#eeeeee] animate-in fade-in duration-150">
            <form onSubmit={handleSearchSubmit} className="relative max-w-xl mx-auto flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="SEARCH HOODIES, BOX TEES, CARGOS, BOMBERS..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full pl-10 pr-24 py-2.5 bg-neutral-50 border border-neutral-200 text-xs font-mono font-bold text-black uppercase tracking-wider focus:outline-hidden focus:border-black focus:bg-white transition-colors"
                autoFocus
                id="search-input-field"
              />
              <button
                type="submit"
                className="absolute right-1 px-4 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-[1.5px] hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Slide-out Full Navigation Menu Drawer (Side Overlay) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Slide Drawer Content */}
          <div className="relative w-full max-w-[380px] sm:max-w-[420px] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250 border-r border-neutral-200 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between bg-black text-white">
              <div>
                <span className="text-[17px] font-[900] tracking-[3px] uppercase font-mono">
                  PRYMEWEAR
                </span>
                <p className="text-[10px] text-neutral-400 font-mono tracking-widest mt-0.5 uppercase">
                  Menu & Navigation
                </p>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-white hover:text-neutral-300 transition-colors focus:outline-hidden rounded-full hover:bg-white/10 cursor-pointer"
                aria-label="Close menu"
                id="close-side-menu-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Navigation Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Primary Navigation Sections (Collections, New Arrivals, Essentials, Contact, Track Order) */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-neutral-400 px-1 mb-2">
                  Navigation
                </p>

                {navLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.action();
                        setIsMenuOpen(false);
                      }}
                      id={`drawer-nav-${item.id}`}
                      className={`w-full flex items-center justify-between p-3.5 text-left border transition-all cursor-pointer group ${
                        item.isHighlight
                          ? "bg-black text-white border-black hover:bg-neutral-900 shadow-sm"
                          : item.isActive
                          ? "bg-neutral-100 text-black border-black font-bold"
                          : "bg-white text-neutral-900 border-neutral-200 hover:border-black hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-none ${
                            item.isHighlight
                              ? "bg-neutral-800 text-emerald-400"
                              : "bg-neutral-100 text-neutral-800 group-hover:bg-black group-hover:text-white transition-colors"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {item.label}
                            </span>
                            {(item as any).badge && (
                              <span className="text-[9px] font-bold bg-neutral-900 text-white px-1.5 py-0.2 tracking-wider">
                                {(item as any).badge}
                              </span>
                            )}
                            {item.isHighlight && (
                              <span className="text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 uppercase tracking-wider">
                                Live AWB
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[11px] mt-0.5 ${
                              item.isHighlight ? "text-neutral-300" : "text-neutral-500"
                            }`}
                          >
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                          item.isHighlight ? "text-neutral-300" : "text-neutral-400"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>



              {/* Customer Account Section in Drawer */}
              <div className="pt-4 border-t border-neutral-200">
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-neutral-400 px-1 mb-2">
                  Customer Account
                </p>
                {user ? (
                  <div className="bg-neutral-50 border border-neutral-200 p-4 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
                        Welcome Back
                      </span>
                      <p className="text-xs font-bold text-black">{user.name}</p>
                      <p className="text-[11px] text-neutral-500 font-mono truncate">{user.email}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          onNavigate("account");
                          setIsMenuOpen(false);
                        }}
                        className="w-full py-2 bg-black text-white text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors text-center cursor-pointer"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={() => {
                          onNavigate("account", "orders");
                          setIsMenuOpen(false);
                        }}
                        className="w-full py-2 bg-white border border-neutral-300 text-black text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-100 transition-colors text-center cursor-pointer"
                      >
                        Orders
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        logoutCustomer();
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-center text-xs font-bold text-red-600 hover:text-red-700 py-1 transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      openAuthModal("login");
                      setIsMenuOpen(false);
                    }}
                    className="w-full py-3.5 bg-black text-white text-xs font-bold uppercase tracking-[2px] hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm text-center block font-mono"
                  >
                    Sign In / Register →
                  </button>
                )}
              </div>

              {/* Need Help / Contact Direct Channels */}
              <div className="pt-3 border-t border-neutral-100 space-y-2 text-xs text-neutral-600">
                <div className="flex items-center space-x-2 text-[11px] font-mono">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  <span className="truncate">PRYMEWEAR Flagship, New Delhi, India</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] font-mono">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>WhatsApp: +91 9211597397 (10 AM - 8 PM IST)</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-[10px] text-neutral-500 font-mono uppercase tracking-wider">
              <span>PRYMEWEAR © 2026</span>
              <span>100% Cotton Streetwear</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
