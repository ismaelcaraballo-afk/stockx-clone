const request = require("supertest");
const app = require("../app");
const { cleanDB, closeDB } = require("./setup");

beforeEach(async () => {
  await cleanDB();
});

afterAll(async () => {
  await closeDB();
});

describe("POST /api/auth/signup", () => {
  it("should create a new user and return token", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "newuser", password: "pass1234" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe("newuser");
    expect(res.body.user.id).toBeDefined();
  });

  it("should reject missing username", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ password: "pass1234" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username/i);
  });

  it("should reject missing password", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "newuser" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  it("should reject short password", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "newuser", password: "ab" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/4 characters/i);
  });

  it("should reject duplicate username", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send({ username: "dupe", password: "pass1234" });

    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "dupe", password: "pass5678" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/taken/i);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/api/auth/signup")
      .send({ username: "loginuser", password: "mypass123" });
  });

  it("should login with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "loginuser", password: "mypass123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe("loginuser");
  });

  it("should reject wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "loginuser", password: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("should reject non-existent user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "nouser", password: "pass" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("should reject missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/guest", () => {
  it("should create a guest user", async () => {
    const res = await request(app).post("/api/auth/guest");

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toMatch(/^guest_/);
  });
});

describe("GET /api/health", () => {
  it("should return ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
