import { jest } from "@jest/globals";

jest.unstable_mockModule(
  "../../../src/functions/jornada-services/jornadaService.mjs",
  () => ({
    JornadaService: jest.fn().mockImplementation(() => ({
      createJornada: jest.fn(),
      getCurrentJornada: jest.fn(),
      startTurn: jest.fn(),
      finishTurn: jest.fn(),
    })),
  }),
);

const { JornadaService } =
  await import("../../../src/functions/jornada-services/jornadaService.mjs");
const {
  createJornadaController,
  finishTurnController,
  getCurrentJornadaController,
  startTurnController,
} = await import("../../../src/functions/jornada-services/jornadaController.mjs");

describe("jornadaController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("retorna successResponse cuando registra jornada correctamente", async () => {
    JornadaService.mockImplementation(() => ({
      createJornada: jest.fn().mockResolvedValue({
        id: "jornada-1",
        conductor_id: "chofer-1",
        estado: "REGISTRADA",
      }),
    }));

    const response = await createJornadaController({
      body: JSON.stringify({
        conductor_id: "chofer-1",
        unidad_id: "unidad-1",
        contrato_id: "contrato-1",
        creado_por: "admin-1",
      }),
    });

    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.estado).toBe("REGISTRADA");
  });

  test("retorna jornada actual del conductor", async () => {
    JornadaService.mockImplementation(() => ({
      getCurrentJornada: jest.fn().mockResolvedValue({
        id: "jornada-1",
        conductor_id: "chofer-1",
        estado: "EN_PROCESO",
      }),
    }));

    const response = await getCurrentJornadaController({
      pathParameters: { conductorId: "chofer-1" },
    });

    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.estado).toBe("EN_PROCESO");
  });

  test("retorna respuesta de inicio de turno", async () => {
    JornadaService.mockImplementation(() => ({
      startTurn: jest.fn().mockResolvedValue({
        id: "jornada-1",
        estado: "EN_PROCESO",
      }),
    }));

    const response = await startTurnController({
      body: JSON.stringify({ jornada_id: "jornada-1" }),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).data.estado).toBe("EN_PROCESO");
  });

  test("retorna respuesta de fin de turno con duracion total", async () => {
    JornadaService.mockImplementation(() => ({
      finishTurn: jest.fn().mockResolvedValue({
        id: "jornada-1",
        estado: "COMPLETADA",
        duracion_total_segundos: 36000,
      }),
    }));

    const response = await finishTurnController({
      body: JSON.stringify({
        jornada_id: "jornada-1",
        observaciones: "Cierre correcto",
      }),
    });

    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(body.data.estado).toBe("COMPLETADA");
    expect(body.data.duracion_total_segundos).toBe(36000);
  });

  test("retorna 400 cuando el service lanza error controlado", async () => {
    JornadaService.mockImplementation(() => ({
      startTurn: jest.fn().mockRejectedValue(
        Object.assign(new Error("La jornada ya fue iniciada"), {
          statusCode: 400,
          code: "JORNADA_ALREADY_STARTED",
        }),
      ),
    }));

    const response = await startTurnController({
      body: JSON.stringify({ jornada_id: "jornada-1" }),
    });

    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(400);
    expect(body.success).toBe(false);
    expect(body.data.code).toBe("JORNADA_ALREADY_STARTED");
  });
});
