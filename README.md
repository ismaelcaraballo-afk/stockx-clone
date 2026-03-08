# StockX Clone — Sneaker & Streetwear Marketplace

A full-stack e-commerce marketplace inspired by StockX. Browse sneakers and streetwear, place bids, and track orders — with AR try-on and 3D product viewing.

Built as a Pursuit L2 project by Ismael Caraballo and Michael.

---

## What It Does

- **Product Catalog** — Sneakers and clothing with real brand inventory (Supreme, BAPE, Fear of God, Nike, etc.)
- **Bidding System** — Place and manage bids on products, core StockX mechanic
- **Orders** — Full order flow from bid to purchase
- **AR Camera** — Try-on feature using device camera
- **3D Viewer** — Inspect products in 3D using Three.js
- **Authentication** — JWT-based signup/login with protected routes
- **Dashboard** — Personal portfolio/watchlist view

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + CSS Modules |
| 3D / AR | Three.js + React Three Fiber + React Three Drei |
| Charts | Recharts |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Rate Limiting | express-rate-limit |
| Testing | Jest + Supertest |

---

## Quick Start

```bash
# Backend
cd server && npm install
cp .env.example .env  # add DATABASE_URL and JWT_SECRET
node index.js         # runs on http://localhost:3000

# Frontend
cd client && npm install
npm run dev           # runs on http://localhost:5173
```

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Login, returns JWT |
| `/api/products` | GET | List all products |
| `/api/products/:id` | GET | Product detail |
| `/api/bids` | GET/POST | View/place bids |
| `/api/orders` | GET/POST | View/create orders |
| `/api/users/:id` | GET | User profile |

---

## Testing

11 test suites covering auth, bids, orders, products, users, and integration flows.

```bash
cd server && npm test
```

---

## Team

- **Ismael Caraballo** ([@ismaelcaraballo-afk](https://github.com/ismaelcaraballo-afk)) — Backend, database, auth, bidding system
- **Michael** — Frontend, UI components, product catalog
