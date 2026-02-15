# Michael's Frontend Guide — StockX Clone

Hey Michael! This guide will get you set up and working on the frontend. Ismael built the backend and the scaffold — your job is to make it look good, work smoothly, and connect everything to the API.

---

## Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/ismaelcaraballo-afk/stockx-clone.git
cd stockx-clone
```

### 2. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 3. Set Up the Database

Make sure PostgreSQL is running, then:

```bash
cd server
createdb stockx_clone
npm run seed
```

This creates the tables and loads 8 sample sneakers.

### 4. Start Both Servers

Open **two terminal tabs**:

**Tab 1 — Backend:**
```bash
cd stockx-clone/server
npm run dev
```
You should see: `Server running on port 3001`

**Tab 2 — Frontend:**
```bash
cd stockx-clone/client
npm run dev
```
You should see: `Local: http://localhost:3000/`

Open **http://localhost:3000** in your browser. You should see sneakers.

---

## Project Structure (Your Files)

```
client/src/
├── App.jsx                  — Router (don't touch unless adding pages)
├── api.js                   — API helper with auth (don't touch)
├── index.css                — Global styles (dark theme base)
├── main.jsx                 — Entry point (don't touch)
│
├── components/
│   ├── Navbar.jsx           — Top navigation bar
│   ├── Navbar.module.css
│   ├── ProductCard.jsx      — Sneaker card in the browse grid
│   ├── ProductCard.module.css
│   ├── SearchBar.jsx        — Search input
│   └── SearchBar.module.css
│
└── pages/
    ├── Home.jsx             — Browse page (grid + filters)
    ├── Home.module.css
    ├── ProductDetail.jsx    — Single product view + bid/ask
    ├── ProductDetail.module.css
    ├── Dashboard.jsx        — User's listings, bids, orders
    ├── Dashboard.module.css
    ├── Login.jsx            — Login/signup form
    └── Login.module.css
```

---

## How Styling Works

We use **CSS Modules**. Each component has its own `.module.css` file.

```jsx
// In your component:
import styles from './Navbar.module.css'

// Use it like this:
<div className={styles.nav}>
```

CSS classes are scoped to the component — no conflicts. The theme colors are:

| Color | Use | Hex |
|-------|-----|-----|
| Background | Page background | `#0e0e0e` |
| Card/Surface | Cards, inputs | `#1a1a1a` |
| Border | Borders, dividers | `#333` |
| Green | Buttons, prices, accents | `#08a05c` |
| Red | Sell/ask buttons | `#d63031` |
| White | Headings | `#ffffff` |
| Gray | Secondary text | `#888` |
| Light gray | Body text | `#ccc` |

---

## API Endpoints (What the Backend Gives You)

All requests go through `/api/...` — the Vite proxy forwards them to the backend.

### Auth
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/auth/signup` | `{ username, password }` | `{ token, user }` |
| POST | `/api/auth/login` | `{ username, password }` | `{ token, user }` |
| POST | `/api/auth/guest` | none | `{ token, user }` |

### Products
| Method | Endpoint | Params | Response |
|--------|----------|--------|----------|
| GET | `/api/products` | `?search=&brand=&category=&sort=price_asc` | `[products]` |
| GET | `/api/products/:id` | — | `{ product }` |
| POST | `/api/products` | `{ name, brand, description, image_url, retail_price, size, category }` | `{ product }` (needs auth) |

### Bids
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/bids/product/:id` | — | `{ bids, highestBid, lowestAsk }` |
| GET | `/api/bids/mine` | — | `[bids]` (needs auth) |
| POST | `/api/bids/bid` | `{ product_id, amount }` | `{ bid, matched, order? }` (needs auth) |
| POST | `/api/bids/ask` | `{ product_id, amount }` | `{ ask, matched, order? }` (needs auth) |

### Orders & User
| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/orders` | `[orders]` (needs auth) |
| GET | `/api/users/me` | `{ user }` (needs auth) |
| GET | `/api/users/me/listings` | `[products]` (needs auth) |

**"Needs auth"** means the request must include a token. The `api.js` file handles this automatically — just use `import api from '../api.js'` instead of raw `axios`.

---

## Your Task List by Day

### Day 1 — Get Set Up + Understand the Code
- [ ] Clone repo, install, run both servers
- [ ] Open http://localhost:3000 and click around
- [ ] Read through every file in `client/src/` — understand how data flows
- [ ] Sign up an account via the Login page, verify it works
- [ ] Create a branch: `git checkout -b michael/frontend`

### Day 2 — Polish the Browse Page
- [ ] **Home.jsx** — Make the product grid responsive and clean
- [ ] **ProductCard.jsx** — Add hover animations (scale, shadow, border glow)
- [ ] **SearchBar.jsx** — Add a sort dropdown (Price Low-High, Price High-Low, Newest)
- [ ] Add brand filter buttons that highlight when active
- [ ] Make it look like StockX (reference: stockx.com)

### Day 3 — Product Detail + Bid/Ask UX
- [ ] **ProductDetail.jsx** — Polish the layout (image left, info right)
- [ ] Style the bid/ask buttons to look like StockX (green for Buy, red for Sell)
- [ ] Add success/error feedback when placing a bid or ask
- [ ] Add a "Buy Now" shortcut that auto-bids at the lowest ask price
- [ ] Add loading spinners while data is fetching

### Day 4 — Dashboard + Login + Responsive
- [ ] **Dashboard.jsx** — Style the tabs, add icons or counts
- [ ] **Login.jsx** — Make it clean and centered
- [ ] Make ALL pages responsive (looks good on phone screens)
- [ ] Add a logout button to the Navbar
- [ ] Add empty states (no bids yet, no orders yet) with helpful messages

### Day 5 — Final Polish + Presentation
- [ ] Fix any visual bugs
- [ ] Test the full flow: signup → browse → bid → check dashboard
- [ ] Help Ismael integrate the 3D viewer styling
- [ ] Prep for presentation

---

## Git Workflow

**ALWAYS work on your branch:**
```bash
git checkout -b michael/frontend
```

**Save your work often:**
```bash
git add .
git commit -m "polish product card hover effects"
git push origin michael/frontend
```

**DO NOT** push to `main` directly. When your feature is ready, tell Ismael and he'll merge it.

**If you get a merge conflict**, don't panic. Tell Ismael and you'll fix it together.

---

## Common Patterns

### Fetching data from the API:
```jsx
import { useState, useEffect } from 'react'
import api from '../api.js'

const [products, setProducts] = useState([])

useEffect(() => {
  api.get('/api/products').then((res) => setProducts(res.data))
}, [])
```

### Checking if user is logged in:
```jsx
const user = JSON.parse(localStorage.getItem('user') || 'null')
if (user) {
  // logged in
}
```

### Navigating to another page:
```jsx
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()
navigate('/product/5')
```

---

## Questions?

Ask Ismael. He built the backend, he knows how everything connects. Don't spend more than 15 minutes stuck on something — just ask.
