export default {
  testMatch: ["**/__tests__/**/*.test.mjs"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/helpers/",
    "/__tests__/fixtures/",
    "/__tests__/mocks/",
  ],
  collectCoverageFrom: [
    "src/**/*.mjs",
    "!src/**/*.test.mjs",
  ],
};