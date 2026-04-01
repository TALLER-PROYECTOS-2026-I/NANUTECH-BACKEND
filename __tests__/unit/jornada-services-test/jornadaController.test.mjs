import { jest } from "@jest/globals";

jest.unstable_mockModule(
  "../../../src/functions/jornada-services/jornadaService.mjs",
  () => {
    return {
      JornadaService: jest.fn().mockImplementation(() => ({
        createJornada: jest.fn(),
      })),
    };
  },
);

const { JornadaService } =
  await import("../../../src/functions/jornada-services/jornadaService.mjs");
const { createJornadaController } =
  await import("../../../src/functions/jornada-services/jornadaController.mjs");

describe("jornadaController", () => {
  let mockServiceInstance;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Debe retornar successResponse cuando el servicio registra jornada correctamente", async () => {
    const event = {
      body: JSON.stringify({ id_conductor: 1, id_unidad: 2, id_contrato: 3 }),
    };
    const mockJornada = {
      id: 10,
      id_conductor: 1,
      id_unidad: 2,
      id_contrato: 3,
      estado: "ACTIVA",
    };

    JornadaService.mockImplementation(() => ({
      createJornada: jest.fn().mockResolvedValue(mockJornada),
    }));

    const response = await createJornadaController(event);
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockJornada);
  });

  test("Debe retornar errorResponse 400 cuando el servicio lanza error de validación", async () => {
    const event = { body: JSON.stringify({}) };

    JornadaService.mockImplementation(() => ({
      createJornada: jest
        .fn()
        .mockRejectedValue(new Error("El id_conductor es requerido")),
    }));

    const response = await createJornadaController(event);
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.message).toContain("requerido");
  });
});
