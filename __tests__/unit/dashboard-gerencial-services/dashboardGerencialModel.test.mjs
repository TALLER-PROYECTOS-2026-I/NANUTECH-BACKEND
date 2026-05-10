import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { buildDashboardGerencialResponse } from "../../../src/functions/dashboard-gerencial-services/dashboardGerencialModel.mjs";

describe("Dashboard Gerencial - Model", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-09T10:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("construye la respuesta consolidada del dashboard gerencial", () => {
    const resumen = { jornadas: 10 };
    const graficas = { jornadas_por_dia: [] };
    const operaciones = { en_progreso: [] };
    const rendimiento = { top_conductores_km: [] };
    const historial = [{ id: "j1" }];

    const result = buildDashboardGerencialResponse(
      resumen,
      graficas,
      operaciones,
      rendimiento,
      historial
    );

    expect(result).toEqual({
      success: true,
      data: {
        ultimo_actualizacion: "2026-05-09T10:00:00.000Z",
        estado_sistema: "Sistema activo",
        resumen_general: resumen,
        graficas,
        operaciones,
        rendimiento,
        historial,
      },
    });
  });
});
