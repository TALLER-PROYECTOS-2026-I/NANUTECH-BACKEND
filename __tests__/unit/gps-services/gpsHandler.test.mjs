import { jest } from "@jest/globals";

const mockGetProviders = jest.fn();
const mockGetTemplate = jest.fn();
const mockValidateCsv = jest.fn();
const mockImportCsv = jest.fn();
const mockGetSummary = jest.fn();
const mockListRegistros = jest.fn();
const mockGetTrackingSummary = jest.fn();
const mockExportTrackingCsv = jest.fn();

jest.unstable_mockModule("../../../src/functions/gps-services/gpsController.mjs", () => ({
  getProvidersController: mockGetProviders,
  getTemplateController: mockGetTemplate,
  validateCsvController: mockValidateCsv,
  importCsvController: mockImportCsv,
  getSummaryController: mockGetSummary,
  listRegistrosController: mockListRegistros,
  getTrackingSummaryController: mockGetTrackingSummary,
  exportTrackingCsvController: mockExportTrackingCsv,
}));

const { handler } = await import("../../../src/functions/gps-services/gpsHandler.mjs");

describe("HU08 - GpsHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetProviders.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    mockGetTemplate.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    mockValidateCsv.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    mockImportCsv.mockResolvedValue({
      statusCode: 201,
      body: JSON.stringify({ success: true }),
    });

    mockGetSummary.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    mockListRegistros.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });
  });

  test("debe enrutar GET /gps/proveedores", async () => {
    const response = await handler({
      httpMethod: "GET",
      resource: "/gps/proveedores",
    });

    expect(response.statusCode).toBe(200);
    expect(mockGetProviders).toHaveBeenCalled();
  });

  test("debe enrutar GET /gps/plantilla", async () => {
    const response = await handler({
      httpMethod: "GET",
      resource: "/gps/plantilla",
      queryStringParameters: {
        proveedor: "GPSCONTROL",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockGetTemplate).toHaveBeenCalled();
  });

  test("debe enrutar GET /gps/plantilla/{proveedor}", async () => {
    const response = await handler({
      httpMethod: "GET",
      resource: "/gps/plantilla/{proveedor}",
      pathParameters: {
        proveedor: "GPSCONTROL",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockGetTemplate).toHaveBeenCalled();
  });

  test("debe enrutar POST /gps/validar", async () => {
    const response = await handler({
      httpMethod: "POST",
      resource: "/gps/validar",
      body: "{}",
    });

    expect(response.statusCode).toBe(200);
    expect(mockValidateCsv).toHaveBeenCalled();
  });

  test("debe enrutar POST /gps/importar", async () => {
    const response = await handler({
      httpMethod: "POST",
      resource: "/gps/importar",
      body: "{}",
    });

    expect(response.statusCode).toBe(201);
    expect(mockImportCsv).toHaveBeenCalled();
  });

  test("debe enrutar GET /gps/resumen", async () => {
    const response = await handler({
      httpMethod: "GET",
      resource: "/gps/resumen",
    });

    expect(response.statusCode).toBe(200);
    expect(mockGetSummary).toHaveBeenCalled();
  });

  test("debe enrutar GET /gps/registros", async () => {
    const response = await handler({
      httpMethod: "GET",
      resource: "/gps/registros",
      queryStringParameters: {
        proveedor: "GPSCONTROL",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockListRegistros).toHaveBeenCalled();
  });

  test("debe responder 404 si la ruta no existe", async () => {
    const response = await handler({
      httpMethod: "DELETE",
      resource: "/gps/registros",
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.success).toBe(false);
  });

  test("debe responder 500 si controller lanza error", async () => {
    mockGetSummary.mockRejectedValue(new Error("Fallo inesperado"));

    const response = await handler({
      httpMethod: "GET",
      resource: "/gps/resumen",
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Fallo inesperado");
  });
});
