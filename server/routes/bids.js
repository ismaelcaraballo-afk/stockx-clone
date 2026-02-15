const express = require("express");
const auth = require("../middleware/auth");
const Bid = require("../models/Bid");
const Order = require("../models/Order");
const Product = require("../models/Product");

const router = express.Router();

// GET /api/bids/product/:productId
router.get("/product/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const bids = await Bid.getByProduct(productId);
    const highest = await Bid.getHighestBid(productId);
    const lowest = await Bid.getLowestAsk(productId);
    res.json({ bids, highestBid: highest, lowestAsk: lowest });
  } catch (err) {
    console.error("Get bids error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/bids/mine
router.get("/mine", auth, async (req, res) => {
  try {
    const bids = await Bid.getByUser(req.user.id);
    res.json(bids);
  } catch (err) {
    console.error("Get user bids error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/bids/bid — place a bid (buyer)
router.post("/bid", auth, async (req, res) => {
  try {
    const { product_id, amount } = req.body;
    if (!product_id || !amount) {
      return res.status(400).json({ error: "Product ID and amount required" });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000) {
      return res.status(400).json({ error: "Amount must be between $1 and $1,000,000" });
    }

    // Prevent bidding on own product
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (product.seller_id === req.user.id) {
      return res.status(400).json({ error: "You cannot bid on your own listing" });
    }

    // Prevent duplicate active bid (same user, product, amount, type)
    const existing = await Bid.findDuplicate(product_id, req.user.id, numAmount, "bid");
    if (existing) {
      return res.status(409).json({ error: "You already have an active bid at this price" });
    }

    const bid = await Bid.createBid({ product_id, user_id: req.user.id, amount: numAmount });

    const lowestAsk = await Bid.getLowestAsk(product_id);
    if (lowestAsk && Number(lowestAsk.amount) <= numAmount) {
      await Bid.markMatched(bid.id);
      await Bid.markMatched(lowestAsk.id);
      const order = await Order.create({
        product_id,
        buyer_id: req.user.id,
        seller_id: lowestAsk.user_id,
        price: lowestAsk.amount,
        bid_id: bid.id,
        ask_id: lowestAsk.id,
      });
      return res.status(201).json({ bid, matched: true, order });
    }

    res.status(201).json({ bid, matched: false });
  } catch (err) {
    console.error("Place bid error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/bids/ask — place an ask (seller)
router.post("/ask", auth, async (req, res) => {
  try {
    const { product_id, amount } = req.body;
    if (!product_id || !amount) {
      return res.status(400).json({ error: "Product ID and amount required" });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000) {
      return res.status(400).json({ error: "Amount must be between $1 and $1,000,000" });
    }

    // Prevent asking on own product (seller can't bid AND ask on their own listing)
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Prevent duplicate active ask
    const existing = await Bid.findDuplicate(product_id, req.user.id, numAmount, "ask");
    if (existing) {
      return res.status(409).json({ error: "You already have an active ask at this price" });
    }

    const ask = await Bid.createAsk({ product_id, user_id: req.user.id, amount: numAmount });

    const highestBid = await Bid.getHighestBid(product_id);
    if (highestBid && Number(highestBid.amount) >= numAmount) {
      await Bid.markMatched(ask.id);
      await Bid.markMatched(highestBid.id);
      const order = await Order.create({
        product_id,
        buyer_id: highestBid.user_id,
        seller_id: req.user.id,
        price: numAmount,
        bid_id: highestBid.id,
        ask_id: ask.id,
      });
      return res.status(201).json({ ask, matched: true, order });
    }

    res.status(201).json({ ask, matched: false });
  } catch (err) {
    console.error("Place ask error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/bids/:id — cancel a bid/ask (owner only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const bidId = Number(req.params.id);
    if (!Number.isInteger(bidId) || bidId < 1) {
      return res.status(400).json({ error: "Invalid bid ID" });
    }

    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ error: "Bid not found" });
    }
    if (bid.user_id !== req.user.id) {
      return res.status(403).json({ error: "You can only cancel your own bids" });
    }
    if (bid.status !== "active") {
      return res.status(400).json({ error: "Only active bids can be cancelled" });
    }

    const cancelled = await Bid.cancel(bidId);
    res.json({ message: "Bid cancelled", bid: cancelled });
  } catch (err) {
    console.error("Cancel bid error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
