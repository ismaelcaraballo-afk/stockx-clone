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
psql -d stockx_clone -f schema.sql
npm run seed
```

This creates the tables and loads **27 sample sneakers** across 8 brands (Nike, Adidas, New Balance, Converse, Vans, Puma, Reebok, ASICS) with 5 demo users, randomized bids/asks, and sample completed orders for price history.

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

### 5. Run Tests (optional but recommended)

```bash
cd server
createdb stockx_clone_test
psql -d stockx_clone_test -f schema.sql
npm test
```

You should see: **58 tests passing, 4 suites** (auth, products, bids, orders).

---

## Project Structure (Your Files)

```
client/src/
├── App.jsx                  — Router with ProtectedRoute (don't touch unless adding pages)
├── api.js                   — API helper with auth (don't touch)
├── index.css                — Global styles (dark theme base)
├── main.jsx                 — Entry point (don't touch)
│
├── components/
│   ├── Navbar.jsx           — Top navigation bar (has Sell + Logout)
│   ├── Navbar.module.css
│   ├── ProductCard.jsx      — Sneaker card in the browse grid
│   ├── ProductCard.module.css
│   ├── SearchBar.jsx        — Search input
│   ├── SearchBar.module.css
│   ├── Skeleton.jsx         — Loading skeleton components (CardSkeleton, DetailSkeleton)
│   ├── ProtectedRoute.jsx   — Auth guard wrapper (redirects to /login if not logged in)
│   ├── Viewer3D.jsx         — 3D shoe viewer (React Three Fiber) ← Ismael built
│   ├── Viewer3D.module.css
│   ├── ARCamera.jsx         — AR camera mode with surface detection ← Ismael built
│   └── ARCamera.module.css
│
└── pages/
    ├── Home.jsx             — Browse page (grid + brand filters + sort dropdown + skeletons)
    ├── Home.module.css
    ├── ProductDetail.jsx    — Single product view + 3D/AR + bid/ask + Buy Now/Sell Now
    ├── ProductDetail.module.css
    ├── Dashboard.jsx        — User's listings, bids, orders (with cancel/delete)
    ├── Dashboard.module.css
    ├── Sell.jsx             — Create new listing form
    ├── Sell.module.css
    ├── Login.jsx            — Login/signup form
    └── Login.module.css
```

---

## What's Already Built (Don't Rebuild These)

Ismael has already implemented these features — you can style them but don't rewrite the logic:

- **3D Viewer** (`Viewer3D.jsx`) — 5 colorways, 5 preset angles, auto-spin, OrbitControls
- **AR Camera** (`ARCamera.jsx`) — Full AR try-on with:
  - Surface detection simulation (scanning → detected → shoe placed on surface)
  - Multi-shoe comparison (place 2 shoes side by side, different colorways)
  - Touch drag, pinch zoom, two-finger rotation
  - Camera flip (front/rear), freeze frame, screenshot
  - 360 auto-spin, first-time hint overlay
- **Loading Skeletons** (`Skeleton.jsx`) — CardGridSkeleton, DetailSkeleton with shimmer
- **ProtectedRoute** — wraps Dashboard and Sell pages
- **Sort dropdown** — already in Home.jsx (price asc/desc/newest)
- **Brand filter buttons** — already in Home.jsx (All, Nike, Adidas, New Balance, etc.)
- **Buy Now / Sell Now** — already in ProductDetail.jsx
- **Cancel bid / Delete listing** — already in Dashboard.jsx
- **Image fallback** — broken image URLs show a placeholder SVG
- **Price history & stats** — shown on ProductDetail (avg, min, max, total sales, last sale)
- **Input validation** — backend validates all inputs (name length, price range, etc.)
- **Rate limiting** — backend has rate limits on auth and bid endpoints

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
| Method | Endpoint | Params/Body | Response |
|--------|----------|-------------|----------|
| GET | `/api/products` | `?search=&brand=&category=&sort=price_asc&limit=20&offset=0` | `[products]` |
| GET | `/api/products/:id` | — | `{ product }` with `seller_name` |
| GET | `/api/products/:id/history` | — | `{ history, stats, lastSale }` |
| POST | `/api/products` | `{ name, brand, description, image_url, retail_price, size, category }` | `{ product }` (auth) |
| DELETE | `/api/products/:id` | — | `{ message }` (auth, seller only) |

### Bids
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/bids/product/:id` | — | `{ bids, highestBid, lowestAsk }` |
| GET | `/api/bids/mine` | — | `[bids]` with `product_name`, `image_url` (auth) |
| POST | `/api/bids/bid` | `{ product_id, amount }` | `{ bid, matched, order? }` (auth) |
| POST | `/api/bids/ask` | `{ product_id, amount }` | `{ ask, matched, order? }` (auth) |
| DELETE | `/api/bids/:id` | — | `{ message, bid }` (auth, owner only) |

### Orders & User
| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/orders` | `[orders]` with `product_name`, `buyer_name`, `seller_name` (auth) |
| GET | `/api/users/me` | `{ user }` (auth) |
| GET | `/api/users/me/listings` | `[products]` (auth) |

**"auth"** means the request must include a token. The `api.js` file handles this automatically — just use `import api from '../api.js'` instead of raw `axios`.

---

## Your Task List by Day

### Day 1 — Get Set Up + Understand the Code
- [ ] Clone repo, install, run both servers, run tests
- [ ] Open http://localhost:3000 and click around — try all pages
- [ ] Read through every file in `client/src/` — understand how data flows
- [ ] Sign up an account, create a listing, place a bid, check dashboard
- [ ] Try the 3D viewer and AR camera on a product page
- [ ] Create a branch: `git checkout -b michael/frontend`

### Day 2 — Polish the Browse Page + Product Cards
- [ ] **Home.jsx** — Make the product grid responsive and clean
- [ ] **ProductCard.jsx** — Add hover animations (scale, shadow, border glow)
- [ ] Style the existing brand filter buttons to look more polished
- [ ] Style the sort dropdown to match the dark theme
- [ ] Make it look like StockX (reference: stockx.com)
- [ ] Make sure loading skeletons look good (already wired up)

### Day 3 — Product Detail + Bid/Ask UX
- [ ] **ProductDetail.jsx** — Polish the layout (image left, info right on desktop)
- [ ] Style the bid/ask buttons to look like StockX (green for Buy, red for Sell)
- [ ] Style the Buy Now / Sell Now buttons (already wired up)
- [ ] Add success/error toast or feedback when placing a bid/ask
- [ ] Style the price history section and stats row
- [ ] Style the 3D/AR view toggle buttons
- [ ] Make sure image fallback placeholder looks clean

### Day 4 — Dashboard + Login + Sell + Responsive
- [ ] **Dashboard.jsx** — Style the tabs (My Listings / My Bids / Orders)
- [ ] Style cancel bid and delete listing buttons (already functional)
- [ ] **Login.jsx** — Make it clean and centered
- [ ] **Sell.jsx** — Style the create listing form, image preview
- [ ] Make ALL pages responsive (looks good on phone screens)
- [ ] Add empty states (no bids yet, no orders yet) with helpful messages

### Day 5 — Final Polish + Presentation
- [ ] Fix any visual bugs across all pages
- [ ] Test the full flow: signup → browse → bid → check dashboard → create listing
- [ ] Test AR on mobile (surface detection + compare mode)
- [ ] Help with presentation slides/talking points
- [ ] Make sure everything is committed and pushed

---

## Git Workflow

**ALWAYS work on your branch:**
```bash
git checkout -b michael/frontend
```

**Pull latest changes from Ismael before starting work:**
```bash
git checkout main
git pull origin main
git checkout michael/frontend
git merge main
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

### Using the loading skeletons:
```jsx
import { CardGridSkeleton, DetailSkeleton } from '../components/Skeleton.jsx'

// While loading:
if (loading) return <CardGridSkeleton />

// For product detail:
if (loading) return <DetailSkeleton />
```

---

## Questions?

Ask Ismael. He built the backend, he knows how everything connects. Don't spend more than 15 minutes stuck on something — just ask.

---

## AI Prompt for Michael

If you're using Claude, Copilot, ChatGPT, or any AI assistant, paste this prompt at the start of your session to give it full context:

```
I'm Michael, working on the frontend of a StockX clone for a class project (1-week sprint, due Saturday). My partner Ismael built the backend (Express 5, PostgreSQL, JWT auth) and the 3D/AR features. I'm handling frontend styling and polish.

Tech stack:
- React 19 + Vite
- React Router for navigation
- Axios for API calls (client/src/api.js handles JWT automatically)
- CSS Modules for styling (each component has its own .module.css)
- React Three Fiber + drei for 3D (already built, don't touch)
- Dark theme (#0e0e0e background, #1a1a1a cards, #08a05c green accent, #d63031 red accent)

Project structure:
- client/src/pages/ — Home.jsx, ProductDetail.jsx, Dashboard.jsx, Login.jsx, Sell.jsx
- client/src/components/ — Navbar, ProductCard, SearchBar, Skeleton, ProtectedRoute, Viewer3D, ARCamera
- server/ — Express API at /api (proxied by Vite, runs on port 3001)

What's already built and working (don't rebuild):
- 3D shoe viewer with 5 colorways and preset angles
- AR camera with surface detection, multi-shoe compare, gestures
- Loading skeletons (CardGridSkeleton, DetailSkeleton)
- Brand filter buttons + sort dropdown on browse page
- Buy Now / Sell Now instant buttons
- Cancel bid / Delete listing on dashboard
- Price warnings when bidding 50%+ above or below retail
- Token expiry handling (auto-redirect to login)
- Self-bid prevention and duplicate bid blocking on backend
- Empty search results with "Clear Filters" button
- Login prompt shown when not authenticated on product page
- 58 backend tests passing across 4 suites

My tasks:
1. Make ProductCard hover animations polished (scale, shadow, glow)
2. Make all pages responsive (mobile-friendly)
3. Style the Dashboard tabs nicely
4. Style the Login page (centered, clean)
5. Style the Sell page form
6. Add success/error toast feedback on bid/ask actions
7. Add empty state messages on Dashboard ("No bids yet", "No orders yet")
8. Make it look as close to stockx.com as possible
9. Test the full flow on mobile

I work on branch michael/frontend and Ismael merges to main.
Don't push to main directly.
The backend runs on port 3001, frontend on 3000.
Vite proxies /api to the backend.
```

Copy and paste this into your AI tool at the start of each session. It will know exactly what to help you with.
