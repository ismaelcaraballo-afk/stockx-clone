const app = require("../app");
const path = require("path");
const { createDB, createFlow } = require(path.join(process.env.HOME, "toolkit/test-kit"));

const db = createDB({ connectionString: process.env.DATABASE_URL });

const flow = createFlow(app, {
  name: "Full marketplace flow (test-kit)",
  beforeAll: async () => { await db.clean(); },
  afterAll: async () => { await db.close(); },
});

flow
  .step("Seller signs up", "POST", "/api/auth/signup", {
    body: { username: "kit_seller", password: "pass1234" },
    expect: { status: 201, bodyHas: ["token"] },
    save: { sellerToken: "body.token", sellerId: "body.user.id" },
  })
  .step("Buyer signs up", "POST", "/api/auth/signup", {
    body: { username: "kit_buyer", password: "pass1234" },
    expect: { status: 201 },
    save: { buyerToken: "body.token", buyerId: "body.user.id" },
  })
  .step("Seller creates listing", "POST", "/api/products", {
    body: { name: "Kit Shoe", brand: "Adidas", retail_price: 200, size: "11", category: "sneakers" },
    auth: (ctx) => ctx.sellerToken,
    expect: { status: 201, bodyContains: { name: "Kit Shoe" } },
    save: { productId: "body.id" },
  })
  .step("Buyer places bid (no match)", "POST", "/api/bids/bid", {
    body: (ctx) => ({ product_id: ctx.productId, amount: 180 }),
    auth: (ctx) => ctx.buyerToken,
    expect: { status: 201, fn: (res) => expect(res.body.matched).toBe(false) },
  })
  .step("Seller asks at bid price (auto-match)", "POST", "/api/bids/ask", {
    body: (ctx) => ({ product_id: ctx.productId, amount: 180 }),
    auth: (ctx) => ctx.sellerToken,
    expect: {
      status: 201,
      fn: (res) => {
        expect(res.body.matched).toBe(true);
        expect(res.body.order).toBeDefined();
      },
    },
  })
  .step("Buyer sees order", "GET", "/api/orders", {
    auth: (ctx) => ctx.buyerToken,
    expect: {
      status: 200,
      fn: (res) => {
        expect(res.body.length).toBe(1);
        expect(res.body[0].product_name).toBe("Kit Shoe");
      },
    },
  })
  .step("Seller sees order too", "GET", "/api/orders", {
    auth: (ctx) => ctx.sellerToken,
    expect: { status: 200, fn: (res) => expect(res.body.length).toBe(1) },
  })
  .run();
