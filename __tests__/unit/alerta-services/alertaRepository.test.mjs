import { jest } from "@jest/globals";

const mockQuery = jest.fn();
const mockRelease = jest.fn();

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  getClient: jest.fn().mockResolvedValue({
    query: mockQuery,
    release: mockRelease,
  }),
}));

const { AlertaRepository } = await import("../../../src/functions/alerta-services/alertaRepository.mjs");
const { getClient } = await import("../../../src/shared/config/database.mjs");

describe("AlertaRepository", () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new AlertaRepository();
  });

  test("getIndicadores ejecuta query correcta", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          panico_activas: "2",
          auxilio_pendientes: "2",
          total_resueltas: "12",
          tiene_panico_activo: true,
        },
      ],
    });

    const result = await repository.getIndicadores();

    expect(getClient).toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalled();
    const queryArg = mockQuery.mock.calls[0][0];
    expect(queryArg).toContain("COUNT(CASE WHEN tipo = 'PANICO'");
    expect(mockQuery.mock.calls[0][1]).toBeUndefined();
    expect(result.panico_activas).toBe(2);
    expect(result.tiene_panico_activo).toBe(true);
  });

  test("findActivas construye WHERE dinámico con filtros", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await repository.findActivas({ tipo: "PANICO", estado: "ACTIVA" });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("a.tipo = $1"),
      expect.arrayContaining(["PANICO", "ACTIVA"])
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("a.estado = $2"),
      expect.anything()
    );
    expect(mockRelease).toHaveBeenCalled();
  });

  test("findActivas sin filtros retorna todo", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await repository.findActivas();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("a.estado IN ('ACTIVA', 'EN_PROCESO')"),
      []
    );
    expect(mockRelease).toHaveBeenCalled();
  });

  test("resolverAlerta actualiza campos correctos", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "alert-1",
          estado: "RESUELTA",
          atendida: true,
          detalle_resolucion: "Cambio de batería",
          servicio_tecnico_realizado: "Técnico A",
        },
      ],
    });

    const result = await repository.resolverAlerta("alert-1", {
      detalle_resolucion: "Cambio de batería",
      servicio_tecnico_realizado: "Técnico A",
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("estado = 'RESUELTA'"),
      expect.anything()
    );
    expect(result.estado).toBe("RESUELTA");
    expect(mockRelease).toHaveBeenCalled();
  });

  test("actualizarEstado actualiza estado correctamente", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: "alert-1", estado: "EN_PROCESO" }],
    });

    const result = await repository.actualizarEstado("alert-1", "EN_PROCESO");

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("estado = $2"),
      ["alert-1", "EN_PROCESO"]
    );
    expect(result.estado).toBe("EN_PROCESO");
    expect(mockRelease).toHaveBeenCalled();
  });

  test("findById retorna null si no existe", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await repository.findById("no-existe");

    expect(result).toBeNull();
    expect(mockRelease).toHaveBeenCalled();
  });
});
