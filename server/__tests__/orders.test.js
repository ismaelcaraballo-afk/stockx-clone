const request = require("supertest");
const app = require("../app");
const { cleanDB, createTestUser, createTestProduct, closeDB } = require("./setup");

let seller, buyer, product;

beforeEach(async () => {
  await cleanDB();
  seller = await createTestUser("seller", "pass1234");
  buyer = await createTestUser("buyer", "pass1234");
  product = await createTestProduct(seller.user.id);
});

afterAll(async () => {
  await closeDB();
});

describe("GET /api/orders", () => {
  it("should return empty orders for new user", async () => {
    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("should require auth", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("should return orders after a match", async () => {
    // Seller asks $150
    await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 150 });

    // Buyer bids $150 -> auto-match
    await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 150 });

    // Check buyer's orders
    const buyerRes = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(buyerRes.status).toBe(200);
    expect(buyerRes.body.length).toBe(1);
    expect(buyerRes.body[0].buyer_name).toBe("buyer");
    expect(buyerRes.body[0].seller_name).toBe("seller");
    expect(Number(buyerRes.body[0].price)).toBe(150);
    expect(buyerRes.body[0].product_name).toBe("Test Shoe");

    // Check seller's orders (should also see it)
    const sellerRes = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${seller.token}`);

    expect(sellerRes.status).toBe(200);
    expect(sellerRes.body.length).toBe(1);
  });

  it("should show orders for both buyer and seller roles", async () => {
    const buyer2 = await createTestUser("buyer2", "pass1234");
    const product2 = await createTestProduct(buyer.user.id, { name: "Shoe 2" });

    // First order: buyer buys from seller
    await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 100 });
    await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 100 });

    // Second order: buyer2 buys from buyer (buyer is seller now)
    await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product2.id, amount: 200 });
    await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer2.token}`)
      .send({ product_id: product2.id, amount: 200 });

    // Buyer should see 2 orders (one as buyer, one as seller)
    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
});

describe("Price history after orders", () => {
  it("should show completed order in price history", async () => {
    // Create a matched order
    await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 175 });
    await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 175 });

    const res = await request(app).get(`/api/products/${product.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.history.length).toBe(1);
    expect(Number(res.body.history[0].price)).toBe(175);
    expect(res.body.lastSale).toBeDefined();
    expect(Number(res.body.stats.total_sales)).toBe(1);
  });
});
