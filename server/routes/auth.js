const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }
    const existing = await User.findByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }
    const user = await User.create(username, password);
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.status(201).json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const valid = await User.verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/guest
router.post("/guest", async (req, res) => {
  try {
    const guestName = "guest_" + Date.now();
    const guestPass = "gp_" + Math.random().toString(36).slice(2);
    const user = await User.create(guestName, guestPass);
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.status(201).json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error("Guest login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
