const request = require("supertest");
const app = require("../app");
const { cleanDB, createTestUser, createTestProduct, closeDB } = require("./setup");

let seller, buyer, buyer2, product;

beforeEach(async () => {
  await cleanDB();
  seller = await createTestUser("seller", "pass1234");
  buyer = await createTestUser("buyer", "pass1234");
  buyer2 = await createTestUser("buyer2", "pass1234");
  product = await createTestProduct(seller.user.id);
});

afterAll(async () => {
  await closeDB();
});

describe("POST /api/bids/bid", () => {
  it("should place a bid", async () => {
    const res = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 140 });

    expect(res.status).toBe(201);
    expect(res.body.bid).toBeDefined();
    expect(res.body.bid.type).toBe("bid");
    expect(res.body.bid.status).toBe("active");
    expect(res.body.matched).toBe(false);
  });

  it("should reject without auth", async () => {
    const res = await request(app)
      .post("/api/bids/bid")
      .send({ product_id: product.id, amount: 140 });

    expect(res.status).toBe(401);
  });

  it("should reject missing fields", async () => {
    const res = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id });

    expect(res.status).toBe(400);
  });

  it("should reject invalid amount", async () => {
    const res = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: -50 });

    expect(res.status).toBe(400);
  });

  it("should auto-match bid with existing ask", async () => {
    await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 150 });

    const res = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 150 });

    expect(res.status).toBe(201);
    expect(res.body.matched).toBe(true);
    expect(res.body.order).toBeDefined();
    expect(Number(res.body.order.price)).toBe(150);
  });

  it("should auto-match bid when bid exceeds ask", async () => {
    await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 120 });

    const res = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 140 });

    expect(res.status).toBe(201);
    expect(res.body.matched).toBe(true);
    expect(Number(res.body.order.price)).toBe(120);
  });

  it("should NOT match when bid is below ask", async () => {
    await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 200 });

    const res = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 150 });

    expect(res.status).toBe(201);
    expect(res.body.matched).toBe(false);
  });

  it("should reject bidding on own product", async () => {
    const res = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 140 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own listing/i);
  });

  it("should reject duplicate active bid (same user, product, amount)", async () => {
    await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 140 });

    const res = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 140 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already have/i);
  });

  it("should allow same user to bid different amount", async () => {
    await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 140 });

    const res = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 150 });

    expect(res.status).toBe(201);
  });

  it("should allow same amount after cancelling previous bid", async () => {
    const first = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 140 });

    await request(app)
      .delete(`/api/bids/${first.body.bid.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);

    const res = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 140 });

    expect(res.status).toBe(201);
  });

  it("should return 404 for nonexistent product", async () => {
    const res = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: 99999, amount: 140 });

    expect(res.status).toBe(404);
  });
});

describe("POST /api/bids/ask", () => {
  it("should place an ask", async () => {
    const res = await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 160 });

    expect(res.status).toBe(201);
    expect(res.body.ask.type).toBe("ask");
    expect(res.body.matched).toBe(false);
  });

  it("should auto-match ask with existing bid", async () => {
    await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 160 });

    const res = await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 150 });

    expect(res.status).toBe(201);
    expect(res.body.matched).toBe(true);
    expect(Number(res.body.order.price)).toBe(150);
  });

  it("should reject duplicate active ask", async () => {
    await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 200 });

    const res = await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 200 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already have/i);
  });
});

describe("GET /api/bids/product/:productId", () => {
  it("should return bids for a product", async () => {
    await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 130 });

    await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 170 });

    const res = await request(app).get(`/api/bids/product/${product.id}`);
    expect(res.status).toBe(200);
    expect(res.body.bids.length).toBe(2);
    expect(Number(res.body.highestBid.amount)).toBe(130);
    expect(Number(res.body.lowestAsk.amount)).toBe(170);
  });

  it("should return null for no bids", async () => {
    const res = await request(app).get(`/api/bids/product/${product.id}`);
    expect(res.status).toBe(200);
    expect(res.body.highestBid).toBeNull();
    expect(res.body.lowestAsk).toBeNull();
  });
});

describe("GET /api/bids/mine", () => {
  it("should return current user's bids", async () => {
    await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 130 });

    const res = await request(app)
      .get("/api/bids/mine")
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].product_name).toBe("Test Shoe");
  });

  it("should require auth", async () => {
    const res = await request(app).get("/api/bids/mine");
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/bids/:id", () => {
  it("should cancel own active bid", async () => {
    const bidRes = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 130 });

    const bidId = bidRes.body.bid.id;
    const res = await request(app)
      .delete(`/api/bids/${bidId}`)
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.bid.status).toBe("cancelled");
  });

  it("should reject cancelling another user's bid", async () => {
    const bidRes = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 130 });

    const bidId = bidRes.body.bid.id;
    const res = await request(app)
      .delete(`/api/bids/${bidId}`)
      .set("Authorization", `Bearer ${buyer2.token}`);

    expect(res.status).toBe(403);
  });

  it("should reject cancelling matched bid", async () => {
    await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ product_id: product.id, amount: 150 });

    const bidRes = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 150 });

    const bidId = bidRes.body.bid.id;
    const res = await request(app)
      .delete(`/api/bids/${bidId}`)
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/active/i);
  });

  it("should return 404 for non-existent bid", async () => {
    const res = await request(app)
      .delete("/api/bids/99999")
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(res.status).toBe(404);
  });
});
