import { jest } from "@jest/globals";

const mockQuery = jest.fn();
const mockRelease = jest.fn();

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  getClient: jest.fn().mockResolvedValue({
    query: mockQuery,
    release: mockRelease,
  }),
}));

const { CombustibleRepository } = await import(
  "../../../src/functions/combustible-services/combustibleRepository.mjs"
);

describe("CombustibleRepository", () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new CombustibleRepository();
  });

  test("findJornadaEnProceso consulta jornada activa", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "cccc0003-0000-0000-0000-000000000003", estado: "EN_PROCESO" }],
    });

    const result = await repository.findJornadaEnProceso(
      "cccc0003-0000-0000-0000-000000000003",
      "22222222-2222-2222-2222-222222222222"
    );

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("j.estado = 'EN_PROCESO'"),
      [
        "cccc0003-0000-0000-0000-000000000003",
        "22222222-2222-2222-2222-222222222222",
      ]
    );
    expect(result.estado).toBe("EN_PROCESO");
    expect(mockRelease).toHaveBeenCalled();
  });

  test("findJornadaEnProceso retorna null si no existe", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await repository.findJornadaEnProceso(
      "cccc0003-0000-0000-0000-000000000003",
      "22222222-2222-2222-2222-222222222222"
    );

    expect(result).toBeNull();
    expect(mockRelease).toHaveBeenCalled();
  });

  test("getUltimoKilometraje retorna valor numérico", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ultimo_kilometraje: "1000" }] });

    const result = await repository.getUltimoKilometraje(
      "aaaa0001-0000-0000-0000-000000000001"
    );

    expect(result).toBe(1000);
    expect(mockRelease).toHaveBeenCalled();
  });

  test("getUltimoKilometraje retorna 0 si no hay fila", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await repository.getUltimoKilometraje(
      "aaaa0001-0000-0000-0000-000000000001"
    );

    expect(result).toBe(0);
    expect(mockRelease).toHaveBeenCalled();
  });

  test("createRegistro usa transacción e inserta registro", async () => {
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ id: "fuel-1", galones: "10", costo_total: "180" }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const result = await repository.createRegistro({
      jornada_id: "cccc0003-0000-0000-0000-000000000003",
      unidad_id: "aaaa0001-0000-0000-0000-000000000001",
      conductor_id: "22222222-2222-2222-2222-222222222222",
      contrato_id: "bbbb0001-0000-0000-0000-000000000001",
      tipo_comprobante: "TICKET",
      numero_comprobante: null,
      galones: 10,
      costo_total: 180,
      kilometraje_actual: 1350,
      kilometraje_anterior: 1000,
      rendimiento_km_galon: 35,
      foto_comprobante_url: "https://demo.com/foto.jpg",
      observaciones: null,
      latitud: null,
      longitud: null,
      estado: "SINCRONIZADO",
      sincronizado: true,
      registrado_at: "2026-05-29T10:00:00.000Z",
    });

    expect(mockQuery).toHaveBeenCalledWith("BEGIN");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO combustible_registros"),
      expect.any(Array)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE unidades"),
      [1350, "aaaa0001-0000-0000-0000-000000000001"]
    );
    expect(mockQuery).toHaveBeenCalledWith("COMMIT");
    expect(result.id).toBe("fuel-1");
    expect(mockRelease).toHaveBeenCalled();
  });

  test("createRegistro hace rollback si falla", async () => {
    const dbError = new Error("DB error");

    mockQuery
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(dbError)
      .mockResolvedValueOnce({});

    await expect(
      repository.createRegistro({
        jornada_id: "cccc0003-0000-0000-0000-000000000003",
        unidad_id: "aaaa0001-0000-0000-0000-000000000001",
        conductor_id: "22222222-2222-2222-2222-222222222222",
        contrato_id: "bbbb0001-0000-0000-0000-000000000001",
        tipo_comprobante: "TICKET",
        numero_comprobante: null,
        galones: 10,
        costo_total: 180,
        kilometraje_actual: 1350,
        kilometraje_anterior: 1000,
        rendimiento_km_galon: 35,
        foto_comprobante_url: "https://demo.com/foto.jpg",
        observaciones: null,
        latitud: null,
        longitud: null,
        estado: "SINCRONIZADO",
        sincronizado: true,
        registrado_at: "2026-05-29T10:00:00.000Z",
      })
    ).rejects.toThrow("DB error");

    expect(mockQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mockRelease).toHaveBeenCalled();
  });

  test("findByJornada retorna registros", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "fuel-1", jornada_id: "cccc0003-0000-0000-0000-000000000003" }],
    });

    const result = await repository.findByJornada(
      "cccc0003-0000-0000-0000-000000000003"
    );

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE jornada_id = $1"),
      ["cccc0003-0000-0000-0000-000000000003"]
    );
    expect(result).toHaveLength(1);
    expect(mockRelease).toHaveBeenCalled();
  });
});