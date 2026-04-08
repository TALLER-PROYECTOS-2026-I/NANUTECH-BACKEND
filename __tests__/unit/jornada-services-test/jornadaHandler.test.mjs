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

const { handler } =
  await import("../../../src/functions/jornada-services/jornadaHandler.mjs");
const {
  createJornadaController,
  finishTurnController,
  getCurrentJornadaController,
  startTurnController,
} = await import("../../../src/functions/jornada-services/jornadaController.mjs");

describe("jornadaHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("redirige POST /jornadas al createJornadaController", async () => {
    const event = { httpMethod: "POST", resource: "/jornadas" };
    const expectedResponse = { statusCode: 200, body: '{"success":true}' };
    createJornadaController.mockResolvedValue(expectedResponse);

    const response = await handler(event);

    expect(createJornadaController).toHaveBeenCalledWith(event);
    expect(response).toEqual(expectedResponse);
  });

  test("redirige GET /jornadas/actual/{conductorId} al controller de jornada actual", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/jornadas/actual/{conductorId}",
      pathParameters: { conductorId: "chofer-1" },
    };
    const expectedResponse = { statusCode: 200, body: '{"success":true}' };
    getCurrentJornadaController.mockResolvedValue(expectedResponse);

    const response = await handler(event);

    expect(getCurrentJornadaController).toHaveBeenCalledWith(event);
    expect(response).toEqual(expectedResponse);
  });

  test("redirige POST /jornadas/iniciar al controller de inicio", async () => {
    const event = { httpMethod: "POST", resource: "/jornadas/iniciar" };
    const expectedResponse = { statusCode: 200, body: '{"success":true}' };
    startTurnController.mockResolvedValue(expectedResponse);

    const response = await handler(event);

    expect(startTurnController).toHaveBeenCalledWith(event);
    expect(response).toEqual(expectedResponse);
  });

  test("redirige POST /jornadas/finalizar al controller de fin", async () => {
    const event = { httpMethod: "POST", resource: "/jornadas/finalizar" };
    const expectedResponse = { statusCode: 200, body: '{"success":true}' };
    finishTurnController.mockResolvedValue(expectedResponse);

    const response = await handler(event);

    expect(finishTurnController).toHaveBeenCalledWith(event);
    expect(response).toEqual(expectedResponse);
  });

  test("retorna 404 para rutas no soportadas", async () => {
    const response = await handler({
      httpMethod: "GET",
      resource: "/jornadas/desconocida",
    });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.success).toBe(false);
    expect(body.data.code).toBe("ROUTE_NOT_FOUND");
  });
});
