const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Product = require("../models/Product");

const router = express.Router();

// GET /api/users/me — get current user profile
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/users/me/listings — get current user's listings
router.get("/me/listings", auth, async (req, res) => {
  try {
    const products = await Product.findBySeller(req.user.id);
    res.json(products);
  } catch (err) {
    console.error("Get listings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
