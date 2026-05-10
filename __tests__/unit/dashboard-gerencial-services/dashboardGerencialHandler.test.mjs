import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

/**
 * ====================================================================
 * Módulo: Dashboard Gerencial Handler (Pruebas Unitarias)
 * HU: HU16 - Dashboard Gerencial
 *
 * Responsabilidades:
 * - Probar el enrutamiento correcto de endpoints (Ej. GET /dashboard/gerencial).
 * - Validar respuestas para rutas no soportadas (Error 404).
 * - Verificar el manejo global de excepciones y error interno (Error 500).
 * ====================================================================
 */

jest.unstable_mockModule(
  "../../../src/functions/dashboard-gerencial-services/dashboardGerencialController.mjs",
  () => ({
    getDashboardGerencialController: jest.fn(),
  })
);

let handler;
let getDashboardGerencialController;

beforeAll(async () => {
  ({ getDashboardGerencialController } =
    await import("../../../src/functions/dashboard-gerencial-services/dashboardGerencialController.mjs"));
  ({ handler } =
    await import("../../../src/functions/dashboard-gerencial-services/dashboardGerencialHandler.mjs"));
});

describe("Dashboard Gerencial - Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debería rutear GET /dashboard/gerencial hacia getDashboardGerencialController", async () => {
    const mockEvent = {
      httpMethod: "GET",
      resource: "/dashboard/gerencial",
    };

    getDashboardGerencialController.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ message: "OK" }),
    });

    const result = await handler(mockEvent);

    expect(getDashboardGerencialController).toHaveBeenCalledWith(mockEvent);
    expect(result.statusCode).toBe(200);
  });

  it("debería retornar 404 si la ruta no existe", async () => {
    const mockEvent = {
      httpMethod: "POST",
      resource: "/dashboard/gerencial",
    };

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).success).toBe(false);
    expect(getDashboardGerencialController).not.toHaveBeenCalled();
  });

  it("debería manejar errores del controlador devolviendo 500", async () => {
    const mockEvent = {
      httpMethod: "GET",
      resource: "/dashboard/gerencial",
    };

    getDashboardGerencialController.mockRejectedValue(new Error("Internal Exception"));

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).success).toBe(false);
  });
});
