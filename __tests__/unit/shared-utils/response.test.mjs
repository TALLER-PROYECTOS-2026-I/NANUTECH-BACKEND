import { describe, it, expect } from "@jest/globals";
import {
  createResponse,
  successResponse,
  errorResponse,
} from "../../../src/shared/utils/response/response.mjs";

describe("response utils", () => {
  it("createResponse construye una respuesta con data opcional", () => {
    const result = createResponse(201, true, "Creado", { id: "1" });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(body).toEqual({ success: true, message: "Creado", data: { id: "1" } });
  });

  it("createResponse omite data cuando es null", () => {
    const result = createResponse(204, true, "Sin contenido");
    const body = JSON.parse(result.body);

    expect(body).toEqual({ success: true, message: "Sin contenido" });
  });

  it("successResponse soporta mensaje, data y status code personalizados", () => {
    const result = successResponse({ ok: true }, "OK", 202);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(202);
    expect(body).toEqual({ success: true, message: "OK", data: { ok: true } });
  });

  it("successResponse omite mensaje y data cuando son null", () => {
    const result = successResponse();
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body).toEqual({ success: true });
  });

  it("errorResponse construye errores con data opcional", () => {
    const result = errorResponse("Fallo", 400, { campo: "placa" });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body).toEqual({ success: false, message: "Fallo", data: { campo: "placa" } });
  });
});
