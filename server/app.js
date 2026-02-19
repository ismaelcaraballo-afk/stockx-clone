const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const bidRoutes = require("./routes/bids");
const orderRoutes = require("./routes/orders");
const userRoutes = require("./routes/users");

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));

// Rate limiting (skip in test environment)
if (process.env.NODE_ENV !== "test") {
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: "Too many requests, slow down" },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many auth attempts, try again later" },
  });

  const bidLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: "Too many bids, slow down" },
  });

  app.use("/api", globalLimiter);
  app.use("/api/auth", authLimiter);
  app.use("/api/bids", bidLimiter);
}

// REST API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);

// One-time seed endpoint (no shell on free tier)
app.get("/api/seed", async (req, res) => {
  try {
    const pool = require("./db");
    const fs = require("fs");
    const pathMod = require("path");
    const schema = fs.readFileSync(pathMod.join(__dirname, "schema.sql"), "utf8");
    await pool.query(schema);
    const check = await pool.query("SELECT COUNT(*) FROM products");
    if (parseInt(check.rows[0].count) > 0) {
      return res.json({ message: "Already seeded", products: check.rows[0].count });
    }
    // Run seed logic inline
    const bcrypt = require("bcrypt");
    const shoesData = require("../client/src/data/shoes.json");
    const clothingData = require("../client/src/data/clothing.json");

    const cleanName = (f) => f.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
    const detectBrand = (name) => {
      const n = name.toLowerCase();
      if (n.includes("nike") || n.includes("jordan") || n.includes("dunk") || n.includes("air max") || n.includes("air force")) return "Nike";
      if (n.includes("adidas") || n.includes("yeezy") || n.includes("ultraboost") || n.includes("samba") || n.includes("gazelle")) return "Adidas";
      if (n.includes("new balance") || n.includes("nb ")) return "New Balance";
      if (n.includes("puma")) return "Puma";
      if (n.includes("reebok")) return "Reebok";
      if (n.includes("converse") || n.includes("chuck")) return "Converse";
      if (n.includes("vans")) return "Vans";
      return "Nike";
    };
    const getPrice = (brand) => {
      const ranges = { Nike: [110,250], Adidas: [100,220], "New Balance": [90,200], Puma: [80,160], Reebok: [70,140], Converse: [60,110], Vans: [55,100] };
      const [min,max] = ranges[brand] || [80,180];
      return Math.round(min + Math.random()*(max-min));
    };
    const sizes = ["7","7.5","8","8.5","9","9.5","10","10.5","11","11.5","12","13"];
    const getSize = () => sizes[Math.floor(Math.random()*sizes.length)];

    await pool.query("DELETE FROM bids");
    await pool.query("DELETE FROM orders");
    await pool.query("DELETE FROM products");
    await pool.query("DELETE FROM users");

    const hash = await bcrypt.hash("demo123", 10);
    const u = await pool.query("INSERT INTO users (username,password_hash) VALUES ($1,$2) RETURNING id", ["demo", hash]);
    const userId = u.rows[0].id;

    let count = 0;
    const allShoes = [];
    for (const [brand, items] of Object.entries(shoesData)) {
      if (!Array.isArray(items)) continue;
      for (const shoe of items) {
        const name = cleanName(shoe.name || shoe.src.split("/").pop());
        const b = brand === "ALL" ? detectBrand(name) : brand.charAt(0)+brand.slice(1).toLowerCase();
        allShoes.push({ name, brand: b, src: shoe.src });
      }
    }
    for (const shoe of allShoes) {
      const price = getPrice(shoe.brand);
      const size = getSize();
      await pool.query("INSERT INTO products (name,brand,size,retail_price,image_url,category) VALUES ($1,$2,$3,$4,$5,$6)",
        [shoe.name, shoe.brand, size, price, shoe.src, "sneakers"]);
      count++;
    }

    const clothing = Array.isArray(clothingData) ? clothingData : clothingData.items || [];
    for (const item of clothing) {
      const name = cleanName(item.name || item.src.split("/").pop());
      const csizes = ["S","M","L","XL"];
      await pool.query("INSERT INTO products (name,brand,size,retail_price,image_url,category) VALUES ($1,$2,$3,$4,$5,$6)",
        [name, "Streetwear", csizes[Math.floor(Math.random()*csizes.length)], Math.round(40+Math.random()*120), item.src, "apparel"]);
      count++;
    }

    res.json({ message: "Seeded!", products: count, demoUser: "demo / demo123" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// --- Production: serve React frontend ---
if (process.env.NODE_ENV === "production") {
  const path = require("path");
  app.use(express.static(path.join(__dirname, "..", "client", "dist")));
  app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "client", "dist", "index.html"));
  });
}

module.exports = app;
