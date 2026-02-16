const app = require("../app");
const path = require("path");
const { createDB, createAuth, testCRUD, testValidation, createFlow } = require(path.join(process.env.HOME, "toolkit/test-kit"));

const db = createDB({ connectionString: process.env.DATABASE_URL });
const auth = createAuth({ pool: db.pool, jwtSecret: process.env.JWT_SECRET });

let seller, buyer, product;

beforeEach(async () => {
  await db.clean();
  seller = await auth.createUser("seller", "pass1234");
  buyer = await auth.createUser("buyer", "pass1234");
  const [p] = await db.seed("products", [{
    name: "Test Shoe", brand: "Nike", description: "A test sneaker",
    image_url: "https://example.com/shoe.jpg", retail_price: 150,
    size: "10", category: "sneakers", seller_id: seller.user.id,
  }]);
  product = p;
});

afterAll(async () => {
  await db.close();
});

// Auto CRUD tests
testCRUD(app, "/api/products", {
  getAll: true,
  getById: true,
  create: {
    auth: true,
    body: { name: "New Shoe", brand: "Nike", retail_price: 200 },
    getToken: () => seller.token,
    requiredFields: ["name", "brand", "retail_price"],
  },
  deleteById: {
    auth: true,
    getToken: () => seller.token,
  },
});

// Auto validation tests
testValidation(app, "POST", "/api/products", {
  getToken: () => seller.token,
  baseBody: { name: "Valid Shoe", brand: "Nike", retail_price: 100 },
  fields: {
    name: { type: "string", min: 2, max: 255, required: true },
    retail_price: { type: "number", min: 1, max: 1000000, required: true },
  },
});

// Auto auth guard tests
auth.testProtectedRoute(app, "POST", "/api/products", { name: "X", brand: "Y", retail_price: 1 });
auth.testProtectedRoute(app, "GET", "/api/orders");
auth.testProtectedRoute(app, "GET", "/api/bids/mine");
auth.testProtectedRoute(app, "GET", "/api/users/me");
