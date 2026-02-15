const request = require("supertest");
const app = require("../app");
const { cleanDB, createTestUser, createTestProduct, closeDB } = require("./setup");

let seller, buyer;

beforeEach(async () => {
  await cleanDB();
  seller = await createTestUser("seller", "pass1234");
  buyer = await createTestUser("buyer", "pass1234");
});

afterAll(async () => {
  await closeDB();
});

describe("GET /api/products", () => {
  beforeEach(async () => {
    await createTestProduct(seller.user.id, { name: "Air Max 90", brand: "Nike", retail_price: 120 });
    await createTestProduct(seller.user.id, { name: "Ultraboost", brand: "Adidas", retail_price: 180 });
    await createTestProduct(seller.user.id, { name: "Air Force 1", brand: "Nike", retail_price: 100 });
  });

  it("should return all products", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
  });

  it("should filter by brand", async () => {
    const res = await request(app).get("/api/products?brand=Nike");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    res.body.forEach((p) => {
      expect(p.brand.toLowerCase()).toBe("nike");
    });
  });

  it("should search by name", async () => {
    const res = await request(app).get("/api/products?search=ultraboost");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("Ultraboost");
  });

  it("should sort by price ascending", async () => {
    const res = await request(app).get("/api/products?sort=price_asc");
    expect(res.status).toBe(200);
    const prices = res.body.map((p) => Number(p.retail_price));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("should sort by price descending", async () => {
    const res = await request(app).get("/api/products?sort=price_desc");
    expect(res.status).toBe(200);
    const prices = res.body.map((p) => Number(p.retail_price));
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it("should respect limit and offset", async () => {
    const res = await request(app).get("/api/products?limit=2&offset=0");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);

    const res2 = await request(app).get("/api/products?limit=2&offset=2");
    expect(res2.status).toBe(200);
    expect(res2.body.length).toBe(1);
  });
});

describe("GET /api/products/:id", () => {
  it("should return a product by ID", async () => {
    const product = await createTestProduct(seller.user.id);
    const res = await request(app).get(`/api/products/${product.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Test Shoe");
    expect(res.body.seller_name).toBe("seller");
  });

  it("should return 404 for non-existent product", async () => {
    const res = await request(app).get("/api/products/99999");
    expect(res.status).toBe(404);
  });

  it("should reject invalid ID", async () => {
    const res = await request(app).get("/api/products/abc");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/products", () => {
  it("should create a product with auth", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ name: "New Shoe", brand: "Nike", retail_price: 200 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("New Shoe");
    expect(res.body.seller_id).toBe(seller.user.id);
  });

  it("should reject without auth", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ name: "New Shoe", brand: "Nike", retail_price: 200 });

    expect(res.status).toBe(401);
  });

  it("should reject missing required fields", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ name: "Shoe" });

    expect(res.status).toBe(400);
  });

  it("should reject invalid price", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ name: "Shoe", brand: "Nike", retail_price: -5 });

    expect(res.status).toBe(400);
  });

  it("should reject name too short", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ name: "A", brand: "Nike", retail_price: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/2-255/);
  });
});

describe("DELETE /api/products/:id", () => {
  it("should delete own product", async () => {
    const product = await createTestProduct(seller.user.id);
    const res = await request(app)
      .delete(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${seller.token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    // Verify deleted
    const check = await request(app).get(`/api/products/${product.id}`);
    expect(check.status).toBe(404);
  });

  it("should reject deleting another user's product", async () => {
    const product = await createTestProduct(seller.user.id);
    const res = await request(app)
      .delete(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent product", async () => {
    const res = await request(app)
      .delete("/api/products/99999")
      .set("Authorization", `Bearer ${seller.token}`);

    expect(res.status).toBe(404);
  });

  it("should delete product with associated bids and orders", async () => {
    const product = await createTestProduct(seller.user.id);

    // Create a bid on it
    await request(app)
      .post("/api/bids/bid")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product_id: product.id, amount: 140 });

    const res = await request(app)
      .delete(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${seller.token}`);

    expect(res.status).toBe(200);
  });
});

describe("GET /api/products/:id/history", () => {
  it("should return empty history for product with no orders", async () => {
    const product = await createTestProduct(seller.user.id);
    const res = await request(app).get(`/api/products/${product.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.history).toEqual([]);
    expect(res.body.lastSale).toBeNull();
  });
});
