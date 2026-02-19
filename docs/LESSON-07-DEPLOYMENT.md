# Lesson 7: Deploying a Full-Stack App to Render

## What You'll Learn
- How production deployment differs from local development
- Render Blueprints (infrastructure as code)
- Serving a React SPA from Express in production
- Environment variables and secrets management
- Database provisioning and seeding in production
- Common deployment pitfalls and how to fix them

## Project Context
The StockX Clone runs locally with two separate processes (Vite dev server on 3002, Express on 3001). In production, we serve everything from a single Express server on Render's free tier.

---

## Part 1: The Dev vs Production Problem

**In development:**
```
Browser -> localhost:3002 (Vite)  -- serves React app
               |
               | Vite proxy: /api/* -> localhost:3001
               v
           localhost:3001 (Express) -- serves API
               |
               v
           localhost:5432 (PostgreSQL)
```

The client uses relative paths like `/api/products`. Vite's dev proxy intercepts these and forwards them to Express.

**In production there's no Vite dev server.** So who serves the React app? And who handles `/api/*` calls?

**Solution: Express serves everything.**

```
Browser -> stockx-clone.onrender.com (Express)
               |
               |-- /api/* -> Express route handlers
               |-- /* -> client/dist/index.html (React SPA)
               |
               v
           Render PostgreSQL (managed)
```

---

## Part 2: Making Express Serve the Frontend

### `server/app.js` (added at the end)
```js
// --- Production: serve React frontend ---
if (process.env.NODE_ENV === "production") {
  const path = require("path");

  // Serve static files (JS, CSS, images) from the built React app
  app.use(express.static(path.join(__dirname, "..", "client", "dist")));

  // For any non-API route, serve index.html (React Router handles routing)
  app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "client", "dist", "index.html"));
  });
}
```

**Why this works:**
1. `express.static` serves files from `client/dist/` -- the JS bundle, CSS, images
2. The catch-all `/{*splat}` serves `index.html` for any URL that isn't a file or API route
3. React Router then reads the URL and renders the correct page client-side
4. `NODE_ENV === "production"` -- only in production. Locally, Vite handles this

**Why `/{*splat}` and not `*`?**
Express 5 uses a newer path-to-regexp that requires named parameters. The old `*` wildcard doesn't work anymore.

**Order matters:**
```
1. API routes      (/api/products, /api/auth/login, etc.)
2. Static files    (/assets/index-abc123.js, /Shoes/NIKE/shoe.avif)
3. Catch-all       (everything else -> index.html)
```

If catch-all was before API routes, `/api/products` would return index.html!

---

## Part 3: Render Blueprint

### `render.yaml` (18 lines)
```yaml
databases:
  - name: stockx-clone-db
    plan: free

services:
  - type: web
    name: stockx-clone
    runtime: node
    plan: free
    buildCommand: cd client && npm install --include=dev && npx vite build && cd ../server && npm install
    startCommand: cd server && node index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: stockx-clone-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
```

**What each section does:**

**databases:** Creates a managed PostgreSQL instance. Render handles backups, updates, SSL.

**buildCommand:** Runs during deploy:
1. `cd client && npm install --include=dev` -- install React, Vite, etc. (`--include=dev` because Vite is a devDependency but we need it to build)
2. `npx vite build` -- compile React app to static files in `dist/`
3. `cd ../server && npm install` -- install Express, pg, bcrypt, etc.

**startCommand:** `cd server && node index.js` -- start the Express server

**envVars:**
- `NODE_ENV: production` -- enables static serving, SSL on database connection
- `DATABASE_URL: fromDatabase` -- Render auto-injects the connection string for the managed database
- `JWT_SECRET: generateValue` -- Render generates a random secret (don't hardcode secrets!)

---

## Part 4: Database in Production

### SSL Connection
```js
// server/db.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
```

Render's PostgreSQL requires SSL. Without this, you get: `error: no pg_hba.conf entry for host`.

### Seeding Without Shell Access
Render's free tier doesn't have a shell. We added an API endpoint:

```js
app.get("/api/seed", async (req, res) => {
  // Run schema.sql to create tables
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);

  // Check if already seeded
  const check = await pool.query("SELECT COUNT(*) FROM products");
  if (parseInt(check.rows[0].count) > 0) {
    return res.json({ message: "Already seeded", products: check.rows[0].count });
  }

  // Seed products from local JSON...
  res.json({ message: "Seeded!", products: count });
});
```

Visit `https://your-app.onrender.com/api/seed` once to populate the database. It's idempotent -- hitting it again returns "Already seeded".

---

## Part 5: Pitfalls We Hit (and How We Fixed Them)

### 1. "vite: not found"
**Problem:** Render sets `NODE_ENV=production`, which makes `npm install` skip devDependencies. Vite is a devDependency.
**Fix:** `npm install --include=dev` forces all deps to install.

### 2. "Missing parameter name at index 1: *"
**Problem:** Express 5 uses a newer `path-to-regexp` that doesn't accept bare `*`.
**Fix:** Change `app.get("*", ...)` to `app.get("/{*splat}", ...)`.

### 3. Products API returns empty []
**Problem:** Product model used `JOIN users ON seller_id = users.id`. Seeded products had `seller_id = NULL`, so `JOIN` excluded them.
**Fix:** Change `JOIN` to `LEFT JOIN` so products without a seller still appear.

### 4. Database SSL error
**Problem:** Render PostgreSQL requires SSL. Local PostgreSQL doesn't.
**Fix:** Conditional SSL: `ssl: NODE_ENV === "production" ? { rejectUnauthorized: false } : false`.

---

## Part 6: The Root package.json

### `package.json` (root)
```json
{
  "name": "stockx-clone",
  "private": true,
  "scripts": {
    "build": "cd client && npm install && npm run build",
    "start": "cd server && node index.js",
    "seed": "cd server && node seed.js"
  }
}
```

### `.nvmrc`
```
20
```

Tells Render to use Node.js 20 (LTS). Without this, Render picks its default which may differ from your local version.

---

## Exercises

1. **Add a custom domain**: Research how to point a custom domain (e.g., stockx-clone.com) to your Render app.
2. **Add environment-specific CORS**: Instead of `cors({ origin: "*" })`, restrict to your Render URL in production.
3. **Set up auto-deploy**: Configure Render to automatically deploy when you push to the `main` branch.

## Key Takeaways
- In production, Express serves both the API and the built React app
- Render Blueprints define your infrastructure as code (database + web service)
- `--include=dev` when you need devDependencies in the build step
- Always use environment variables for secrets, never hardcode them
- `LEFT JOIN` vs `JOIN` matters when data has nullable foreign keys
- Test your production setup locally: `NODE_ENV=production node server/index.js`
- Free tier has trade-offs: cold starts (~30s), no shell access, DB expires after 90 days
