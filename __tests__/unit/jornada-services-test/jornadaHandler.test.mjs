import { jest } from "@jest/globals";

jest.unstable_mockModule(
  "../../../src/functions/jornada-services/jornadaController.mjs",
  () => ({
    createJornadaController: jest.fn(),
    getCurrentJornadaController: jest.fn(),
    startTurnController: jest.fn(),
    finishTurnController: jest.fn(),
  }),
);

const { handler } = await import(
  "../../../src/functions/jornada-services/jornadaHandler.mjs"
);
const jornadaController = await import(
  "../../../src/functions/jornada-services/jornadaController.mjs"
);

describe("JornadaHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("delegates POST /jornadas to createJornadaController", async () => {
    jornadaController.createJornadaController.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    const result = await handler({
      httpMethod: "POST",
      resource: "/jornadas",
    });

    expect(jornadaController.createJornadaController).toHaveBeenCalled();
    expect(result.statusCode).toBe(200);
  });

  test("delegates GET /jornadas/actual/{conductorId} to getCurrentJornadaController", async () => {
    jornadaController.getCurrentJornadaController.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    const result = await handler({
      httpMethod: "GET",
      resource: "/jornadas/actual/{conductorId}",
    });

    expect(jornadaController.getCurrentJornadaController).toHaveBeenCalled();
    expect(result.statusCode).toBe(200);
  });

  test("delegates POST /jornadas/iniciar to startTurnController", async () => {
    jornadaController.startTurnController.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    const result = await handler({
      httpMethod: "POST",
      resource: "/jornadas/iniciar",
    });

    expect(jornadaController.startTurnController).toHaveBeenCalled();
    expect(result.statusCode).toBe(200);
  });

  test("delegates POST /jornadas/finalizar to finishTurnController", async () => {
    jornadaController.finishTurnController.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    const result = await handler({
      httpMethod: "POST",
      resource: "/jornadas/finalizar",
    });

    expect(jornadaController.finishTurnController).toHaveBeenCalled();
    expect(result.statusCode).toBe(200);
  });

  test("returns 404 for unknown route", async () => {
    const result = await handler({
      httpMethod: "GET",
      resource: "/jornadas/desconocida",
    });

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toMatchObject({
      success: false,
      data: { code: "ROUTE_NOT_FOUND" },
    });
  });
});
