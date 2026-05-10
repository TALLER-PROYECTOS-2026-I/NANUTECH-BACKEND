import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let handler;
let getDashboardController;

jest.unstable_mockModule("../../../src/functions/dashboard-services/dashboardController.mjs", () => ({
  getDashboardController: jest.fn(),
}));

beforeAll(async () => {
  ({ getDashboardController } = await import(
    "../../../src/functions/dashboard-services/dashboardController.mjs"
  ));
  ({ handler } = await import("../../../src/functions/dashboard-services/dashboardHandler.mjs"));
});

describe("dashboardHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delega el evento al dashboard controller", async () => {
    const event = { httpMethod: "GET", resource: "/dashboard" };
    const expected = { statusCode: 200, body: "{}" };
    getDashboardController.mockResolvedValue(expected);

    const result = await handler(event);

    expect(result).toBe(expected);
    expect(getDashboardController).toHaveBeenCalledWith(event);
  });
});
