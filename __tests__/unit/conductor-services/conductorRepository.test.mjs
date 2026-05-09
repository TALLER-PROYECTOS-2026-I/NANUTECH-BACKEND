import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

const dbMock = {
  query: jest.fn(),
};

let ConductorRepository;

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  default: dbMock,
}));

beforeAll(async () => {
  ({ ConductorRepository } = await import(
    "../../../src/functions/conductor-services/conductorRepository.mjs"
  ));
});

describe("ConductorRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("consulta usuarios chofer activos ordenados por apellidos y nombres", async () => {
    const rows = [{ id: "usr-1", rol: "CHOFER", activo: true, estado: "ACTIVO" }];
    dbMock.query.mockResolvedValue({ rows });

    const repository = new ConductorRepository();
    const result = await repository.getAllActive();

    expect(result).toEqual(rows);
    expect(dbMock.query).toHaveBeenCalledTimes(1);
    expect(dbMock.query.mock.calls[0][0]).toContain("WHERE rol = 'CHOFER'");
    expect(dbMock.query.mock.calls[0][0]).toContain("estado = 'ACTIVO'");
    expect(dbMock.query.mock.calls[0][0]).toContain("ORDER BY apellidos, nombres");
  });

  it("propaga errores de base de datos", async () => {
    dbMock.query.mockRejectedValue(new Error("DB error"));

    const repository = new ConductorRepository();

    await expect(repository.getAllActive()).rejects.toThrow("DB error");
  });
});
