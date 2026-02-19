# Lesson 6: Testing with Jest and Supertest

## What You'll Learn
- Unit testing API endpoints with Supertest
- Test structure (describe, it, expect)
- Setup and teardown patterns
- Testing auth flows, CRUD operations, and edge cases
- Why tests matter for team projects

## Project Context
The StockX Clone has 148 tests across 9 test suites, all in `server/__tests__/`. They test every API endpoint including auth, products, bids (with matching), orders, and input validation.

---

## Part 1: Test Setup

### `server/__tests__/setup.js`
```js
const app = require("../app");
const pool = require("../db");
const supertest = require("supertest");

const request = supertest(app);

async function cleanDB() {
  await pool.query("DELETE FROM orders");
  await pool.query("DELETE FROM bids");
  await pool.query("DELETE FROM products");
  await pool.query("DELETE FROM users");
}

module.exports = { request, pool, cleanDB };
```

**Key patterns:**
- `supertest(app)` -- creates a test client that makes HTTP requests to your Express app WITHOUT starting a real server
- `cleanDB()` -- deletes all data between tests so they don't interfere with each other
- Delete in order: orders -> bids -> products -> users (respect foreign keys)

---

## Part 2: Testing Authentication

### `server/__tests__/auth.test.js`
```js
const { request, cleanDB } = require("./setup");

describe("Auth Routes", () => {
  beforeEach(async () => {
    await cleanDB();
  });

  describe("POST /api/auth/signup", () => {
    it("should create a new user", async () => {
      const res = await request
        .post("/api/auth/signup")
        .send({ username: "testuser", password: "testpass" });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe("testuser");
    });

    it("should reject duplicate username", async () => {
      await request.post("/api/auth/signup")
        .send({ username: "testuser", password: "testpass" });

      const res = await request.post("/api/auth/signup")
        .send({ username: "testuser", password: "testpass" });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already taken/);
    });

    it("should reject short password", async () => {
      const res = await request.post("/api/auth/signup")
        .send({ username: "testuser", password: "ab" });

      expect(res.status).toBe(400);
    });
  });
});
```

**Test structure:**
- `describe` -- groups related tests together
- `beforeEach` -- runs before every test (clean slate)
- `it("should...")` -- describes what this specific test verifies
- `request.post("/api/auth/signup").send({...})` -- Supertest sends a POST request with JSON body
- `expect(res.status).toBe(201)` -- assert the HTTP status code
- `expect(res.body.token).toBeDefined()` -- assert the response includes a token

---

## Part 3: Testing with Authentication

Some endpoints require a logged-in user. Here's the pattern:

```js
describe("Bids", () => {
  let token;
  let productId;

  beforeEach(async () => {
    await cleanDB();
    // Create a user and get token
    const signup = await request.post("/api/auth/signup")
      .send({ username: "bidder", password: "testpass" });
    token = signup.body.token;

    // Create a product to bid on
    const product = await request.post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Shoe", brand: "Nike", retail_price: 150 });
    productId = product.body.id;
  });

  it("should place a bid", async () => {
    // Create a second user (can't bid on own product)
    const buyer = await request.post("/api/auth/signup")
      .send({ username: "buyer", password: "testpass" });

    const res = await request.post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ product_id: productId, amount: 200 });

    expect(res.status).toBe(201);
    expect(res.body.bid.amount).toBe("200.00");
    expect(res.body.matched).toBe(false);
  });

  it("should auto-match bid with existing ask", async () => {
    // Seller places ask at $180
    const res1 = await request.post("/api/bids/ask")
      .set("Authorization", `Bearer ${token}`)
      .send({ product_id: productId, amount: 180 });

    // Buyer bids $200 (>= ask of $180, should match)
    const buyer = await request.post("/api/auth/signup")
      .send({ username: "buyer", password: "testpass" });

    const res2 = await request.post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ product_id: productId, amount: 200 });

    expect(res2.body.matched).toBe(true);
    expect(res2.body.order).toBeDefined();
    expect(res2.body.order.price).toBe("180.00"); // matched at ask price
  });
});
```

**Testing the matching engine:**
- Set up seller + ask, then buyer + bid
- If bid >= ask, they match and create an order
- The order price is the ASK price (seller gets what they asked for)

---

## Part 4: Testing Edge Cases

### `server/__tests__/validation.test.js`
```js
it("should reject bid on own product", async () => {
  const res = await request.post("/api/bids/bid")
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({ product_id: productId, amount: 200 });

  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/cannot bid on your own/);
});

it("should reject negative price", async () => {
  const res = await request.post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Shoe", brand: "Nike", retail_price: -50 });

  expect(res.status).toBe(400);
});

it("should reject request without token", async () => {
  const res = await request.post("/api/products")
    .send({ name: "Shoe", brand: "Nike", retail_price: 150 });

  expect(res.status).toBe(401);
});

it("should reject request with invalid token", async () => {
  const res = await request.post("/api/products")
    .set("Authorization", "Bearer fake.token.here")
    .send({ name: "Shoe", brand: "Nike", retail_price: 150 });

  expect(res.status).toBe(401);
});
```

**What to test:**
- Happy path (it works correctly)
- Missing required fields
- Invalid data types (string where number expected)
- Auth failures (no token, bad token, expired token)
- Business rule violations (bidding on own product, duplicate bids)
- Boundary values (price = 0, price = 1000001)

---

## Part 5: Running Tests

```bash
# Run all tests
cd server && npx jest --forceExit

# Run a specific test file
npx jest __tests__/auth.test.js --forceExit

# Run tests with coverage report
npx jest --coverage --forceExit

# Run in watch mode (re-runs on file changes)
npx jest --watch
```

`--forceExit` is needed because the database pool keeps connections open after tests finish.

---

## Exercises

1. **Write a test** for the DELETE /api/products/:id endpoint. Test that only the seller can delete, non-owners get 403, and non-existent products get 404.
2. **Add a test** for duplicate bid prevention (same user, same product, same amount should return 409).
3. **Write a test** for the guest login endpoint -- verify it creates a user with a unique name and returns a valid token.

## Key Takeaways
- Supertest lets you test Express routes without starting a real server
- Clean the database before each test for isolation
- `.set("Authorization", ...)` to test authenticated endpoints
- Test happy paths AND edge cases (invalid input, auth failures, business rules)
- 148 tests give confidence to refactor without breaking things
- Tests are documentation -- they show exactly how the API should behave
