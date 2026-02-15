-- StockX Clone Database Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  retail_price DECIMAL(10, 2) NOT NULL,
  size VARCHAR(20),
  category VARCHAR(50) DEFAULT 'sneakers',
  seller_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('bid', 'ask')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'matched', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  buyer_id INTEGER REFERENCES users(id),
  seller_id INTEGER REFERENCES users(id),
  price DECIMAL(10, 2) NOT NULL,
  bid_id INTEGER REFERENCES bids(id),
  ask_id INTEGER REFERENCES bids(id),
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_bids_product ON bids(product_id);
CREATE INDEX IF NOT EXISTS idx_bids_user ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
