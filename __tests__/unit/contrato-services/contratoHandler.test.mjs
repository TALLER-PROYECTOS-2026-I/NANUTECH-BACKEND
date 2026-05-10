import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let handler;
let controllers;

jest.unstable_mockModule("../../../src/functions/contrato-services/contratoController.mjs", () => ({
  getAllVigentesController: jest.fn(),
  createContratoController: jest.fn(),
  getIndicadoresController: jest.fn(),
  getAllContratosController: jest.fn(),
  getContratoByIdController: jest.fn(),
  updateContratoController: jest.fn(),
  assignUnidadesController: jest.fn(),
}));

beforeAll(async () => {
  controllers = await import("../../../src/functions/contrato-services/contratoController.mjs");
  ({ handler } = await import("../../../src/functions/contrato-services/contratoHandler.mjs"));
});

describe("contratoHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const expectRoute = async (event, controllerName) => {
    const expected = { statusCode: 200, body: JSON.stringify({ ok: true }) };
    controllers[controllerName].mockResolvedValue(expected);

    const result = await handler(event);

    expect(result).toBe(expected);
    expect(controllers[controllerName]).toHaveBeenCalledWith(event);
  };

  it("enruta GET /contratos/indicadores", async () => {
    await expectRoute(
      { httpMethod: "GET", resource: "/contratos/indicadores" },
      "getIndicadoresController"
    );
  });

  it("enruta GET /contratos/vigentes", async () => {
    await expectRoute(
      { httpMethod: "GET", resource: "/contratos/vigentes" },
      "getAllVigentesController"
    );
  });

  it("enruta POST /contratos", async () => {
    await expectRoute(
      { httpMethod: "POST", resource: "/contratos" },
      "createContratoController"
    );
  });

  it("enruta GET /contratos/{id}", async () => {
    await expectRoute(
      { httpMethod: "GET", resource: "/contratos/{id}", pathParameters: { id: "con-1" } },
      "getContratoByIdController"
    );
  });

  it("enruta GET /contratos", async () => {
    await expectRoute(
      { httpMethod: "GET", resource: "/contratos" },
      "getAllContratosController"
    );
  });

  it("enruta PUT /contratos/{id}", async () => {
    await expectRoute(
      { httpMethod: "PUT", resource: "/contratos/{id}", pathParameters: { id: "con-1" } },
      "updateContratoController"
    );
  });

  it("enruta PUT /contratos/{id}/unidades", async () => {
    await expectRoute(
      {
        httpMethod: "PUT",
        resource: "/contratos/{id}/unidades",
        pathParameters: { id: "con-1" },
      },
      "assignUnidadesController"
    );
  });

  it("retorna 404 cuando la ruta no existe", async () => {
    const result = await handler({ httpMethod: "DELETE", resource: "/contratos/{id}" });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(404);
    expect(body.message).toBe("Ruta DELETE /contratos/{id} no encontrada");
  });

  it("retorna 500 si el controller lanza error inesperado", async () => {
    controllers.getAllContratosController.mockRejectedValue(new Error("Fallo inesperado"));

    const result = await handler({ httpMethod: "GET", resource: "/contratos" });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(500);
    expect(body.message).toBe("Fallo inesperado");
  });
});
