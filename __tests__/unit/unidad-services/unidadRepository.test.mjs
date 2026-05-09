import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

const dbMock = {
  query: jest.fn(),
};

let UnidadRepository;

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  default: dbMock,
}));

beforeAll(async () => {
  ({ UnidadRepository } = await import(
    "../../../src/functions/unidad-services/unidadRepository.mjs"
  ));
});

describe("UnidadRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("consulta unidades disponibles activas ordenadas por placa", async () => {
    const rows = [{ id: "uni-1", placa: "ABC-123", estado: "DISPONIBLE", activo: true }];
    dbMock.query.mockResolvedValue({ rows });

    const repository = new UnidadRepository();
    const result = await repository.getAllDisponibles();

    expect(result).toEqual(rows);
    expect(dbMock.query).toHaveBeenCalledTimes(1);
    expect(dbMock.query.mock.calls[0][0]).toContain("estado = 'DISPONIBLE'");
    expect(dbMock.query.mock.calls[0][0]).toContain("activo = TRUE");
    expect(dbMock.query.mock.calls[0][0]).toContain("ORDER BY placa");
  });

  it("propaga errores de base de datos", async () => {
    dbMock.query.mockRejectedValue(new Error("DB error"));

    const repository = new UnidadRepository();

    await expect(repository.getAllDisponibles()).rejects.toThrow("DB error");
  });
});
