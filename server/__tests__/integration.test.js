const request = require("supertest");
const app = require("../app");
const { cleanDB, closeDB } = require("./setup");

afterAll(async () => {
  await closeDB();
});

describe("Full marketplace flow", () => {
  let sellerToken, buyerToken, sellerId, buyerId, productId;

  beforeAll(async () => {
    await cleanDB();
  });

  it("Step 1: Seller signs up", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "flow_seller", password: "pass1234" });

    expect(res.status).toBe(201);
    sellerToken = res.body.token;
    sellerId = res.body.user.id;
  });

  it("Step 2: Buyer signs up", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "flow_buyer", password: "pass1234" });

    expect(res.status).toBe(201);
    buyerToken = res.body.token;
    buyerId = res.body.user.id;
  });

  it("Step 3: Seller creates a listing", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({
        name: "Air Jordan 1 Retro High OG",
        brand: "Nike",
        description: "The classic.",
        retail_price: 170,
        size: "10",
        category: "sneakers",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Air Jordan 1 Retro High OG");
    productId = res.body.id;
  });

  it("Step 4: Listing appears in browse", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    const found = res.body.find((p) => p.id === productId);
    expect(found).toBeDefined();
    expect(found.seller_name).toBe("flow_seller");
  });

  it("Step 5: Listing appears in seller's listings", async () => {
    const res = await request(app)
      .get("/api/users/me/listings")
      .set("Authorization", `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(productId);
  });

  it("Step 6: Buyer cannot see product in their listings", async () => {
    const res = await request(app)
      .get("/api/users/me/listings")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });

  it("Step 7: Buyer places a bid (no match yet)", async () => {
    const res = await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ product_id: productId, amount: 150 });

    expect(res.status).toBe(201);
    expect(res.body.matched).toBe(false);
  });

  it("Step 8: Bid shows in product bids", async () => {
    const res = await request(app).get(`/api/bids/product/${productId}`);
    expect(res.status).toBe(200);
    expect(Number(res.body.highestBid.amount)).toBe(150);
    expect(res.body.lowestAsk).toBeNull();
  });

  it("Step 9: Bid shows in buyer's bids", async () => {
    const res = await request(app)
      .get("/api/bids/mine")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].type).toBe("bid");
  });

  it("Step 10: Seller places ask at bid price -> auto-match", async () => {
    const res = await request(app)
      .post("/api/bids/ask")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ product_id: productId, amount: 150 });

    expect(res.status).toBe(201);
    expect(res.body.matched).toBe(true);
    expect(res.body.order).toBeDefined();
    expect(Number(res.body.order.price)).toBe(150);
    expect(res.body.order.buyer_id).toBe(buyerId);
    expect(res.body.order.seller_id).toBe(sellerId);
  });

  it("Step 11: Order appears in buyer's orders", async () => {
    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].buyer_name).toBe("flow_buyer");
    expect(res.body[0].seller_name).toBe("flow_seller");
    expect(res.body[0].product_name).toBe("Air Jordan 1 Retro High OG");
  });

  it("Step 12: Order appears in seller's orders", async () => {
    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it("Step 13: Price history shows the sale", async () => {
    const res = await request(app).get(`/api/products/${productId}/history`);
    expect(res.status).toBe(200);
    expect(res.body.history.length).toBe(1);
    expect(Number(res.body.history[0].price)).toBe(150);
    expect(Number(res.body.stats.total_sales)).toBe(1);
    expect(res.body.lastSale).toBeDefined();
  });

  it("Step 14: Matched bids no longer appear as active", async () => {
    const res = await request(app).get(`/api/bids/product/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.highestBid).toBeNull();
    expect(res.body.lowestAsk).toBeNull();
    expect(res.body.bids.length).toBe(0);
  });
});
