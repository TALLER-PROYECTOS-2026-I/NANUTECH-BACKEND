import { jest } from "@jest/globals";

const mockQuery = jest.fn();
const mockRelease = jest.fn();

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  getClient: jest.fn(async () => ({
    query: mockQuery,
    release: mockRelease,
  })),
}));

const { JornadaRepository } = await import(
  "../../../src/functions/jornada-services/jornadaRepository.mjs"
);

describe("JornadaRepository", () => {
  let repository;

  beforeEach(() => {
    repository = new JornadaRepository();
    mockQuery.mockReset();
    mockRelease.mockReset();
  });

  test("crea una jornada usando las columnas reales del schema", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: "jor-1", conductor_id: "cond-1", estado: "REGISTRADA" }],
    });

    await repository.create({
      conductor_id: "cond-1",
      unidad_id: "uni-1",
      contrato_id: "con-1",
      creado_por: "admin-1",
      fecha_jornada: null,
      origen: null,
      destino: null,
      km_recorridos: null,
      observaciones: null,
      estado: "REGISTRADA",
    });

    const [query, values] = mockQuery.mock.calls[0];
    expect(query).toContain("conductor_id");
    expect(query).toContain("unidad_id");
    expect(query).toContain("contrato_id");
    expect(query).toContain("creado_por");
    expect(values).toEqual([
      "cond-1",
      "uni-1",
      "con-1",
      "admin-1",
      null,
      null,
      null,
      null,
      null,
      "REGISTRADA",
    ]);
    expect(mockRelease).toHaveBeenCalled();
  });

  test("busca la jornada actual por conductor", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "jor-1" }] });

    await repository.findCurrentByConductorId("cond-1");

    const [query, values] = mockQuery.mock.calls[0];
    expect(query).toContain("conductor_id = $1");
    expect(query).toContain("estado IN ('REGISTRADA', 'PENDIENTE', 'EN_PROCESO')");
    expect(values).toEqual(["cond-1"]);
  });

  test("verifica si una unidad tiene jornada activa o pendiente", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "jor-1" }] });

    const result = await repository.checkUnidadActiva("uni-1");

    const [query, values] = mockQuery.mock.calls[0];
    expect(query).toContain("unidad_id = $1");
    expect(query).toContain("estado IN ('REGISTRADA', 'PENDIENTE', 'EN_PROCESO')");
    expect(values).toEqual(["uni-1"]);
    expect(result).toBe(true);
  });

  test("inicia turno usando hora del servidor", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: "jor-1", estado: "EN_PROCESO" }],
    });

    await repository.startTurn("jor-1");

    const [query, values] = mockQuery.mock.calls[0];
    expect(query).toContain("hora_inicio = NOW()");
    expect(query).toContain("estado = 'EN_PROCESO'");
    expect(values).toEqual(["jor-1"]);
  });

  test("finaliza turno y devuelve duración total", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: "jor-1", estado: "COMPLETADA", duracion_total_segundos: 3600 }],
    });

    await repository.finishTurn("jor-1", "ok");

    const [query, values] = mockQuery.mock.calls[0];
    expect(query).toContain("hora_fin = NOW()");
    expect(query).toContain("estado = 'COMPLETADA'");
    expect(query).toContain("duracion_total_segundos");
    expect(values).toEqual(["jor-1", "ok"]);
  });

  test("findAll sin filtros retorna todas las jornadas con duracion_total y tiene_observaciones", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: "jor-1", duracion_total: "08:00", tiene_observaciones: false }],
    });

    const result = await repository.findAll();

    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain("duracion_total");
    expect(query).toContain("tiene_observaciones");
    expect(query).toContain("ORDER BY j.created_at DESC");
    expect(params).toEqual([]);
    expect(result[0].id).toBe("jor-1");
    expect(mockRelease).toHaveBeenCalled();
  });

  test("findAll filtra por texto de búsqueda general con ILIKE", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await repository.findAll({ q: "ABC" });

    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain("ILIKE");
    expect(query).toContain("un.placa");
    expect(params).toEqual(["%ABC%"]);
  });

  test("findAll filtra por conductor_id", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await repository.findAll({ conductor_id: "cond-1" });

    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain("j.conductor_id = $");
    expect(params).toContain("cond-1");
  });

  test("findAll filtra por rango de fechas", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await repository.findAll({ fecha_desde: "2026-01-01", fecha_hasta: "2026-04-30" });

    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain("j.fecha_jornada >=");
    expect(query).toContain("j.fecha_jornada <=");
    expect(params).toContain("2026-01-01");
    expect(params).toContain("2026-04-30");
  });

  test("findAll combina múltiples filtros con AND", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await repository.findAll({ conductor_id: "cond-1", fecha_desde: "2026-04-01" });

    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain("WHERE");
    expect(params).toHaveLength(2);
  });

  test("exportAll retorna columnas para CSV con placa separada", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: "jor-1", placa: "ABC-123", duracion_total: "08:00" }],
    });

    const result = await repository.exportAll({});

    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain("un.placa");
    expect(query).toContain("duracion_total");
    expect(query).toContain("TO_CHAR(j.hora_inicio");
    expect(query).toContain("TO_CHAR(j.hora_fin");
    expect(params).toEqual([]);
    expect(result[0].placa).toBe("ABC-123");
    expect(mockRelease).toHaveBeenCalled();
  });

  test("exportAll aplica los mismos filtros que findAll", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await repository.exportAll({ q: "XYZ", conductor_id: "cond-2" });

    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain("ILIKE");
    expect(params).toEqual(["%XYZ%", "cond-2"]);
  });
});
