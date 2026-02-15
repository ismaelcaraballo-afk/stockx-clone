const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const bidRoutes = require("./routes/bids");
const orderRoutes = require("./routes/orders");
const userRoutes = require("./routes/users");

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

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

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
