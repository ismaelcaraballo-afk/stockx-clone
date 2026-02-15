const request = require("supertest");
const app = require("../app");
const { cleanDB, createTestUser, createTestProduct, closeDB } = require("./setup");

let user1;

beforeEach(async () => {
  await cleanDB();
  user1 = await createTestUser("testuser", "pass1234");
});

afterAll(async () => {
  await closeDB();
});

describe("GET /api/users/me", () => {
  it("should return current user profile", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${user1.token}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("testuser");
    expect(res.body.id).toBe(user1.user.id);
    expect(res.body.password_hash).toBeUndefined();
  });

  it("should require auth", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/users/me/listings", () => {
  it("should return empty listings for new user", async () => {
    const res = await request(app)
      .get("/api/users/me/listings")
      .set("Authorization", `Bearer ${user1.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("should return user's listings", async () => {
    await createTestProduct(user1.user.id, { name: "Shoe A" });
    await createTestProduct(user1.user.id, { name: "Shoe B" });

    const res = await request(app)
      .get("/api/users/me/listings")
      .set("Authorization", `Bearer ${user1.token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it("should not return other user's listings", async () => {
    const user2 = await createTestUser("other", "pass1234");
    await createTestProduct(user2.user.id, { name: "Other Shoe" });

    const res = await request(app)
      .get("/api/users/me/listings")
      .set("Authorization", `Bearer ${user1.token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });

  it("should require auth", async () => {
    const res = await request(app).get("/api/users/me/listings");
    expect(res.status).toBe(401);
  });
});
