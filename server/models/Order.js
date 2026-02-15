const pool = require("../db");

const Order = {
  async create({ product_id, buyer_id, seller_id, price, bid_id, ask_id }) {
    const result = await pool.query(
      `INSERT INTO orders (product_id, buyer_id, seller_id, price, bid_id, ask_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'completed')
       RETURNING *`,
      [product_id, buyer_id, seller_id, price, bid_id, ask_id]
    );
    return result.rows[0];
  },

  async getByUser(userId) {
    const result = await pool.query(
      `SELECT o.*, p.name as product_name, p.image_url,
              buyer.username as buyer_name, seller.username as seller_name
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON o.seller_id = seller.id
       WHERE o.buyer_id = $1 OR o.seller_id = $1
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return result.rows;
  },
};

module.exports = Order;
