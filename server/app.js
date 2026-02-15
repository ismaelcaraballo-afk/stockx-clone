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

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;
