import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

const query = jest.fn();

let repository;

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  query,
}));

beforeAll(async () => {
  repository = await import("../../../src/functions/dashboard-services/dashboardRepository.mjs");
});

describe("dashboardRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("getKPIs convierte contadores e ingresos a numeros", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: "5" }] })
      .mockResolvedValueOnce({ rows: [{ count: "3" }] })
      .mockResolvedValueOnce({ rows: [{ count: "2" }] })
      .mockResolvedValueOnce({ rows: [{ total: "1200.50" }] });

    const result = await repository.getKPIs();

    expect(result).toEqual({
      totalCamiones: 5,
      contratosActivos: 3,
      alertasActivas: 2,
      ingresos: 1200.5,
    });
    expect(query).toHaveBeenCalledTimes(4);
  });

  it("getKPIs propaga errores de consulta", async () => {
    query.mockRejectedValue(new Error("DB error"));

    await expect(repository.getKPIs()).rejects.toThrow("DB error");
  });

  it("getAlertas mapea alertas activas y contratos por expirar", async () => {
    query
      .mockResolvedValueOnce({
        rows: [{ id: "a1", tipo: "GPS", estado: "ACTIVA", severidad: "ALTA" }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: "c1", cliente: "Cliente", tarifa: "900.00", fecha_fin: "2026-05-30" }],
      });

    const result = await repository.getAlertas();

    expect(result.alertasActivas).toEqual([
      { id: "a1", tipo: "GPS", estado: "ACTIVA", severidad: "ALTA" },
    ]);
    expect(result.contratosPorExpirar).toEqual([
      { id: "c1", cliente: "Cliente", tarifa: 900, fecha_fin: "2026-05-30" },
    ]);
  });

  it("getGraficas retorna agrupaciones numericas", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ tipo_evento: "MOVIMIENTO", total: "4" }] })
      .mockResolvedValueOnce({ rows: [{ estado: "DISPONIBLE", total: "7" }] });

    const result = await repository.getGraficas();

    expect(result).toEqual({
      gps: [{ tipo_evento: "MOVIMIENTO", total: 4 }],
      camiones: [{ estado: "DISPONIBLE", total: 7 }],
    });
  });

  it("getGraficas retorna arrays vacios si falla la consulta", async () => {
    query.mockRejectedValue(new Error("DB error"));

    const result = await repository.getGraficas();

    expect(result).toEqual({ gps: [], camiones: [] });
  });

  it("getTopCamiones mapea kilometros por unidad", async () => {
    query.mockResolvedValue({ rows: [{ unidad: "u1", km: "250.5" }] });

    const result = await repository.getTopCamiones();

    expect(result).toEqual([{ unidad: "u1", km: 250.5 }]);
  });

  it("getContratos mapea contratos activos", async () => {
    query.mockResolvedValue({
      rows: [{ id: "c1", cliente: "Cliente", tarifa: "1500.00", fecha_fin: "2026-06-01" }],
    });

    const result = await repository.getContratos();

    expect(result).toEqual([
      { id: "c1", cliente: "Cliente", tarifa: 1500, fecha_fin: "2026-06-01" },
    ]);
  });

  it("getTopCamiones y getContratos propagan errores criticos", async () => {
    query.mockRejectedValueOnce(new Error("Top error"));
    await expect(repository.getTopCamiones()).rejects.toThrow("Top error");

    query.mockRejectedValueOnce(new Error("Contratos error"));
    await expect(repository.getContratos()).rejects.toThrow("Contratos error");
  });
});
