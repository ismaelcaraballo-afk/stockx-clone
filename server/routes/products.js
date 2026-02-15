const express = require("express");
const auth = require("../middleware/auth");
const Product = require("../models/Product");

const router = express.Router();

// GET /api/products — browse all listings
router.get("/", async (req, res) => {
  try {
    const { brand, category, search, sort, limit, offset } = req.query;
    const products = await Product.findAll({ brand, category, search, sort, limit: Number(limit) || 20, offset: Number(offset) || 0 });
    res.json(products);
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/products/:id — single product detail
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error("Get product error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/products — create a listing (auth required)
router.post("/", auth, async (req, res) => {
  try {
    const { name, brand, description, image_url, retail_price, size, category } = req.body;
    if (!name || !brand || !retail_price) {
      return res.status(400).json({ error: "Name, brand, and retail price required" });
    }
    const product = await Product.create({
      name, brand, description, image_url, retail_price, size, category, seller_id: req.user.id,
    });
    res.status(201).json(product);
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
