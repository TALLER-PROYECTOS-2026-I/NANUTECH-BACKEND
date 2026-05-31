import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let getDashboardController;
let getDashboardService;
let getCurrentSession;

jest.unstable_mockModule("../../../src/functions/dashboard-services/dashboardService.mjs", () => ({
  getDashboardService: jest.fn(),
}));

jest.unstable_mockModule("../../../src/functions/auth-services/authService.mjs", () => ({
  getCurrentSession: jest.fn(),
}));

beforeAll(async () => {
  ({ getDashboardService } = await import(
    "../../../src/functions/dashboard-services/dashboardService.mjs"
  ));
  ({ getCurrentSession } = await import("../../../src/functions/auth-services/authService.mjs"));
  ({ getDashboardController } = await import(
    "../../../src/functions/dashboard-services/dashboardController.mjs"
  ));
});

describe("dashboardController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("retorna 401 si no recibe Authorization", async () => {
    const result = await getDashboardController({ headers: {} });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(401);
    expect(body.message).toBe("Token requerido");
    expect(getCurrentSession).not.toHaveBeenCalled();
  });

  it("retorna 403 si el usuario no es admin", async () => {
    getCurrentSession.mockResolvedValue({ role: "chofer" });

    const result = await getDashboardController({
      headers: { Authorization: "Bearer token" },
    });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(403);
    expect(body.message).toContain("Solo el Administrador");
    expect(getDashboardService).not.toHaveBeenCalled();
  });

  it("retorna 200 con la data del dashboard para admin", async () => {
    const dashboard = { kpis: { totalCamiones: 2 } };
    getCurrentSession.mockResolvedValue({ role: "admin" });
    getDashboardService.mockResolvedValue(dashboard);

    const result = await getDashboardController({
      headers: { authorization: "Bearer token" },
    });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      message: "Dashboard obtenido correctamente",
      data: dashboard
    });
    expect(getCurrentSession).toHaveBeenCalledWith("Bearer token");
  });

  it("retorna 500 si falla la sesion o el servicio", async () => {
    getCurrentSession.mockRejectedValue(new Error("Sesion invalida"));

    const result = await getDashboardController({
      headers: { Authorization: "Bearer token" },
    });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(500);
    expect(body.message).toBe("Error interno del servidor");
  });
});
