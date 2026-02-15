const pool = require("../db");

// Clean all tables between tests
async function cleanDB() {
  await pool.query("DELETE FROM orders");
  await pool.query("DELETE FROM bids");
  await pool.query("DELETE FROM products");
  await pool.query("DELETE FROM users");
}

// Create a test user and return { user, token }
async function createTestUser(username = "testuser", password = "testpass") {
  const bcrypt = require("bcrypt");
  const jwt = require("jsonwebtoken");
  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
    [username, hash]
  );
  const user = result.rows[0];
  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
  return { user, token };
}

// Create a test product and return it
async function createTestProduct(sellerId, overrides = {}) {
  const defaults = {
    name: "Test Shoe",
    brand: "Nike",
    description: "A test sneaker",
    image_url: "https://example.com/shoe.jpg",
    retail_price: 150.00,
    size: "10",
    category: "sneakers",
  };
  const p = { ...defaults, ...overrides };
  const result = await pool.query(
    `INSERT INTO products (name, brand, description, image_url, retail_price, size, category, seller_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [p.name, p.brand, p.description, p.image_url, p.retail_price, p.size, p.category, sellerId]
  );
  return result.rows[0];
}

async function closeDB() {
  await pool.end();
}

module.exports = { cleanDB, createTestUser, createTestProduct, closeDB, pool };
