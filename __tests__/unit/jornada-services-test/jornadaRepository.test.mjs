import { jest } from "@jest/globals";

const mockQuery = jest.fn();
const mockRelease = jest.fn();

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  getClient: jest.fn().mockResolvedValue({
    query: mockQuery,
    release: mockRelease,
  }),
}));

const { JornadaRepository } =
  await import("../../../src/functions/jornada-services/jornadaRepository.mjs");

describe("jornadaRepository", () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new JornadaRepository();
  });

  test("inserta una jornada con naming alineado al schema real", async () => {
    const jornadaData = {
      conductor_id: "chofer-1",
      unidad_id: "unidad-1",
      contrato_id: "contrato-1",
      creado_por: "admin-1",
      fecha_jornada: null,
      origen: null,
      destino: null,
      km_recorridos: 0,
      observaciones: null,
      estado: "REGISTRADA",
    };
    mockQuery.mockResolvedValue({ rows: [{ id: "jornada-1", ...jornadaData }] });

    const result = await repository.create(jornadaData);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO jornadas"),
      [
        "chofer-1",
        "unidad-1",
        "contrato-1",
        "admin-1",
        null,
        null,
        null,
        0,
        null,
        "REGISTRADA",
      ],
    );
    expect(mockRelease).toHaveBeenCalled();
    expect(result.id).toBe("jornada-1");
  });

  test("busca jornada actual por conductor_id", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "jornada-1" }] });

    const result = await repository.findCurrentByConductorId("chofer-1");

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE conductor_id = $1"),
      ["chofer-1"],
    );
    expect(result.id).toBe("jornada-1");
  });

  test("verifica si la unidad tiene jornada registrada o en proceso", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "jornada-1" }] });

    const result = await repository.checkUnidadActiva("unidad-1");

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE unidad_id = $1"),
      ["unidad-1"],
    );
    expect(result).toBe(true);
  });

  test("actualiza hora_inicio usando timestamp del servidor", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "jornada-1", estado: "EN_PROCESO" }] });

    const result = await repository.startTurn("jornada-1");

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("hora_inicio = NOW()"),
      ["jornada-1"],
    );
    expect(result.estado).toBe("EN_PROCESO");
  });

  test("actualiza hora_fin y devuelve duracion total al finalizar", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "jornada-1",
          estado: "COMPLETADA",
          duracion_total_segundos: 36000,
        },
      ],
    });

    const result = await repository.finishTurn("jornada-1", "Cierre correcto");

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("hora_fin = NOW()"),
      ["jornada-1", "Cierre correcto"],
    );
    expect(result.duracion_total_segundos).toBe(36000);
  });
});
