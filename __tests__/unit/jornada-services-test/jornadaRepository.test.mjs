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
    expect(query).toContain("estado IN ('REGISTRADA', 'EN_PROCESO')");
    expect(values).toEqual(["cond-1"]);
  });

  test("verifica si una unidad tiene jornada activa o pendiente", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "jor-1" }] });

    const result = await repository.checkUnidadActiva("uni-1");

    const [query, values] = mockQuery.mock.calls[0];
    expect(query).toContain("unidad_id = $1");
    expect(query).toContain("estado IN ('REGISTRADA', 'EN_PROCESO')");
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
});
