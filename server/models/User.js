const pool = require("../db");
const bcrypt = require("bcrypt");

const User = {
  async create(username, password) {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at",
      [username, hash]
    );
    return result.rows[0];
  },

  async findByUsername(username) {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await pool.query("SELECT id, username, created_at FROM users WHERE id = $1", [id]);
    return result.rows[0] || null;
  },

  async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  },
};

module.exports = User;
