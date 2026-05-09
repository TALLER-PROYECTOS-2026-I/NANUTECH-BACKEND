import { describe, it, expect } from "@jest/globals";
import { buildDashboardResponse } from "../../../src/functions/dashboard-services/dashboardModel.mjs";

describe("dashboardModel", () => {
  it("construye respuesta con datos recibidos", () => {
    const input = {
      kpis: { totalCamiones: 3, contratosActivos: 2, alertasActivas: 1, ingresos: 1500 },
      alertas: { alertasActivas: [{ id: "a1" }], contratosPorExpirar: [] },
      graficas: { gps: [{ tipo_evento: "MOVIMIENTO", total: 2 }], camiones: [] },
      topCamiones: [{ unidad: "u1", km: 50 }],
      contratos: [{ id: "c1" }],
    };

    expect(buildDashboardResponse(input)).toEqual(input);
  });

  it("usa valores por defecto cuando faltan bloques", () => {
    const result = buildDashboardResponse({});

    expect(result.kpis).toEqual({
      totalCamiones: 0,
      contratosActivos: 0,
      alertasActivas: 0,
      ingresos: 0,
    });
    expect(result.alertas).toEqual({ alertasActivas: [], contratosPorExpirar: [] });
    expect(result.graficas).toEqual({ gps: [], camiones: [] });
    expect(result.topCamiones).toEqual([]);
    expect(result.contratos).toEqual([]);
  });
});
