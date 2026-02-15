const express = require("express");
const auth = require("../middleware/auth");
const Bid = require("../models/Bid");
const Order = require("../models/Order");

const router = express.Router();

// GET /api/bids/product/:productId — get bids/asks for a product
router.get("/product/:productId", async (req, res) => {
  try {
    const bids = await Bid.getByProduct(req.params.productId);
    const highest = await Bid.getHighestBid(req.params.productId);
    const lowest = await Bid.getLowestAsk(req.params.productId);
    res.json({ bids, highestBid: highest, lowestAsk: lowest });
  } catch (err) {
    console.error("Get bids error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/bids/mine — get current user's bids
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
    const bid = await Bid.createBid({ product_id, user_id: req.user.id, amount });

    // Check if there's a matching ask (lowest ask <= bid amount)
    const lowestAsk = await Bid.getLowestAsk(product_id);
    if (lowestAsk && lowestAsk.amount <= amount) {
      // Match! Create an order
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
    const ask = await Bid.createAsk({ product_id, user_id: req.user.id, amount });

    // Check if there's a matching bid (highest bid >= ask amount)
    const highestBid = await Bid.getHighestBid(product_id);
    if (highestBid && highestBid.amount >= amount) {
      // Match! Create an order
      await Bid.markMatched(ask.id);
      await Bid.markMatched(highestBid.id);
      const order = await Order.create({
        product_id,
        buyer_id: highestBid.user_id,
        seller_id: req.user.id,
        price: amount,
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

module.exports = router;
