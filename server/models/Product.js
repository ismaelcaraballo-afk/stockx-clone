const pool = require("../db");

const Product = {
  async create({ name, brand, description, image_url, retail_price, size, category, seller_id }) {
    const result = await pool.query(
      `INSERT INTO products (name, brand, description, image_url, retail_price, size, category, seller_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, brand, description, image_url, retail_price, size, category, seller_id]
    );
    return result.rows[0];
  },

  async findAll({ brand, category, search, sort, limit = 20, offset = 0 }) {
    let query = "SELECT p.*, u.username as seller_name FROM products p JOIN users u ON p.seller_id = u.id WHERE 1=1";
    const params = [];
    let idx = 1;

    if (brand) {
      query += ` AND LOWER(p.brand) = LOWER($${idx++})`;
      params.push(brand);
    }
    if (category) {
      query += ` AND LOWER(p.category) = LOWER($${idx++})`;
      params.push(category);
    }
    if (search) {
      query += ` AND (LOWER(p.name) LIKE LOWER($${idx}) OR LOWER(p.brand) LIKE LOWER($${idx}))`;
      params.push(`%${search}%`);
      idx++;
    }

    if (sort === "price_asc") query += " ORDER BY p.retail_price ASC";
    else if (sort === "price_desc") query += " ORDER BY p.retail_price DESC";
    else query += " ORDER BY p.created_at DESC";

    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      "SELECT p.*, u.username as seller_name FROM products p JOIN users u ON p.seller_id = u.id WHERE p.id = $1",
      [id]
    );
    return result.rows[0] || null;
  },

  async findBySeller(sellerId) {
    const result = await pool.query(
      "SELECT * FROM products WHERE seller_id = $1 ORDER BY created_at DESC",
      [sellerId]
    );
    return result.rows;
  },

  async delete(id) {
    // Cancel all active bids/asks first
    await pool.query(
      "UPDATE bids SET status = 'cancelled' WHERE product_id = $1 AND status = 'active'",
      [id]
    );
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = Product;
