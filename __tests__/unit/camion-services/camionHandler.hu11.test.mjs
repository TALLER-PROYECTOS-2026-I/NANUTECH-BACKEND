import { jest } from "@jest/globals";

const mockGetAll = jest.fn();
const mockGetById = jest.fn();
const mockCreate = jest.fn();
const mockPanel = jest.fn();
const mockExport = jest.fn();

jest.unstable_mockModule(
  "../../../src/functions/camion-services/camionController.mjs",
  () => ({
    getAllCamionesController: mockGetAll,
    getCamionByIdController: mockGetById,
    createCamionController: mockCreate,
    getPanelCamionesController: mockPanel,
    exportCamionesCsvController: mockExport,
  }),
);

const { handler } = await import(
  "../../../src/functions/camion-services/camionHandler.mjs"
);

describe("HU11 - CamionHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetAll.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    mockGetById.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    mockCreate.mockResolvedValue({
      statusCode: 201,
      body: JSON.stringify({ success: true }),
    });

    mockPanel.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    mockExport.mockResolvedValue({
      statusCode: 200,
      body: "csv",
    });
  });

  test("debe enrutar GET /camiones", async () => {
    const response = await handler({
      httpMethod: "GET",
      resource: "/camiones",
    });

    expect(response.statusCode).toBe(200);
    expect(mockGetAll).toHaveBeenCalled();
  });

  test("debe enrutar GET /camiones/{id}", async () => {
    const response = await handler({
      httpMethod: "GET",
      resource: "/camiones/{id}",
      pathParameters: {
        id: "unidad-001",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockGetById).toHaveBeenCalled();
  });

  test("debe enrutar POST /camiones", async () => {
    const response = await handler({
      httpMethod: "POST",
      resource: "/camiones",
      body: "{}",
    });

    expect(response.statusCode).toBe(201);
    expect(mockCreate).toHaveBeenCalled();
  });

  test("debe enrutar GET /camiones/panel", async () => {
    const response = await handler({
      httpMethod: "GET",
      resource: "/camiones/panel",
    });

    expect(response.statusCode).toBe(200);
    expect(mockPanel).toHaveBeenCalled();
  });

  test("debe enrutar GET /camiones/exportar/csv", async () => {
    const response = await handler({
      httpMethod: "GET",
      resource: "/camiones/exportar/csv",
    });

    expect(response.statusCode).toBe(200);
    expect(mockExport).toHaveBeenCalled();
  });

  test("debe responder 404 si la ruta no existe", async () => {
    const response = await handler({
      httpMethod: "DELETE",
      resource: "/camiones",
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toContain("no encontrada");
  });

  test("debe responder 500 si controller lanza error", async () => {
    mockGetAll.mockRejectedValue(new Error("Fallo inesperado"));

    const response = await handler({
      httpMethod: "GET",
      resource: "/camiones",
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Fallo inesperado");
  });
});