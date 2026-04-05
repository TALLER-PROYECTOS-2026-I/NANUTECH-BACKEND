import { jest } from "@jest/globals";

jest.unstable_mockModule(
  "../../../src/functions/jornada-services/jornadaController.mjs",
  () => ({
    createJornadaController: jest.fn(),
  }),
);

const { handler } =
  await import("../../../src/functions/jornada-services/jornadaHandler.mjs");
const { createJornadaController } =
  await import("../../../src/functions/jornada-services/jornadaController.mjs");

describe("jornadaHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Debe llamar a createJornadaController cuando el método es POST", async () => {
    const event = { requestContext: { http: { method: "POST" } } };
    const expectedResponse = { statusCode: 200, body: '{"success":true}' };
    createJornadaController.mockResolvedValue(expectedResponse);

    const response = await handler(event);
    expect(createJornadaController).toHaveBeenCalledWith(event);
    expect(response).toEqual(expectedResponse);
  });

  test("Debe retornar 404 para métodos no soportados", async () => {
    const event = { requestContext: { http: { method: "GET" } } };
    const response = await handler(event);
    expect(response.statusCode).toBe(404);
  });
});
