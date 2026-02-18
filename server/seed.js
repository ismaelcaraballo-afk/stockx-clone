const pool = require("./db");
const bcrypt = require("bcrypt");
const shoesData = require("../client/src/data/shoes.json");
const clothingData = require("../client/src/data/clothing.json");

// Generate a clean display name from the file-based name
function cleanName(rawName) {
  return rawName
    .replace(/\.jpg$/i, "")
    .replace(/\.avif$/i, "")
    .replace(/-Product.*$/i, "")
    .replace(/-V\d+$/i, "")
    .replace(/-/g, " ")
    .trim();
}

// Map brand folder keys to proper brand names
const brandMap = {
  NIKE: "Nike",
  ADIDAS: "Adidas",
  NEWBALANCE: "New Balance",
  ALL: null, // detect from name
};

// Detect brand from product name for the ALL category
function detectBrand(name) {
  const lower = name.toLowerCase();
  if (lower.includes("nike") || lower.includes("jordan") || lower.includes("air force") || lower.includes("dunk") || lower.includes("air max")) return "Nike";
  if (lower.includes("adidas") || lower.includes("yeezy") || lower.includes("samba") || lower.includes("gazelle")) return "Adidas";
  if (lower.includes("new balance")) return "New Balance";
  if (lower.includes("asics") || lower.includes("gel-")) return "ASICS";
  if (lower.includes("converse") || lower.includes("chuck")) return "Converse";
  if (lower.includes("vans") || lower.includes("old skool")) return "Vans";
  if (lower.includes("puma")) return "Puma";
  if (lower.includes("reebok")) return "Reebok";
  if (lower.includes("salomon")) return "Salomon";
  if (lower.includes("hoka")) return "Hoka";
  if (lower.includes("crocs")) return "Crocs";
  if (lower.includes("birkenstock")) return "Birkenstock";
  if (lower.includes("ugg")) return "UGG";
  return "Other";
}

// Generate realistic retail prices based on brand
function getPrice(brand) {
  const ranges = {
    Nike: [90, 250],
    Adidas: [80, 230],
    "New Balance": [90, 220],
    ASICS: [100, 180],
    Converse: [55, 85],
    Vans: [60, 90],
    Puma: [65, 120],
    Reebok: [70, 110],
    Salomon: [130, 200],
    Hoka: [120, 200],
    Crocs: [40, 70],
    Birkenstock: [100, 160],
    UGG: [100, 200],
    Other: [80, 180],
  };
  const [min, max] = ranges[brand] || [80, 180];
  return Math.round(min + Math.random() * (max - min));
}

// Random size
function getSize() {
  const sizes = ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13"];
  return sizes[Math.floor(Math.random() * sizes.length)];
}

// Detect category from name
function getCategory(name) {
  const lower = name.toLowerCase();
  if (lower.includes("slide") || lower.includes("sandal")) return "sandals";
  if (lower.includes("boot") || lower.includes("goadome")) return "boots";
  if (lower.includes("cleat") || lower.includes("mercurial") || lower.includes("phantom") || lower.includes("menace")) return "cleats";
  return "sneakers";
}

async function seed() {
  try {
    const fs = require("fs");
    const schema = fs.readFileSync(__dirname + "/schema.sql", "utf8");
    await pool.query(schema);
    console.log("Tables created");

    const hash = await bcrypt.hash("demo1234", 10);
    const users = await Promise.all([
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["sneakerhead", hash]),
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["kicksdealer", hash]),
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["solecollector", hash]),
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["hypeking", hash]),
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["retrorunner", hash]),
    ]);
    console.log("Users seeded");

    const sellerIds = users.map((u) => u.rows[0]?.id).filter(Boolean);
    if (sellerIds.length === 0) {
      const existing = await pool.query("SELECT id FROM users ORDER BY id LIMIT 5");
      sellerIds.push(...existing.rows.map((r) => r.id));
    }
    const pickSeller = () => sellerIds[Math.floor(Math.random() * sellerIds.length)];

    // Build product list from Michael's shoe images
    const sneakers = [];
    const seen = new Set();

    for (const [folder, items] of Object.entries(shoesData)) {
      for (const item of items) {
        if (seen.has(item.src)) continue;
        seen.add(item.src);
        const name = cleanName(item.name);
        const brand = brandMap[folder] || detectBrand(name);
        sneakers.push({
          name,
          brand,
          description: `${name}. Premium quality, authenticated.`,
          image_url: item.src,
          retail_price: getPrice(brand),
          size: getSize(),
          category: getCategory(name),
          seller_id: pickSeller(),
        });
      }
    }

    // Add clothing items
    const clothing = [];
    if (Array.isArray(clothingData)) {
      for (const item of clothingData) {
        if (!item.src || !item.src.startsWith("/Clothing/")) continue;
        const name = cleanName(item.name || item.src.split("/").pop());
        clothing.push({
          name,
          brand: detectBrand(name) === "Other" ? "Streetwear" : detectBrand(name),
          description: `${name}. Authentic, deadstock condition.`,
          image_url: item.src,
          retail_price: Math.round(40 + Math.random() * 260),
          size: ["S", "M", "L", "XL"][Math.floor(Math.random() * 4)],
          category: "apparel",
          seller_id: pickSeller(),
        });
      }
    }

    const allProducts = [...sneakers, ...clothing];

    for (const p of allProducts) {
      await pool.query(
        "INSERT INTO products (name, brand, description, image_url, retail_price, size, category, seller_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [p.name, p.brand, p.description, p.image_url, p.retail_price, p.size, p.category, p.seller_id]
      );
    }
    console.log(`Products seeded: ${sneakers.length} shoes + ${clothing.length} apparel = ${allProducts.length} total`);

    // Add bids and asks for all products
    const products = await pool.query("SELECT id, retail_price FROM products");
    for (const p of products.rows) {
      const price = Number(p.retail_price);
      const bidPrice = Math.round(price * (0.8 + Math.random() * 0.3));
      const askPrice = Math.round(price * (1.1 + Math.random() * 0.5));
      const bidUser = pickSeller();
      const askUser = pickSeller();
      await pool.query(
        "INSERT INTO bids (product_id, user_id, amount, type, status) VALUES ($1, $2, $3, 'bid', 'active')",
        [p.id, bidUser, bidPrice]
      );
      await pool.query(
        "INSERT INTO bids (product_id, user_id, amount, type, status) VALUES ($1, $2, $3, 'ask', 'active')",
        [p.id, askUser, askPrice]
      );
    }
    console.log("Bids/asks seeded for all products");

    // Create sample completed orders for price history
    const prods = await pool.query("SELECT id, retail_price FROM products LIMIT 20");
    for (const p of prods.rows) {
      const price = Number(p.retail_price);
      const salePrice = Math.round(price * (0.9 + Math.random() * 0.4));
      const buyer = pickSeller();
      const seller = pickSeller();
      if (buyer !== seller) {
        await pool.query(
          "INSERT INTO orders (product_id, buyer_id, seller_id, price, status) VALUES ($1, $2, $3, $4, 'completed')",
          [p.id, buyer, seller, salePrice]
        );
      }
    }
    console.log("Sample orders seeded for price history");

    console.log(`Seed complete! ${allProducts.length} products loaded.`);
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
