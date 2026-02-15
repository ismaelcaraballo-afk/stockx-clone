const pool = require("./db");
const bcrypt = require("bcrypt");

async function seed() {
  try {
    // Create tables
    const fs = require("fs");
    const schema = fs.readFileSync(__dirname + "/schema.sql", "utf8");
    await pool.query(schema);
    console.log("Tables created");

    // Create demo users
    const hash = await bcrypt.hash("demo1234", 10);
    const users = await Promise.all([
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["sneakerhead", hash]),
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["kicksdealer", hash]),
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["solecollector", hash]),
    ]);
    console.log("Users seeded");

    const sellerId = users[0].rows[0]?.id || 1;
    const sellerId2 = users[1].rows[0]?.id || 2;

    // Sample sneakers
    const sneakers = [
      { name: "Air Jordan 1 Retro High OG Chicago", brand: "Nike", description: "The iconic Chicago colorway. White, black, and varsity red leather upper.", image_url: "https://images.stockx.com/images/Air-Jordan-1-Retro-High-OG-Chicago-2015.jpg", retail_price: 170, size: "10", category: "sneakers", seller_id: sellerId },
      { name: "Yeezy Boost 350 V2 Zebra", brand: "Adidas", description: "White and core black Primeknit upper with red SPLY-350 branding.", image_url: "https://images.stockx.com/images/Adidas-Yeezy-Boost-350-V2-Zebra.jpg", retail_price: 220, size: "10", category: "sneakers", seller_id: sellerId },
      { name: "Nike Dunk Low Panda", brand: "Nike", description: "Clean black and white colorway. Leather upper with classic Dunk styling.", image_url: "https://images.stockx.com/images/Nike-Dunk-Low-Retro-White-Black-2021.jpg", retail_price: 100, size: "9.5", category: "sneakers", seller_id: sellerId2 },
      { name: "New Balance 550 White Green", brand: "New Balance", description: "Retro basketball silhouette with white leather and green accents.", image_url: "https://images.stockx.com/images/New-Balance-550-White-Green.jpg", retail_price: 110, size: "11", category: "sneakers", seller_id: sellerId },
      { name: "Air Force 1 Low White", brand: "Nike", description: "The classic all-white AF1. Full-grain leather upper.", image_url: "https://images.stockx.com/images/Nike-Air-Force-1-Low-White-07.jpg", retail_price: 90, size: "10.5", category: "sneakers", seller_id: sellerId2 },
      { name: "Jordan 4 Retro Bred", brand: "Nike", description: "Black cement grey and fire red. Iconic Jordan 4 colorway.", image_url: "https://images.stockx.com/images/Air-Jordan-4-Retro-Bred-2019.jpg", retail_price: 200, size: "10", category: "sneakers", seller_id: sellerId },
      { name: "Nike SB Dunk Low Travis Scott", brand: "Nike", description: "Cactus Jack collaboration. Paisley print with mismatched Swooshes.", image_url: "https://images.stockx.com/images/Nike-SB-Dunk-Low-Travis-Scott.jpg", retail_price: 150, size: "9", category: "sneakers", seller_id: sellerId2 },
      { name: "Adidas Samba OG White", brand: "Adidas", description: "Classic indoor soccer shoe. White leather with gum sole.", image_url: "https://images.stockx.com/images/Adidas-Samba-OG-Cloud-White.jpg", retail_price: 100, size: "10", category: "sneakers", seller_id: sellerId },
    ];

    for (const s of sneakers) {
      await pool.query(
        "INSERT INTO products (name, brand, description, image_url, retail_price, size, category, seller_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [s.name, s.brand, s.description, s.image_url, s.retail_price, s.size, s.category, s.seller_id]
      );
    }
    console.log("Products seeded: " + sneakers.length + " sneakers");

    // Add some sample bids and asks
    const products = await pool.query("SELECT id, retail_price FROM products LIMIT 4");
    for (const p of products.rows) {
      await pool.query(
        "INSERT INTO bids (product_id, user_id, amount, type, status) VALUES ($1, $2, $3, 'bid', 'active')",
        [p.id, sellerId2, Math.round(p.retail_price * 1.2)]
      );
      await pool.query(
        "INSERT INTO bids (product_id, user_id, amount, type, status) VALUES ($1, $2, $3, 'ask', 'active')",
        [p.id, sellerId, Math.round(p.retail_price * 1.5)]
      );
    }
    console.log("Sample bids/asks seeded");

    console.log("Seed complete!");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
