import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let handler;
let getAllConductoresController;

jest.unstable_mockModule(
  "../../../src/functions/conductor-services/conductorController.mjs",
  () => ({
    getAllConductoresController: jest.fn(),
  })
);

beforeAll(async () => {
  ({ getAllConductoresController } = await import(
    "../../../src/functions/conductor-services/conductorController.mjs"
  ));
  ({ handler } = await import("../../../src/functions/conductor-services/conductorHandler.mjs"));
});

describe("conductorHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("enruta GET /conductores al controller", async () => {
    const expected = { statusCode: 200, body: JSON.stringify({ data: [] }) };
    getAllConductoresController.mockResolvedValue(expected);

    const result = await handler({ httpMethod: "GET", resource: "/conductores" });

    expect(result).toBe(expected);
    expect(getAllConductoresController).toHaveBeenCalledWith({
      httpMethod: "GET",
      resource: "/conductores",
    });
  });

  it("retorna 404 si la ruta no existe", async () => {
    const result = await handler({ httpMethod: "POST", resource: "/conductores" });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toContain("Ruta POST /conductores no encontrada");
  });

  it("retorna 500 si el controller lanza error", async () => {
    getAllConductoresController.mockRejectedValue(new Error("DB down"));

    const result = await handler({ httpMethod: "GET", resource: "/conductores" });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toBe("DB down");
  });
});
