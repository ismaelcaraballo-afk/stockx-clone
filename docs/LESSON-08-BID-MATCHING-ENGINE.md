# Lesson 8: Building a Bid/Ask Matching Engine

## What You'll Learn
- How real-world exchange order books work
- Implementing bid/ask matching logic
- Preventing self-dealing and duplicate orders
- Instant buy/sell (market orders) vs limit orders
- Full-stack flow: from button click to database transaction

## Project Context
The StockX Clone implements a simplified version of an exchange order book. Buyers place bids, sellers place asks. When a bid >= an ask, they automatically match and create an order. This is the core business logic of the application.

---

## Part 1: How Exchanges Work

Real exchanges (StockX, stock market, eBay) all use this pattern:

```
BIDS (buyers wanting to buy)     ASKS (sellers wanting to sell)
$220  <-- highest bid             $230  <-- lowest ask
$210                              $240
$200                              $250
$190                              $260
```

- **Spread**: The gap between highest bid ($220) and lowest ask ($230)
- **Match**: When a new bid >= lowest ask, OR a new ask <= highest bid
- **Buy Now**: Place a bid at the lowest ask price (guaranteed instant match)
- **Sell Now**: Place an ask at the highest bid price (guaranteed instant match)

---

## Part 2: The Database Design

### Bids Table (from schema.sql)
```sql
CREATE TABLE bids (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('bid', 'ask')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'matched', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

One table holds both bids AND asks. The `type` column distinguishes them. The `status` tracks the lifecycle:
- `active` -- waiting for a match
- `matched` -- found a counterparty, order created
- `cancelled` -- user cancelled it

### Orders Table
```sql
CREATE TABLE orders (
  product_id INTEGER REFERENCES products(id),
  buyer_id INTEGER REFERENCES users(id),
  seller_id INTEGER REFERENCES users(id),
  price DECIMAL(10, 2) NOT NULL,
  bid_id INTEGER REFERENCES bids(id),
  ask_id INTEGER REFERENCES bids(id),
);
```

An order records: who bought, who sold, at what price, and which bid/ask were matched.

---

## Part 3: The Matching Logic

### `server/routes/bids.js` -- Place a Bid

```js
router.post("/bid", auth, async (req, res) => {
  const { product_id, amount } = req.body;
  const numAmount = Number(amount);

  // Validation
  if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000) {
    return res.status(400).json({ error: "Amount must be between $1 and $1,000,000" });
  }

  // Rule: Can't bid on your own product
  const product = await Product.findById(product_id);
  if (product.seller_id === req.user.id) {
    return res.status(400).json({ error: "You cannot bid on your own listing" });
  }

  // Rule: No duplicate active bids (same user, product, amount)
  const existing = await Bid.findDuplicate(product_id, req.user.id, numAmount, "bid");
  if (existing) {
    return res.status(409).json({ error: "You already have an active bid at this price" });
  }

  // Create the bid
  const bid = await Bid.createBid({
    product_id, user_id: req.user.id, amount: numAmount
  });

  // THE MATCHING: Check if there's an ask at or below our bid price
  const lowestAsk = await Bid.getLowestAsk(product_id);
  if (lowestAsk && Number(lowestAsk.amount) <= numAmount) {
    // MATCH! Mark both as matched
    await Bid.markMatched(bid.id);
    await Bid.markMatched(lowestAsk.id);

    // Create the order at the ASK price (seller gets what they asked)
    const order = await Order.create({
      product_id,
      buyer_id: req.user.id,
      seller_id: lowestAsk.user_id,
      price: lowestAsk.amount,   // <-- ask price, not bid price
      bid_id: bid.id,
      ask_id: lowestAsk.id,
    });

    return res.status(201).json({ bid, matched: true, order });
  }

  // No match -- bid stays active
  res.status(201).json({ bid, matched: false });
});
```

**The matching algorithm step by step:**
1. Buyer bids $200 on a shoe
2. Query: "What's the lowest active ask for this product?"
3. If lowest ask is $180 (which is <= $200): MATCH!
4. Both bid and ask marked as "matched" (no longer active)
5. Order created at $180 (the ask price -- seller gets what they asked)
6. If no ask <= $200 exists: bid stays "active" waiting

**Why match at the ask price?**
Same as StockX and stock markets. The buyer was willing to pay UP TO $200, but the seller only asked $180. Fair price = $180.

### Place an Ask (mirror logic)
```js
router.post("/ask", auth, async (req, res) => {
  // ... validation ...

  const ask = await Bid.createAsk({ product_id, user_id: req.user.id, amount: numAmount });

  // Check if there's a bid at or above our ask price
  const highestBid = await Bid.getHighestBid(product_id);
  if (highestBid && Number(highestBid.amount) >= numAmount) {
    await Bid.markMatched(ask.id);
    await Bid.markMatched(highestBid.id);
    const order = await Order.create({
      product_id,
      buyer_id: highestBid.user_id,
      seller_id: req.user.id,
      price: numAmount,  // <-- ask price (the lower amount)
    });
    return res.status(201).json({ ask, matched: true, order });
  }

  res.status(201).json({ ask, matched: false });
});
```

---

## Part 4: The Model Queries

### `server/models/Bid.js`
```js
async getHighestBid(productId) {
  const result = await pool.query(
    `SELECT * FROM bids
     WHERE product_id = $1 AND type = 'bid' AND status = 'active'
     ORDER BY amount DESC LIMIT 1`,
    [productId]
  );
  return result.rows[0] || null;
},

