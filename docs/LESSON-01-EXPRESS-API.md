# Lesson 1: Building a REST API with Express 5

## What You'll Learn
- How Express apps are structured (app.js, routes, models, middleware)
- RESTful route design (GET, POST, DELETE)
- Input validation and error handling
- Rate limiting for production security

## Project Context
The StockX Clone backend is a REST API that handles products, bids/asks, orders, and authentication. Every endpoint follows `/api/resource` convention.

---

## Part 1: The Entry Point

### `server/index.js` (5 lines)
```js
const app = require("./app");
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**What's happening:**
- `require("./app")` imports the configured Express app
- `process.env.PORT || 3001` -- in production (Render), the host injects a PORT. Locally we use 3001
- This separation matters: `app.js` exports the app without starting it, so tests can import the app without binding to a port

### `server/app.js` (70 lines)
```js
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));
```

**Key concepts:**
- `cors({ origin: "*" })` -- allows any frontend to call this API. In production you'd restrict this to your domain
- `express.json({ limit: "1mb" })` -- parses JSON request bodies. The limit prevents someone from sending a 100MB payload to crash your server
- `require("dotenv").config()` -- loads `.env` file variables into `process.env`

### Rate Limiting
```js
if (process.env.NODE_ENV !== "test") {
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 500,                   // 500 requests per window
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,                    // Only 20 login attempts per 15 min
  });

  app.use("/api", globalLimiter);
  app.use("/api/auth", authLimiter);
}
```

**Why different limits?**
- Global: 500 requests/15min is generous for normal browsing
- Auth: 20 requests/15min prevents brute-force password attacks
- Bids: 30 requests/min prevents someone from flooding the market
- `NODE_ENV !== "test"` -- skip rate limiting during tests so they don't get blocked

### Route Mounting
```js
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
```

**How mounting works:**
When you do `app.use("/api/products", productRoutes)`, every route in `productRoutes` gets prefixed. So `router.get("/")` becomes `GET /api/products/`, and `router.get("/:id")` becomes `GET /api/products/:id`.

---

## Part 2: Building a Route File

### `server/routes/products.js` (130 lines)

This is the most complete CRUD example in the project.

#### READ -- List products with filtering
```js
router.get("/", async (req, res) => {
  try {
    const { brand, category, search, sort, limit, offset } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const products = await Product.findAll({
      brand, category, search, sort,
      limit: safeLimit, offset: safeOffset
    });
    res.json(products);
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
```

**Walkthrough:**
1. `req.query` -- everything after `?` in the URL. `/api/products?brand=Nike&sort=price_asc` gives `{ brand: "Nike", sort: "price_asc" }`
2. `safeLimit` -- clamp between 1 and 100. Never trust user input
3. Delegate to `Product.findAll()` -- the route doesn't write SQL, the model does
4. `try/catch` with `500` response -- never leak stack traces to users

#### CREATE -- List a new product (auth required)
```js
router.post("/", auth, async (req, res) => {
  let { name, brand, description, image_url, retail_price, size, category } = req.body;

  // Validation
  if (!name || !brand || !retail_price) {
    return res.status(400).json({ error: "Name, brand, and retail price required" });
  }

  name = String(name).trim();
  const numPrice = Number(retail_price);
  if (isNaN(numPrice) || numPrice <= 0 || numPrice > 1000000) {
    return res.status(400).json({ error: "Price must be between $1 and $1,000,000" });
  }

  const product = await Product.create({ name, brand, ... });
  res.status(201).json(product);
});
```

**Key patterns:**
- `auth` middleware before the handler -- only logged-in users can create
- **Validate everything**: check required fields, trim strings, verify numbers
- `res.status(201)` -- 201 means "Created", not just 200 OK

#### DELETE -- Remove a listing (owner only)
```js
router.delete("/:id", auth, async (req, res) => {
  const product = await Product.findById(id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (product.seller_id !== req.user.id) {
    return res.status(403).json({ error: "You can only delete your own listings" });
  }
  await Product.delete(id);
  res.json({ message: "Product deleted" });
});
```

**Authentication vs Authorization:**
1. `auth` -- confirms they're logged in (authentication = "who are you?")
2. `seller_id !== req.user.id` -- confirms they own it (authorization = "are you allowed?")

---

## Part 3: The Model Layer

### `server/models/Product.js` (65 lines)

Models are plain objects with async methods. No ORM -- just raw SQL with parameterized queries.

#### Dynamic Query Builder
```js
async findAll({ brand, category, search, sort, limit = 20, offset = 0 }) {
  let query = "SELECT p.*, u.username as seller_name FROM products p LEFT JOIN users u ON p.seller_id = u.id WHERE 1=1";
  const params = [];
  let idx = 1;

  if (brand) {
    query += ` AND LOWER(p.brand) = LOWER($${idx++})`;
    params.push(brand);
  }
  if (search) {
    query += ` AND (LOWER(p.name) LIKE LOWER($${idx}) OR LOWER(p.brand) LIKE LOWER($${idx}))`;
    params.push(`%${search}%`);
    idx++;
  }

  query += ` LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}
```

**Why this matters:**
- `WHERE 1=1` -- a trick so every condition can start with `AND`
- `$${idx++}` -- parameterized queries prevent SQL injection. The `$1`, `$2` placeholders are replaced safely by PostgreSQL
- `LOWER()` -- case-insensitive matching so "nike" finds "Nike"
- `LIKE` with `%search%` -- partial matching for search

---

## Exercises

1. **Add a PATCH route** to update a product's price. Only the seller should be able to do this.
2. **Add pagination info** to GET /products: return `{ products: [...], total: 500, page: 1, pages: 25 }` instead of just the array.
3. **Add a search route** `GET /api/products/search/:query` that searches name, brand, and description.

## Key Takeaways
- Separate concerns: `index.js` (start), `app.js` (configure), `routes/` (handle), `models/` (database)
- Always validate input on the server -- never trust the client
- Use parameterized queries (`$1`, `$2`) to prevent SQL injection
- Use appropriate HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Server Error)
