import pool from './db.js';

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT NOW()
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
  `);
  console.log('✅ Database tables initialised');
}