async getLowestAsk(productId) {
  const result = await pool.query(
    `SELECT * FROM bids
     WHERE product_id = $1 AND type = 'ask' AND status = 'active'
     ORDER BY amount ASC LIMIT 1`,
    [productId]
  );
  return result.rows[0] || null;
},

async findDuplicate(productId, userId, amount, type) {
  const result = await pool.query(
    `SELECT * FROM bids
     WHERE product_id = $1 AND user_id = $2 AND amount = $3
     AND type = $4 AND status = 'active'`,
    [productId, userId, amount, type]
  );
  return result.rows[0] || null;
},
```

---

## Part 5: Frontend -- Buy Now / Sell Now

### `client/src/pages/ProductDetail.jsx`
```jsx
const buyNow = async () => {
  if (!bidData.lowestAsk) return
  await api.post('/api/bids/bid', {
    product_id: Number(id),
    amount: Number(bidData.lowestAsk.amount) // bid at exactly the lowest ask
  })
  refreshData()
}

const sellNow = async () => {
  if (!bidData.highestBid) return
  await api.post('/api/bids/ask', {
    product_id: Number(id),
    amount: Number(bidData.highestBid.amount) // ask at exactly the highest bid
  })
  refreshData()
}
```

**Buy Now** = place a bid at the lowest ask price. Guaranteed match.
**Sell Now** = place an ask at the highest bid price. Guaranteed match.

These are "market orders" -- you accept the best available price. Regular bids/asks are "limit orders" -- you set your price and wait.

```jsx
<button onClick={buyNow} disabled={!bidData.lowestAsk || !user}>
  {bidData.lowestAsk ? `Buy Now — $${bidData.lowestAsk.amount}` : 'No Asks Yet'}
</button>
<button onClick={sellNow} disabled={!bidData.highestBid || !user}>
  {bidData.highestBid ? `Sell Now — $${bidData.highestBid.amount}` : 'No Bids Yet'}
</button>
```

Buttons are disabled when there's nothing to match against, or when not logged in.

---

## Exercises

1. **Add bid history**: Show the user a table of their past bids with status (active/matched/cancelled) and the ability to cancel active ones.
2. **Add price alerts**: When a new ask is placed below a user's bid, send a notification (could be a toast or stored in a notifications table).
3. **Add order matching priority**: When multiple bids tie at the same amount, match the oldest one first (FIFO). Modify the query to `ORDER BY amount DESC, created_at ASC`.

## Key Takeaways
- The matching engine is the core business logic -- bids and asks automatically pair up
- Match at the ask price (the lower amount) -- fair for both parties
- Prevent self-dealing (can't bid on your own product) and duplicates
- Buy Now/Sell Now = market orders at the best available price
- The same pattern powers real exchanges: StockX, stock markets, crypto exchanges
