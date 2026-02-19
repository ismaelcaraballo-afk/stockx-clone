# Lesson 3: JWT Authentication (Full Stack)

## What You'll Learn
- How JWT tokens work (encode, sign, verify)
- Server: signup/login routes, auth middleware
- Client: Axios interceptors, localStorage, protected routes
- The complete auth flow from signup to protected API call

## Project Context
The StockX Clone uses JWT tokens for stateless auth. No sessions, no cookies -- just a token in every request header.

---

## Part 1: How JWT Works

A JWT (JSON Web Token) has 3 parts separated by dots:
```
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJkZW1vIn0.abc123signature
|---- Header ----|  |-------- Payload --------|  |-- Signature --|
```

- **Header**: algorithm used (HS256)
- **Payload**: your data (user id, username, expiration)
- **Signature**: proves the token wasn't tampered with (requires the secret key)

Anyone can READ the payload (it's just base64). But only the server can CREATE or VERIFY tokens because only it knows the `JWT_SECRET`.

---

## Part 2: Server -- Creating Tokens

### `server/routes/auth.js` (75 lines)

#### Signup
```js
router.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  }

  // Check if username taken
  const existing = await User.findByUsername(username);
  if (existing) {
    return res.status(409).json({ error: "Username already taken" });
  }

  // Create user (password is hashed inside User.create)
  const user = await User.create(username, password);

  // Sign a token
  const token = jwt.sign(
    { id: user.id, username: user.username },  // payload
    process.env.JWT_SECRET,                     // secret key
    { expiresIn: "24h" }                        // expires in 24 hours
  );

  res.status(201).json({
    token,
    user: { id: user.id, username: user.username }
  });
});
```

**Flow:**
1. User sends `{ username: "ismael", password: "mypass123" }`
2. Server validates input
3. Server hashes password with bcrypt (never store plain text!)
4. Server creates user row in database
5. Server signs a JWT with the user's id and username
6. Server sends back `{ token: "eyJ...", user: { id: 1, username: "ismael" } }`

#### Login
```js
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findByUsername(username);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const valid = await User.verifyPassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
  res.json({ token, user: { id: user.id, username: user.username } });
});
```

**Security note:** Same error message for "user not found" and "wrong password". If you said "User not found", an attacker could enumerate valid usernames.

#### Guest Login (bonus feature)
```js
router.post("/guest", async (req, res) => {
  const guestName = "guest_" + Date.now();
  const guestPass = "gp_" + Math.random().toString(36).slice(2);
  const user = await User.create(guestName, guestPass);
  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "24h" });
  res.status(201).json({ token, user: { id: user.id, username: user.username } });
});
```

Creates a throwaway user so people can try the app without signing up.

---

## Part 3: Server -- Verifying Tokens

### `server/middleware/auth.js` (16 lines)
```js
const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1]; // "Bearer eyJ..." -> "eyJ..."
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id: 1, username: "ismael" }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = authMiddleware;
```

**How it's used in routes:**
```js
// No auth -- anyone can browse products
router.get("/", async (req, res) => { ... });

// Auth required -- only logged-in users can create
router.post("/", auth, async (req, res) => {
  console.log(req.user); // { id: 1, username: "ismael" }
});
```

The `auth` middleware sits between the route and the handler. If the token is valid, `req.user` is populated and `next()` passes control to the handler. If invalid, it returns 401 and the handler never runs.

---

## Part 4: Client -- Sending Tokens

### `client/src/api.js` (25 lines)
```js
import axios from 'axios'

const api = axios.create()

// REQUEST interceptor -- attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// RESPONSE interceptor -- handle expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = localStorage.getItem('token')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (hadToken && !error.config?.url?.includes('/api/auth/')) {
        window.location.href = '/login?expired=1'
      }
    }
    return Promise.reject(error)
  }
)

export default api
```

**The beauty of interceptors:**
- **Request interceptor**: Every API call automatically includes the JWT token. No need to manually add headers everywhere
- **Response interceptor**: If any API call returns 401 (unauthorized), automatically clean up and redirect to login
- `!error.config?.url?.includes('/api/auth/')` -- don't redirect on login failures (that's expected), only on expired sessions

### Login Page -- Storing the Token
```js
// In Login.jsx
const res = await api.post('/api/auth/login', { username, password })
localStorage.setItem('token', res.data.token)
localStorage.setItem('user', JSON.stringify(res.data.user))
navigate('/')
```

### Protected Route Component
```js
// client/src/components/ProtectedRoute.jsx
export default function ProtectedRoute({ children }) {
  const user = localStorage.getItem('user')
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Used in App.jsx:
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
```

---

## Part 5: The Complete Auth Flow

```
1. User types username + password, clicks "Sign Up"
2. Client sends POST /api/auth/signup { username, password }
3. Server hashes password, creates user, signs JWT
4. Server responds { token: "eyJ...", user: { id: 1, username: "ismael" } }
5. Client stores token + user in localStorage
6. Client redirects to homepage

7. User clicks "Place Bid" on a product
8. Client sends POST /api/bids/bid { product_id: 5, amount: 200 }
   -- Axios interceptor automatically adds: Authorization: Bearer eyJ...
9. Server auth middleware extracts token, verifies it, sets req.user
10. Route handler uses req.user.id to create the bid
11. Server responds { bid: {...}, matched: false }

12. 24 hours later, token expires
13. User tries to place another bid
14. Server returns 401 { error: "Invalid token" }
15. Axios response interceptor catches 401
16. Client clears localStorage, redirects to /login?expired=1
17. Login page shows "Session expired, please log in again"
```

---

## Exercises

1. **Add token refresh**: When a token is about to expire (check `exp` in payload), automatically request a new one from a `/api/auth/refresh` endpoint.
2. **Add role-based auth**: Add an `admin` boolean to users. Create middleware `requireAdmin` that checks `req.user.admin === true`.
3. **Switch from localStorage to httpOnly cookies**: Research why cookies are considered more secure than localStorage for tokens.

## Key Takeaways
- JWT is stateless -- the server doesn't store sessions, the token IS the session
- Never store plain passwords -- always bcrypt hash
- Same error message for "user not found" and "wrong password" (prevents username enumeration)
- Axios interceptors attach the token automatically to every request
- Middleware pattern: `auth` sits between the route and handler, populating `req.user`
- Token expiration + response interceptor = automatic session management
