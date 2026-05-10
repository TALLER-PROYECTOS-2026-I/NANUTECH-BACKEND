import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let handler;
let getAllDisponiblesController;

jest.unstable_mockModule("../../../src/functions/unidad-services/unidadController.mjs", () => ({
  getAllDisponiblesController: jest.fn(),
}));

beforeAll(async () => {
  ({ getAllDisponiblesController } = await import(
    "../../../src/functions/unidad-services/unidadController.mjs"
  ));
  ({ handler } = await import("../../../src/functions/unidad-services/unidadHandler.mjs"));
});

describe("unidadHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("enruta GET /unidades/disponibles al controller", async () => {
    const expected = { statusCode: 200, body: JSON.stringify({ data: [] }) };
    getAllDisponiblesController.mockResolvedValue(expected);

    const result = await handler({ httpMethod: "GET", resource: "/unidades/disponibles" });

    expect(result).toBe(expected);
    expect(getAllDisponiblesController).toHaveBeenCalledWith({
      httpMethod: "GET",
      resource: "/unidades/disponibles",
    });
  });

  it("retorna 404 si la ruta no existe", async () => {
    const result = await handler({ httpMethod: "GET", resource: "/unidades" });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toContain("Ruta GET /unidades no encontrada");
  });

  it("retorna 500 si el controller lanza error", async () => {
    getAllDisponiblesController.mockRejectedValue(new Error("DB down"));

    const result = await handler({ httpMethod: "GET", resource: "/unidades/disponibles" });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toBe("DB down");
  });
});
