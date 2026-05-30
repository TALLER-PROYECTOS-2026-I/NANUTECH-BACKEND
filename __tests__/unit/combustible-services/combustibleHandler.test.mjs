import { jest } from "@jest/globals";

jest.unstable_mockModule("../../../src/functions/combustible-services/combustibleController.mjs", () => ({
  registrarCombustibleController: jest.fn().mockResolvedValue({ statusCode: 200, body: "{}" }),
  getUltimoKmController: jest.fn().mockResolvedValue({ statusCode: 200, body: "{}" }),
  getCombustibleByJornadaController: jest.fn().mockResolvedValue({ statusCode: 200, body: "{}" }),
}));

const { handler } = await import("../../../src/functions/combustible-services/combustibleHandler.mjs");
const combustibleController = await import("../../../src/functions/combustible-services/combustibleController.mjs");

describe("CombustibleHandler", () => {
  beforeEach(() => jest.clearAllMocks());

  test("rutea POST /combustible con API Gateway v1", async () => {
    const event = { httpMethod: "POST", resource: "/combustible" };

    await handler(event);

    expect(combustibleController.registrarCombustibleController).toHaveBeenCalledWith(event);
  });

  test("rutea GET /combustible/ultimo-km/{unidadId} con API Gateway v1", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/combustible/ultimo-km/{unidadId}",
      pathParameters: { unidadId: "aaaa0001-0000-0000-0000-000000000001" },
    };

    await handler(event);

    expect(combustibleController.getUltimoKmController).toHaveBeenCalledWith(event);
  });

  test("rutea GET /combustible/jornada/{jornadaId} con API Gateway v1", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/combustible/jornada/{jornadaId}",
      pathParameters: { jornadaId: "cccc0003-0000-0000-0000-000000000003" },
    };

    await handler(event);

    expect(combustibleController.getCombustibleByJornadaController).toHaveBeenCalledWith(event);
  });

  test("rutea POST /combustible con rawPath API Gateway v2", async () => {
    const event = {
      requestContext: { http: { method: "POST" } },
      rawPath: "/combustible",
    };

    await handler(event);

    expect(combustibleController.registrarCombustibleController).toHaveBeenCalledWith(event);
  });

  test("rutea GET /combustible/ultimo-km/{unidadId} con rawPath API Gateway v2", async () => {
    const event = {
      requestContext: { http: { method: "GET" } },
      rawPath: "/combustible/ultimo-km/aaaa0001-0000-0000-0000-000000000001",
    };

    await handler(event);

    expect(combustibleController.getUltimoKmController).toHaveBeenCalledWith(event);
  });

  test("rutea GET /combustible/jornada/{jornadaId} con rawPath API Gateway v2", async () => {
    const event = {
      requestContext: { http: { method: "GET" } },
      rawPath: "/combustible/jornada/cccc0003-0000-0000-0000-000000000003",
    };

    await handler(event);

    expect(combustibleController.getCombustibleByJornadaController).toHaveBeenCalledWith(event);
  });

  test("retorna 404 para ruta no encontrada", async () => {
    const result = await handler({
      httpMethod: "DELETE",
      resource: "/combustible/no-existe",
    });

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Ruta no encontrada");
  });
});