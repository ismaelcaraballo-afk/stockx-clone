# Lesson 4: React Routing and State Management

## What You'll Learn
- React Router v7 setup (BrowserRouter, Routes, Route)
- Dynamic routes with useParams
- State management with useState and useEffect
- API data fetching patterns
- Conditional rendering and loading states
- Offline fallback patterns

## Project Context
The StockX Clone frontend is a React 19 SPA with 5 pages connected by React Router. No Redux or Context API for state -- just local useState + API calls.

---

## Part 1: App Structure and Routing

### `client/src/App.jsx` (28 lines)
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
```

**What each piece does:**
- `<BrowserRouter>` -- enables client-side routing (URL changes without page reload)
- `<Navbar />` -- outside of `<Routes>`, so it appears on every page
- `<ToastProvider>` -- wraps everything so any page can show toast notifications
- `/product/:id` -- dynamic route. `:id` is a parameter that changes (e.g., `/product/42`)
- `<ProtectedRoute>` -- wrapper that redirects to login if not authenticated

---

## Part 2: Home Page -- Fetching, Filtering, Fallback

### `client/src/pages/Home.jsx` (146 lines)

#### State Setup
```jsx
export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [useFallback, setUseFallback] = useState(false)
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState('')
```

Five pieces of state, each with a clear purpose:
- `products` -- the array of products to display
- `loading` -- show skeleton while fetching
- `useFallback` -- true when backend is down
- `search`, `brand`, `sort` -- current filter values

#### Data Fetching with useEffect
```jsx
useEffect(() => {
  setLoading(true)
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (brand) params.set('brand', brand)
  if (sort) params.set('sort', sort)
  api
    .get(`/api/products?${params}&limit=100`)
    .then((res) => {
      setProducts(res.data || [])
      setUseFallback(false)
      setLoading(false)
    })
    .catch(() => {
      // Offline fallback -- use local JSON data
      let list = brandKey ? shoesToProducts(shoesData[brandKey] || []) : FALLBACK_PRODUCTS
      if (search) {
        const q = search.toLowerCase()
        list = list.filter((p) => p.name.toLowerCase().includes(q))
      }
      setProducts(list)
      setUseFallback(true)
      setLoading(false)
    })
}, [search, brand, sort])
```

**Dependency array `[search, brand, sort]`:**
- This effect re-runs whenever search, brand, or sort changes
- User types in search box -> `setSearch("nike")` -> useEffect fires -> new API call with `?search=nike`

**URLSearchParams:**
- Clean way to build query strings. Only includes non-empty values
- `new URLSearchParams()` + `.set('brand', 'Nike')` = `"brand=Nike"`

**Offline fallback pattern:**
- If the API call fails (backend down, network error), fall back to local JSON files
- The local shoe/clothing data is bundled with the frontend
- Still supports filtering by brand and search -- just on the local data
- Shows an offline banner so users know they're seeing cached data

#### Conditional Rendering
```jsx
{loading ? (
  <CardGridSkeleton count={8} />
) : (
  products.map((p) => <ProductCard key={p.id} product={p} />)
)}

{!loading && products.length === 0 && (
  <div className={styles.emptyState}>
    <p>No sneakers found</p>
    <button onClick={clearFilters}>Clear Filters</button>
  </div>
)}
```

Three states: loading (skeleton), data (product grid), empty (no results message).

---

## Part 3: Product Detail -- Multiple API Calls

### `client/src/pages/ProductDetail.jsx` (237 lines)

#### Reading URL Parameters
```jsx
import { useParams, useNavigate } from 'react-router-dom'

export default function ProductDetail() {
  const { id } = useParams()    // /product/42 -> id = "42"
  const navigate = useNavigate() // programmatic navigation
```

#### Parallel Data Fetching
```jsx
useEffect(() => {
  api.get(`/api/products/${id}`).then((res) => setProduct(res.data))
  api.get(`/api/bids/product/${id}`).then((res) => setBidData(res.data))
  api.get(`/api/products/${id}/history`).then((res) => setHistory(res.data))
}, [id])
```

Three API calls fire simultaneously (not awaited sequentially). Each updates its own state when it resolves. This is faster than:
```jsx
// SLOWER -- sequential
const product = await api.get(`/api/products/${id}`)
const bids = await api.get(`/api/bids/product/${id}`)
const history = await api.get(`/api/products/${id}/history`)
```

#### Refresh After Actions
```jsx
const refreshData = () => {
  api.get(`/api/bids/product/${id}`).then((r) => setBidData(r.data))
  api.get(`/api/products/${id}/history`).then((r) => setHistory(r.data))
}

const placeBid = async () => {
  const res = await api.post('/api/bids/bid', {
    product_id: Number(id), amount: Number(bidAmount)
  })
  showMsg(res.data.matched ? 'Bid matched! Order created.' : 'Bid placed!')
  setBidAmount('')
  refreshData() // update bid/ask display and price history
}
```

After placing a bid, we refresh the bids and history -- but NOT the product itself (it didn't change). Efficient updates.

#### Buy Now / Sell Now
```jsx
const buyNow = async () => {
  if (!bidData.lowestAsk) return
  await api.post('/api/bids/bid', {
    product_id: Number(id),
    amount: Number(bidData.lowestAsk.amount) // bid at exactly the lowest ask
  })
  refreshData()
}
```

"Buy Now" places a bid at exactly the lowest ask price, guaranteeing an instant match. Same concept as "market order" in stock trading.

---

## Part 4: Filter Buttons as State

```jsx
const brands = ['All', 'Nike', 'Adidas', 'New Balance', 'Converse', 'Vans', 'Puma', 'ASICS']

<div className={styles.filters}>
  {brands.map((b) => (
    <button
      key={b}
      className={`${styles.filterBtn} ${(b === 'All' ? '' : b) === brand ? styles.active : ''}`}
      onClick={() => setBrand(b === 'All' ? '' : b)}
    >
      {b}
    </button>
  ))}
</div>
```

- Clicking "Nike" sets `brand` state to "Nike"
- Clicking "All" sets `brand` to "" (empty = no filter)
- The active button gets an extra CSS class
- Since `brand` is in the useEffect dependency array, changing it automatically triggers a new API call

---

## Exercises

1. **Add URL-based filters**: When the user selects "Nike", update the URL to `/?brand=Nike`. On page load, read the URL params and set initial filter state. (Hint: `useSearchParams`)
2. **Add infinite scroll**: Instead of loading 100 products at once, load 20 at a time and fetch more when the user scrolls to the bottom.
3. **Add a favorites page**: Store favorite product IDs in localStorage. Show a heart icon on ProductCard that toggles the favorite.

## Key Takeaways
- `useEffect` with a dependency array re-runs when those values change -- perfect for fetching on filter change
- Fire multiple independent API calls in parallel (don't await sequentially)
- Always handle loading, data, and empty states in your UI
- `useParams()` reads URL parameters from dynamic routes
- Offline fallback: catch API errors and use local data as backup
