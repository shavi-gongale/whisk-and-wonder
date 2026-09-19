import pool from './db.js';
import { seedDatabase } from './seed.js';

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      source_id VARCHAR(100) UNIQUE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      initials VARCHAR(10),
      member_since VARCHAR(50),
      points INTEGER DEFAULT 50,
      orders_count INTEGER DEFAULT 0,
      is_owner BOOLEAN DEFAULT false,
      phone VARCHAR(50),
      avatar TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      long_description TEXT,
      price DECIMAL(10,2) NOT NULL,
      original_price DECIMAL(10,2),
      discount INTEGER,
      rating DECIMAL(3,1) DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      tag VARCHAR(100) DEFAULT 'New',
      img_id TEXT,
      gallery_img_ids JSONB DEFAULT '[]',
      related_ids JSONB DEFAULT '[]',
      category VARCHAR(100),
      ingredients JSONB DEFAULT '[]',
      allergens JSONB DEFAULT '[]',
      calories INTEGER DEFAULT 0,
      sizes JSONB DEFAULT '[]',
      availability VARCHAR(100) DEFAULT 'In Stock',
      prep_time VARCHAR(100) DEFAULT '1 day',
      delivery_time VARCHAR(100) DEFAULT 'Same day',
      tags JSONB DEFAULT '[]',
      is_new BOOLEAN DEFAULT false,
      is_best_seller BOOLEAN DEFAULT false,
      is_featured BOOLEAN DEFAULT false,
      is_eggless BOOLEAN DEFAULT false,
      is_vegetarian BOOLEAN DEFAULT false,
      is_premium BOOLEAN DEFAULT false,
      is_seasonal BOOLEAN DEFAULT false,
      is_hidden BOOLEAN DEFAULT false,
      stock INTEGER DEFAULT 10,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      items JSONB NOT NULL DEFAULT '[]',
      subtotal DECIMAL(10,2) NOT NULL,
      delivery_fee DECIMAL(10,2) DEFAULT 0,
      discount DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) NOT NULL,
      status VARCHAR(100) DEFAULT 'Order Confirmed',
      status_updated_at TIMESTAMP,
      address JSONB,
      payment_method VARCHAR(100),
      coupon_code VARCHAR(100),
      notes TEXT,
      estimated_delivery VARCHAR(255),
      tracking_steps JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label VARCHAR(100),
      name VARCHAR(255),
      phone VARCHAR(50),
      line1 TEXT NOT NULL,
      line2 TEXT,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      pincode VARCHAR(20) NOT NULL,
      is_default BOOLEAN DEFAULT false,
      lat DECIMAL(10,6),
      lng DECIMAL(10,6),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      text TEXT NOT NULL,
      img_id TEXT,
      is_verified BOOLEAN DEFAULT true,
      likes INTEGER DEFAULT 0,
      owner_reply TEXT,
      is_hidden BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS newsletter (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      code VARCHAR(100) UNIQUE NOT NULL,
      type VARCHAR(50) NOT NULL CHECK (type IN ('percent', 'flat')),
      value DECIMAL(10,2) NOT NULL,
      description TEXT DEFAULT '',
      min_order DECIMAL(10,2),
      max_discount DECIMAL(10,2),
      max_uses INTEGER,
      uses_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) DEFAULT '',
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE products ADD COLUMN IF NOT EXISTS related_ids JSONB DEFAULT '[]';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS source_id VARCHAR(100);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_discount DECIMAL(10,2);

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) UNIQUE NOT NULL,
      slug VARCHAR(140) UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      image_url TEXT,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name VARCHAR(255) NOT NULL,
      size VARCHAR(100),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS delivery_zones (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      fee DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
      min_order DECIMAL(10,2) DEFAULT 0 CHECK (min_order >= 0),
      estimated_time VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}',
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cake_studio_designs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      configuration JSONB NOT NULL DEFAULT '{}',
      reference_image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cake_studio_orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      design_id INTEGER REFERENCES cake_studio_designs(id) ON DELETE SET NULL,
      configuration JSONB NOT NULL DEFAULT '{}',
      reference_image_url TEXT,
      status VARCHAR(80) NOT NULL DEFAULT 'New',
      owner_notes TEXT DEFAULT '',
      customer_notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      points INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      data JSONB DEFAULT '{}',
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      provider_order_id VARCHAR(255),
      provider_payment_id VARCHAR(255),
      amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      status VARCHAR(50) NOT NULL DEFAULT 'created',
      raw_response JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity_change INTEGER NOT NULL,
      reason VARCHAR(100) NOT NULL,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_visible ON products(is_hidden, is_featured, is_best_seller);
    CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_product_visible ON reviews(product_id, is_hidden);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_order ON payments(provider, provider_order_id)
      WHERE provider_order_id IS NOT NULL;
  `);
  console.log('✅ Database tables initialised');
  await seedDatabase();
}
