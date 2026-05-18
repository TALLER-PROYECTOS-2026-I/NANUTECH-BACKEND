import { jest } from "@jest/globals";

jest.unstable_mockModule("../../../src/functions/alerta-services/alertaController.mjs", () => ({
  getIndicadoresController: jest.fn().mockResolvedValue({ statusCode: 200, body: "{}" }),
  getAlertasActivasController: jest.fn().mockResolvedValue({ statusCode: 200, body: "{}" }),
  resolverAlertaController: jest.fn().mockResolvedValue({ statusCode: 200, body: "{}" }),
  actualizarEstadoController: jest.fn().mockResolvedValue({ statusCode: 200, body: "{}" }),
}));

const { handler } = await import("../../../src/functions/alerta-services/alertaHandler.mjs");
const alertaController = await import("../../../src/functions/alerta-services/alertaController.mjs");

describe("AlertaHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rutea GET /alertas/indicadores a getIndicadoresController", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/alertas/indicadores",
    };

    await handler(event);

    expect(alertaController.getIndicadoresController).toHaveBeenCalledWith(event);
  });

  test("rutea GET /alertas/activas a getAlertasActivasController", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/alertas/activas",
    };

    await handler(event);

    expect(alertaController.getAlertasActivasController).toHaveBeenCalledWith(event);
  });

  test("rutea PATCH /alertas/{id}/resolver a resolverAlertaController", async () => {
    const event = {
      httpMethod: "PATCH",
      resource: "/alertas/{id}/resolver",
    };

    await handler(event);

    expect(alertaController.resolverAlertaController).toHaveBeenCalledWith(event);
  });

  test("rutea PATCH /alertas/{id}/estado a actualizarEstadoController", async () => {
    const event = {
      httpMethod: "PATCH",
      resource: "/alertas/{id}/estado",
    };

    await handler(event);

    expect(alertaController.actualizarEstadoController).toHaveBeenCalledWith(event);
  });

  test("retorna 404 para ruta no registrada", async () => {
    const event = {
      httpMethod: "DELETE",
      resource: "/alertas/no-existe",
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Ruta no encontrada");
  });
});
