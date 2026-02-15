const pool = require("../db");

const Bid = {
  async createBid({ product_id, user_id, amount }) {
    const result = await pool.query(
      `INSERT INTO bids (product_id, user_id, amount, type, status)
       VALUES ($1, $2, $3, 'bid', 'active')
       RETURNING *`,
      [product_id, user_id, amount]
    );
    return result.rows[0];
  },

  async createAsk({ product_id, user_id, amount }) {
    const result = await pool.query(
      `INSERT INTO bids (product_id, user_id, amount, type, status)
       VALUES ($1, $2, $3, 'ask', 'active')
       RETURNING *`,
      [product_id, user_id, amount]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query("SELECT * FROM bids WHERE id = $1", [id]);
    return result.rows[0] || null;
  },

  async findDuplicate(productId, userId, amount, type) {
    const result = await pool.query(
      "SELECT * FROM bids WHERE product_id = $1 AND user_id = $2 AND amount = $3 AND type = $4 AND status = 'active' LIMIT 1",
      [productId, userId, amount, type]
    );
    return result.rows[0] || null;
  },

  async cancel(id) {
    const result = await pool.query(
      "UPDATE bids SET status = 'cancelled' WHERE id = $1 AND status = 'active' RETURNING *",
      [id]
    );
    return result.rows[0] || null;
  },

  async getHighestBid(productId) {
    const result = await pool.query(
      "SELECT * FROM bids WHERE product_id = $1 AND type = 'bid' AND status = 'active' ORDER BY amount DESC LIMIT 1",
      [productId]
    );
    return result.rows[0] || null;
  },

  async getLowestAsk(productId) {
    const result = await pool.query(
      "SELECT * FROM bids WHERE product_id = $1 AND type = 'ask' AND status = 'active' ORDER BY amount ASC LIMIT 1",
      [productId]
    );
    return result.rows[0] || null;
  },

  async getByProduct(productId) {
    const result = await pool.query(
      "SELECT b.*, u.username FROM bids b JOIN users u ON b.user_id = u.id WHERE b.product_id = $1 AND b.status = 'active' ORDER BY b.amount DESC",
      [productId]
    );
    return result.rows;
  },

  async getByUser(userId) {
    const result = await pool.query(
      "SELECT b.*, p.name as product_name, p.image_url FROM bids b JOIN products p ON b.product_id = p.id WHERE b.user_id = $1 ORDER BY b.created_at DESC",
      [userId]
    );
    return result.rows;
  },

  async markMatched(bidId) {
    const result = await pool.query(
      "UPDATE bids SET status = 'matched' WHERE id = $1 RETURNING *",
      [bidId]
    );
    return result.rows[0];
  },
};

module.exports = Bid;
