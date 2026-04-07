import { describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import { startPgMem, stopPgMem } from "../../helpers/pgMemDb.mjs";
import { buildApiGatewayEvent } from "../../helpers/eventFactory.mjs";
import { handler } from "../../../src/functions/camion-services/camionHandler.mjs";

describe("camionHandler con pg-mem", () => {
  beforeAll(async () => {
    await startPgMem();
  });

  afterAll(async () => {
    await stopPgMem();
  });

  it("GET /camiones debe responder 200 y devolver camiones", async () => {
    const event = buildApiGatewayEvent({
      method: "GET",
      resource: "/camiones",
    });

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Camiones obtenidos exitosamente");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toHaveProperty("placa");
  });
});