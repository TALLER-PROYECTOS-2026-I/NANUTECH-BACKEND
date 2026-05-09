import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let getDashboardService;
let buildDashboardResponse;
let repository;

jest.unstable_mockModule("../../../src/functions/dashboard-services/dashboardRepository.mjs", () => ({
  getKPIs: jest.fn(),
  getAlertas: jest.fn(),
  getGraficas: jest.fn(),
  getTopCamiones: jest.fn(),
  getContratos: jest.fn(),
}));

jest.unstable_mockModule("../../../src/functions/dashboard-services/dashboardModel.mjs", () => ({
  buildDashboardResponse: jest.fn(),
}));

beforeAll(async () => {
  repository = await import("../../../src/functions/dashboard-services/dashboardRepository.mjs");
  ({ buildDashboardResponse } = await import(
    "../../../src/functions/dashboard-services/dashboardModel.mjs"
  ));
  ({ getDashboardService } = await import(
    "../../../src/functions/dashboard-services/dashboardService.mjs"
  ));
});

describe("dashboardService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("obtiene todos los bloques y construye la respuesta consolidada", async () => {
    const kpis = { totalCamiones: 4 };
    const alertas = { alertasActivas: [], contratosPorExpirar: [] };
    const graficas = { gps: [], camiones: [] };
    const topCamiones = [{ unidad: "ABC-123", km: 100 }];
    const contratos = [{ id: "contrato-1" }];
    const expected = { kpis, alertas, graficas, topCamiones, contratos };

    repository.getKPIs.mockResolvedValue(kpis);
    repository.getAlertas.mockResolvedValue(alertas);
    repository.getGraficas.mockResolvedValue(graficas);
    repository.getTopCamiones.mockResolvedValue(topCamiones);
    repository.getContratos.mockResolvedValue(contratos);
    buildDashboardResponse.mockReturnValue(expected);

    const result = await getDashboardService();

    expect(result).toBe(expected);
    expect(buildDashboardResponse).toHaveBeenCalledWith({
      kpis,
      alertas,
      graficas,
      topCamiones,
      contratos,
    });
  });

  it("propaga errores cuando una consulta critica falla", async () => {
    repository.getKPIs.mockRejectedValue(new Error("DB error"));
    repository.getAlertas.mockResolvedValue({});
    repository.getGraficas.mockResolvedValue({});
    repository.getTopCamiones.mockResolvedValue([]);
    repository.getContratos.mockResolvedValue([]);

    await expect(getDashboardService()).rejects.toThrow("DB error");
  });
});
