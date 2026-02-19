# Lesson 2: PostgreSQL with Node.js (node-postgres)

## What You'll Learn
- Designing a relational schema with foreign keys and constraints
- Using the `pg` Pool for database connections
- Writing parameterized queries (no SQL injection)
- Indexes for performance
- Seeding data for development

## Project Context
The StockX Clone uses 4 tables: users, products, bids, orders. All connected with foreign keys.

---

## Part 1: Database Connection

### `server/db.js` (8 lines)
```js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
```

**What's a Pool?**
- A Pool maintains multiple database connections ready to use
- When your code calls `pool.query()`, it grabs an available connection, runs the query, and returns the connection to the pool
- Without a pool, every query would open a new connection (slow) and you could run out of connections under load
- `connectionString` format: `postgres://user@host:port/database`
- `ssl` -- Render's managed Postgres requires SSL. Locally we don't need it

### `.env` (never commit this!)
```
DATABASE_URL=postgres://icaraballo@localhost:5432/stockx_clone
JWT_SECRET=stockx-clone-dev-secret-change-in-prod
```

---

## Part 2: Schema Design

### `server/schema.sql` (50 lines)

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  retail_price DECIMAL(10, 2) NOT NULL,
  size VARCHAR(20),
  category VARCHAR(50) DEFAULT 'sneakers',
  seller_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('bid', 'ask')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'matched', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  buyer_id INTEGER REFERENCES users(id),
  seller_id INTEGER REFERENCES users(id),
  price DECIMAL(10, 2) NOT NULL,
  bid_id INTEGER REFERENCES bids(id),
  ask_id INTEGER REFERENCES bids(id),
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Key concepts:**

**SERIAL PRIMARY KEY** -- auto-incrementing integer. Each new row gets the next number.

**REFERENCES (Foreign Keys):**
- `seller_id INTEGER REFERENCES users(id)` -- this product's seller must exist in the users table
- If you try to insert a product with `seller_id = 999` and no user 999 exists, PostgreSQL rejects it
- This is "referential integrity" -- the database enforces relationships

**CHECK Constraints:**
- `CHECK (type IN ('bid', 'ask'))` -- the database itself rejects any value that isn't 'bid' or 'ask'
- This is a second line of defense after server-side validation

**DECIMAL(10, 2):**
- 10 total digits, 2 after the decimal point
- Range: -99999999.99 to 99999999.99
- Never use FLOAT for money! `0.1 + 0.2 = 0.30000000000000004` in floating point

**VARCHAR vs TEXT:**
- `VARCHAR(50)` -- limited length, good for usernames (database enforces max)
- `TEXT` -- unlimited length, good for descriptions and URLs

### Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_bids_product ON bids(product_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
```

**Why indexes?**
- Without an index, `WHERE brand = 'Nike'` scans every row (slow at 10,000+ products)
- With an index, PostgreSQL jumps directly to matching rows (like an index in a textbook)
- Trade-off: indexes speed up reads but slow down writes (the index must be updated)
- Rule of thumb: index columns you filter by (`WHERE`), join on, or sort by (`ORDER BY`)

---

## Part 3: Writing Queries in Models

### `server/models/User.js`
```js
const pool = require("../db");
const bcrypt = require("bcrypt");

const User = {
  async create(username, password) {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *",
      [username, hash]
    );
    return result.rows[0];
  },

  async findByUsername(username) {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    return result.rows[0] || null;
  },

  async verifyPassword(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
  },
};
```

**Parameterized queries -- the #1 security rule:**
```js
// DANGEROUS -- SQL injection!
pool.query(`SELECT * FROM users WHERE username = '${username}'`);
// If username = "'; DROP TABLE users; --" ... goodbye data

// SAFE -- parameterized
pool.query("SELECT * FROM users WHERE username = $1", [username]);
// PostgreSQL treats $1 as a value, never as SQL code
```

**RETURNING * :**
- `INSERT INTO users (...) VALUES (...) RETURNING *` -- returns the newly created row including its auto-generated `id` and `created_at`
- Without `RETURNING`, you'd need a second query to get the new row

**bcrypt:**
- `bcrypt.hash(password, 10)` -- hashes the password with 10 salt rounds
- `bcrypt.compare(plaintext, hash)` -- compares a password to its hash
- You never store plain passwords. If the database is leaked, hackers still can't read passwords

---

## Part 4: The Bid Matching Engine

### `server/models/Bid.js` (key methods)
```js
async getHighestBid(productId) {
  const result = await pool.query(
    `SELECT * FROM bids WHERE product_id = $1 AND type = 'bid' AND status = 'active'
     ORDER BY amount DESC LIMIT 1`,
    [productId]
  );
  return result.rows[0] || null;
},

async getLowestAsk(productId) {
  const result = await pool.query(
    `SELECT * FROM bids WHERE product_id = $1 AND type = 'ask' AND status = 'active'
     ORDER BY amount ASC LIMIT 1`,
    [productId]
  );
  return result.rows[0] || null;
},
```

**How matching works (in `routes/bids.js`):**
1. Buyer places a bid for $200
2. System checks: is there an active ask at $200 or less?
3. If yes: both bid and ask get marked "matched", an order is created
4. If no: bid stays "active" waiting for a matching ask

This is the same concept as a stock exchange order book!

---

## Part 5: Seeding Data

### `server/seed.js` (200 lines)

The seed script populates the database with test data from local JSON files containing Michael's shoe/clothing images.

```js
const shoesData = require("../client/src/data/shoes.json");
const clothingData = require("../client/src/data/clothing.json");

// Helper to detect brand from product name
const detectBrand = (name) => {
  const n = name.toLowerCase();
  if (n.includes("nike") || n.includes("jordan") || n.includes("dunk")) return "Nike";
  if (n.includes("adidas") || n.includes("yeezy") || n.includes("samba")) return "Adidas";
  if (n.includes("new balance")) return "New Balance";
  return "Nike"; // default
};

// Realistic price ranges by brand
const getPrice = (brand) => {
  const ranges = { Nike: [110,250], Adidas: [100,220], "New Balance": [90,200] };
  const [min,max] = ranges[brand] || [80,180];
  return Math.round(min + Math.random()*(max-min));
};
```

**Seeding patterns:**
- Delete in order (respect foreign keys): orders -> bids -> products -> users
- Create a demo user for testing
- Loop through JSON data, transform filenames into product names
- Use `detectBrand()` for items in the "ALL" category

---

## Exercises

1. **Add a `favorites` table** -- users can favorite products. Design the schema with foreign keys.
2. **Write a query** that returns the top 5 most-bid-on products (hint: `GROUP BY` and `COUNT`).
3. **Add a migration script** that adds a `color` column to the products table without losing existing data.

## Key Takeaways
- Use a connection Pool, not individual connections
- Always use parameterized queries ($1, $2) -- never string interpolation
- Design with foreign keys and CHECK constraints -- let the database enforce rules
- Index columns you frequently search or filter by
- DECIMAL for money, never FLOAT
- `RETURNING *` saves a second query after INSERT/UPDATE/DELETE
