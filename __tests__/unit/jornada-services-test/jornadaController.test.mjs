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

const {
  createJornadaController,
  getCurrentJornadaController,
  startTurnController,
  finishTurnController,
} = await import("../../../src/functions/jornada-services/jornadaController.mjs");
const { JornadaService } = await import(
  "../../../src/functions/jornada-services/jornadaService.mjs"
);

describe("JornadaController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("crea jornada exitosamente", async () => {
    JornadaService.mockImplementation(() => ({
      createJornada: jest.fn().mockResolvedValue({ id: "jor-1" }),
    }));

    const result = await createJornadaController({
      body: JSON.stringify({
        conductor_id: "cond-1",
        unidad_id: "uni-1",
        contrato_id: "con-1",
        creado_por: "admin-1",
      }),
    });

    expect(result.statusCode).toBe(200);
  });

  test("obtiene la jornada actual exitosamente", async () => {
    JornadaService.mockImplementation(() => ({
      getCurrentJornada: jest.fn().mockResolvedValue({ id: "jor-1" }),
    }));

    const result = await getCurrentJornadaController({
      pathParameters: { conductorId: "cond-1" },
    });

    expect(result.statusCode).toBe(200);
  });

  test("inicia turno exitosamente", async () => {
    JornadaService.mockImplementation(() => ({
      startTurn: jest.fn().mockResolvedValue({
        id: "jor-1",
        estado: "EN_PROCESO",
      }),
    }));

    const result = await startTurnController({
      body: JSON.stringify({ jornada_id: "jor-1" }),
    });

    expect(result.statusCode).toBe(200);
  });

  test("finaliza turno exitosamente con duración", async () => {
    JornadaService.mockImplementation(() => ({
      finishTurn: jest.fn().mockResolvedValue({
        id: "jor-1",
        estado: "COMPLETADA",
        duracion_total_segundos: 7200,
      }),
    }));

    const result = await finishTurnController({
      body: JSON.stringify({
        jornada_id: "jor-1",
        observaciones: "Todo correcto",
      }),
    });

    expect(result.statusCode).toBe(200);
  });

  test("devuelve error controlado cuando el service rechaza el inicio", async () => {
    JornadaService.mockImplementation(() => ({
      startTurn: jest.fn().mockRejectedValue({
        message: "La jornada ya fue iniciada.",
        statusCode: 400,
        code: "JORNADA_ALREADY_STARTED",
      }),
    }));

    const result = await startTurnController({
      body: JSON.stringify({ jornada_id: "jor-1" }),
    });

    expect(result.statusCode).toBe(400);
  });
});
