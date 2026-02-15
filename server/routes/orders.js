const express = require("express");
const auth = require("../middleware/auth");
const Order = require("../models/Order");

const router = express.Router();

// GET /api/orders — get current user's orders
router.get("/", auth, async (req, res) => {
  try {
    const orders = await Order.getByUser(req.user.id);
    res.json(orders);
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
