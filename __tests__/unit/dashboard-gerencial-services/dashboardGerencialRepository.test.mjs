import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

const query = jest.fn();

let DashboardGerencialRepository;

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  query,
}));

beforeAll(async () => {
  ({ DashboardGerencialRepository } = await import(
    "../../../src/functions/dashboard-gerencial-services/dashboardGerencialRepository.mjs"
  ));
});

describe("Dashboard Gerencial - Repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getResumen calcula KPIs gerenciales con filtro hoy", async () => {
    query
      .mockResolvedValueOnce({
        rows: [{ total_jornadas: "10", completadas: "8", total_km: "1500", total_horas: "40.25" }],
      })
      .mockResolvedValueOnce({ rows: [{ total: "12" }] })
      .mockResolvedValueOnce({ rows: [{ total: "7" }] })
      .mockResolvedValueOnce({ rows: [{ total: "3", ingresos: "2500.50" }] });

    const repository = new DashboardGerencialRepository();
    const result = await repository.getResumen("hoy");

    expect(result).toEqual({
      jornadas: 10,
      jornadas_completadas: 8,
      horas_acumuladas: "40.25",
      km_totales: 1500,
      eficiencia: "80.0%",
      flota_activa: 12,
      conductores_activos: 7,
      contratos_activos: 3,
      ingresos_estimados: 2500.5,
    });
    expect(query.mock.calls[0][0]).toContain("j.fecha_jornada = CURRENT_DATE");
  });

  it("getResumen retorna eficiencia 0% cuando no hay jornadas", async () => {
    query
      .mockResolvedValueOnce({
        rows: [{ total_jornadas: "0", completadas: "0", total_km: "0", total_horas: "0" }],
      })
      .mockResolvedValueOnce({ rows: [{ total: "0" }] })
      .mockResolvedValueOnce({ rows: [{ total: "0" }] })
      .mockResolvedValueOnce({ rows: [{ total: "0", ingresos: "0" }] });

    const repository = new DashboardGerencialRepository();
    const result = await repository.getResumen("todas");

    expect(result.eficiencia).toBe("0%");
    expect(query.mock.calls[0][0]).not.toContain("INTERVAL");
  });

  it("getGraficas devuelve agrupaciones usando filtro semana", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ fecha_jornada: "2026-05-01", total: "2", km: "100" }] })
      .mockResolvedValueOnce({ rows: [{ estado: "COMPLETADA", total: "2" }] })
      .mockResolvedValueOnce({ rows: [{ estado: "DISPONIBLE", total: "4" }] })
      .mockResolvedValueOnce({ rows: [{ estado: "ACTIVO", total: "5" }] });

    const repository = new DashboardGerencialRepository();
    const result = await repository.getGraficas("semana");

    expect(result.jornadas_por_dia).toHaveLength(1);
    expect(result.sectores_jornadas[0].estado).toBe("COMPLETADA");
    expect(query.mock.calls[0][0]).toContain("INTERVAL '7 days'");
  });

  it("getOperaciones agrupa jornadas, camiones en mantenimiento y conductores disponibles", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: "j1", conductor: "Carlos Gomez" }] })
      .mockResolvedValueOnce({ rows: [{ placa: "ABC-123" }] })
      .mockResolvedValueOnce({ rows: [{ nombre: "Luis Martinez" }] });

    const repository = new DashboardGerencialRepository();
    const result = await repository.getOperaciones();

    expect(result).toEqual({
      en_progreso: [{ id: "j1", conductor: "Carlos Gomez" }],
      camiones_mantenimiento: [{ placa: "ABC-123" }],
      conductores_disponibles: [{ nombre: "Luis Martinez" }],
    });
  });

  it("getRendimiento devuelve top de conductores y camiones con filtro mes", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ conductor: "Carlos Gomez", km_totales: "500" }] })
      .mockResolvedValueOnce({ rows: [{ placa: "ABC-123", usos: "4", km_totales: "700" }] });

    const repository = new DashboardGerencialRepository();
    const result = await repository.getRendimiento("mes");

    expect(result.top_conductores_km[0].conductor).toBe("Carlos Gomez");
    expect(result.top_camiones_uso[0].placa).toBe("ABC-123");
    expect(query.mock.calls[0][0]).toContain("INTERVAL '30 days'");
  });

  it("getHistorial agrega busqueda cuando recibe search", async () => {
    query.mockResolvedValue({ rows: [{ id: "j1", camion: "ABC-123" }] });

    const repository = new DashboardGerencialRepository();
    const result = await repository.getHistorial("semana", "ABC");

    expect(result).toEqual([{ id: "j1", camion: "ABC-123" }]);
    expect(query.mock.calls[0][0]).toContain("ILIKE '%ABC%'");
    expect(query.mock.calls[0][0]).toContain("ORDER BY j.fecha_jornada DESC");
  });
});
