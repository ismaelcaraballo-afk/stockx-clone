module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFiles: ["./jest.setup.js"],
  // Run sequentially — tests share same DB
  maxWorkers: 1,
};
