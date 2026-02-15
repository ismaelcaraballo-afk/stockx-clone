const express = require("express");
const auth = require("../middleware/auth");
const Product = require("../models/Product");

const router = express.Router();

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const { brand, category, search, sort, limit, offset } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const products = await Product.findAll({ brand, category, search, sort, limit: safeLimit, offset: safeOffset });
    res.json(products);
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error("Get product error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/products/:id/history — price history (completed orders)
router.get("/:id/history", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const pool = require("../db");
    const result = await pool.query(
      `SELECT o.price, o.created_at, buyer.username as buyer_name, seller.username as seller_name
       FROM orders o
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON o.seller_id = seller.id
       WHERE o.product_id = $1
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [id]
    );

    // Also get stats
    const stats = await pool.query(
      `SELECT
        COUNT(*) as total_sales,
        AVG(price)::numeric(10,2) as avg_price,
        MIN(price)::numeric(10,2) as min_price,
        MAX(price)::numeric(10,2) as max_price
       FROM orders WHERE product_id = $1`,
      [id]
    );

    // Last sale
    const lastSale = result.rows.length > 0 ? result.rows[0] : null;

    res.json({
      history: result.rows,
      stats: stats.rows[0],
      lastSale,
    });
  } catch (err) {
    console.error("Get price history error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/products — create listing (auth required)
router.post("/", auth, async (req, res) => {
  try {
    let { name, brand, description, image_url, retail_price, size, category } = req.body;

    // Validation
    if (!name || !brand || !retail_price) {
      return res.status(400).json({ error: "Name, brand, and retail price required" });
    }

    name = String(name).trim();
    brand = String(brand).trim();
    if (name.length < 2 || name.length > 255) {
      return res.status(400).json({ error: "Name must be 2-255 characters" });
    }
    if (brand.length < 1 || brand.length > 100) {
      return res.status(400).json({ error: "Brand must be 1-100 characters" });
    }

    const numPrice = Number(retail_price);
    if (isNaN(numPrice) || numPrice <= 0 || numPrice > 1000000) {
      return res.status(400).json({ error: "Price must be between $1 and $1,000,000" });
    }

    if (description) description = String(description).trim().slice(0, 2000);
    if (image_url) {
      image_url = String(image_url).trim();
      if (image_url.length > 2000) {
        return res.status(400).json({ error: "Image URL too long" });
      }
    }
    if (size) size = String(size).trim().slice(0, 20);
    if (category) category = String(category).trim().slice(0, 50);

    const product = await Product.create({
      name, brand, description: description || null, image_url: image_url || null,
      retail_price: numPrice, size: size || null, category: category || "sneakers",
      seller_id: req.user.id,
    });
    res.status(201).json(product);
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/products/:id — delete listing (seller only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (product.seller_id !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own listings" });
    }

    await Product.delete(id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
