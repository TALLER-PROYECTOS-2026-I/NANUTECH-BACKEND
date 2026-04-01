import { jest } from "@jest/globals";

const mockQuery = jest.fn();
const mockRelease = jest.fn();

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  getDbClient: jest.fn().mockResolvedValue({
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

  test("Debe insertar y retornar la jornada en create()", async () => {
    const jornadaData = {
      id_conductor: 1,
      id_unidad: 2,
      id_contrato: 3,
      estado: "ACTIVA",
    };
    const mockDbRow = { id: 1, ...jornadaData };

    mockQuery.mockResolvedValue({ rows: [mockDbRow] });

    const result = await repository.create(jornadaData);

    expect(mockQuery).toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalled();
    expect(result).toEqual(mockDbRow);
  });

  test("Debe verificar si la unidad está activa en checkUnidadActiva()", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

    const result = await repository.checkUnidadActiva(2);

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [2]);
    expect(result).toBe(true);
  });
});
