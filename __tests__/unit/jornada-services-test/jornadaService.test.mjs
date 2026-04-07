import { jest } from "@jest/globals";

// Mock dependencias
jest.unstable_mockModule(
  "../../../src/functions/jornada-services/jornadaRepository.mjs",
  () => {
    return {
      JornadaRepository: jest.fn().mockImplementation(() => ({
        checkUnidadActiva: jest.fn(),
        create: jest.fn(),
      })),
    };
  },
);

// Cargar modulo DESPUES del mock para ES modules en Jest
const { JornadaService } =
  await import("../../../src/functions/jornada-services/jornadaService.mjs");

describe("JornadaService - Pruebas de Integración T18", () => {
  let jornadaService;

  beforeEach(() => {
    jest.clearAllMocks();
    jornadaService = new JornadaService();
  });

  test("T18: Debe lanzar error si se intenta registrar una jornada con unidad ya asignada (activa)", async () => {
    jornadaService.repository.checkUnidadActiva.mockResolvedValue(true);

    const data = {
      id_conductor: 1,
      id_unidad: 101,
      id_contrato: 50,
    };

    await expect(jornadaService.createJornada(data)).rejects.toThrow(
      "La unidad ya tiene una jornada activa.",
    );
    expect(jornadaService.repository.create).not.toHaveBeenCalled();
  });

  test("Debe registrar jornada si la unidad está disponible", async () => {
    jornadaService.repository.checkUnidadActiva.mockResolvedValue(false);

    const dbResponse = {
      id: 99,
      id_conductor: 1,
      id_unidad: 102,
      id_contrato: 50,
      estado: "ACTIVA",
    };
    jornadaService.repository.create.mockResolvedValue(dbResponse);

    const data = { id_conductor: 1, id_unidad: 102, id_contrato: 50 };
    const result = await jornadaService.createJornada(data);

    expect(result.id).toBe(99);
    expect(jornadaService.repository.create).toHaveBeenCalledWith(
      expect.objectContaining(data),
    );
  });
});
