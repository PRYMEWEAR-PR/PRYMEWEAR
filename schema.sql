-- =========================================================
-- PRYMEWEAR E-COMMERCE DATABASE SCHEMA (PostgreSQL / Supabase)
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(32),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'customer',
    saved_addresses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image TEXT,
    featured BOOLEAN DEFAULT false,
    item_count INTEGER DEFAULT 0
);

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    discount_price NUMERIC(10, 2),
    images JSONB DEFAULT '[]'::jsonb,
    category VARCHAR(255) NOT NULL,
    available_sizes JSONB DEFAULT '["S", "M", "L", "XL"]'::jsonb,
    colors JSONB DEFAULT '["Jet Black"]'::jsonb,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    sku VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(32) DEFAULT 'active', -- active, draft, archived
    is_featured BOOLEAN DEFAULT false,
    is_bestseller BOOLEAN DEFAULT false,
    is_new_arrival BOOLEAN DEFAULT false,
    average_rating NUMERIC(3, 2) DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY, -- e.g. ORD-84921
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_mobile VARCHAR(32) NOT NULL,
    shipping_address JSONB NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    shipping_charges NUMERIC(10, 2) DEFAULT 0.0,
    discount NUMERIC(10, 2) DEFAULT 0.0,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(32) DEFAULT 'COD',
    payment_status VARCHAR(32) DEFAULT 'pending', -- pending, completed, failed
    status VARCHAR(32) DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled
    notes TEXT,
    tracking_number VARCHAR(128),
    estimated_delivery VARCHAR(128),
    confirmation_email_sent BOOLEAN DEFAULT false,
    status_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'approved', -- approved, pending, rejected
    is_featured BOOLEAN DEFAULT false,
    verified_purchase BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS store_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
    store_name VARCHAR(255) DEFAULT 'PRYMEWEAR',
    tagline VARCHAR(255) DEFAULT 'Engineered Streetwear & Minimal Luxury',
    support_email VARCHAR(255) DEFAULT 'support@prymewear.com',
    support_phone VARCHAR(64) DEFAULT '+91 98765 43210',
    store_address TEXT,
    instagram_url VARCHAR(255),
    twitter_url VARCHAR(255),
    facebook_url VARCHAR(255),
    free_shipping_threshold NUMERIC(10, 2) DEFAULT 1999.0,
    standard_shipping_rate NUMERIC(10, 2) DEFAULT 99.0,
    shipping_policy TEXT,
    return_policy TEXT,
    privacy_policy TEXT,
    terms_conditions TEXT,
    about_story TEXT
);

-- 8. EMAIL OUTBOX & LOGS TABLE
CREATE TABLE IF NOT EXISTS email_logs (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64),
    to_email VARCHAR(255) NOT NULL,
    template VARCHAR(64) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    sent_status VARCHAR(32) NOT NULL, -- sent, logged, failed
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES for fast lookup & filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
