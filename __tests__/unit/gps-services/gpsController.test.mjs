import { jest } from "@jest/globals";

const mockGetProviders = jest.fn();
const mockGetTemplate = jest.fn();
const mockValidateCsv = jest.fn();
const mockImportCsv = jest.fn();
const mockGetSummary = jest.fn();
const mockListRegistros = jest.fn();
const mockGetCurrentSession = jest.fn();

jest.unstable_mockModule(
  "../../../src/functions/gps-services/gpsService.mjs",
  () => ({
    GpsService: jest.fn().mockImplementation(() => ({
      getProviders: mockGetProviders,
      getTemplate: mockGetTemplate,
      validateCsv: mockValidateCsv,
      importCsv: mockImportCsv,
      getSummary: mockGetSummary,
      listRegistros: mockListRegistros,
    })),
  }),
);

jest.unstable_mockModule(
  "../../../src/functions/auth-services/authService.mjs",
  () => ({
    getCurrentSession: mockGetCurrentSession,
  }),
);

const {
  getProvidersController,
  getTemplateController,
  validateCsvController,
  importCsvController,
  getSummaryController,
  listRegistrosController,
} = await import("../../../src/functions/gps-services/gpsController.mjs");

describe("HU08 - GpsController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentSession.mockResolvedValue({ role: "admin" });
  });

  test("getProvidersController debe listar proveedores", async () => {
    mockGetProviders.mockReturnValue(["GPSCONTROL", "GLOBALGPS"]);

    const response = await getProvidersController({ headers: { Authorization: "Bearer token" } });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(JSON.stringify(body)).toContain("GPSCONTROL");
  });

  test("getTemplateController debe devolver plantilla", async () => {
    mockGetTemplate.mockReturnValue({
      proveedor: "GPSCONTROL",
      columnas: ["fecha", "hora", "placa", "latitud", "longitud"],
    });

    const response = await getTemplateController({
      headers: { Authorization: "Bearer token" },
      queryStringParameters: {
        proveedor: "GPSCONTROL",
      },
      pathParameters: null,
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(JSON.stringify(body).toLowerCase()).toContain("placa");
  });

  test("validateCsvController debe validar CSV", async () => {
    mockValidateCsv.mockResolvedValue({
      importacion_habilitada: true,
      filas_validas: 1,
      errores: [],
    });

    const response = await validateCsvController({
      headers: { Authorization: "Bearer token" },
      body: JSON.stringify({
        proveedor: "GPSCONTROL",
        nombre_archivo: "gps.csv",
        nombreArchivo: "gps.csv",
        csv:
          "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
          "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,60,180,1000",
      }),
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  test("importCsvController debe importar CSV y responder 201", async () => {
    mockImportCsv.mockResolvedValue({
      registros_importados: 1,
      duplicados_omitidos: 0,
      estado: "PROCESADA",
    });

    const response = await importCsvController({
      headers: { Authorization: "Bearer token" },
      body: JSON.stringify({
        proveedor: "GPSCONTROL",
        nombre_archivo: "gps.csv",
        nombreArchivo: "gps.csv",
        csv:
          "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
          "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,60,180,1000",
      }),
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  test("getSummaryController debe obtener resumen GPS", async () => {
    mockGetSummary.mockResolvedValue({
      totalRegistrosActivos: 10,
      unidadesEnMovimiento: 4,
      unidadesDetenidas: 6,
      velocidadPromedio: 35,
    });

    const response = await getSummaryController({ headers: { Authorization: "Bearer token" } });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(JSON.stringify(body)).toContain("10");
  });

  test("listRegistrosController debe listar registros GPS", async () => {
    mockListRegistros.mockResolvedValue([
      {
        placa: "ABC-123",
        proveedor: "GPSCONTROL",
      },
    ]);

    const response = await listRegistrosController({
      headers: { Authorization: "Bearer token" },
      queryStringParameters: {
        proveedor: "GPSCONTROL",
      },
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  test("debe responder error si service falla", async () => {
    mockGetSummary.mockRejectedValue(new Error("Error resumen"));

    const response = await getSummaryController({ headers: { Authorization: "Bearer token" } });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(body.success).toBe(false);
  });
});