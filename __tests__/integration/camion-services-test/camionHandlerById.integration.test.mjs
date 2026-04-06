import { describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import { startPgMem, stopPgMem } from "../../helpers/pgMemDb.mjs";
import { buildApiGatewayEvent } from "../../helpers/eventFactory.mjs";
import { handler } from "../../../src/functions/camion-services/camionHandler.mjs";

describe("camionHandler obtener por id con pg-mem", () => {
  beforeAll(async () => {
    await startPgMem();
  });

  afterAll(async () => {
    await stopPgMem();
  });

  it("GET /camiones/{id} debe responder 200 y devolver un camión", async () => {
    const event = buildApiGatewayEvent({
      method: "GET",
      resource: "/camiones/{id}",
      pathParameters: { id: "1" }, // cambia el nombre si tu handler espera camionId
    });

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data).toHaveProperty("id");
    expect(body.data).toHaveProperty("placa");
  });
});