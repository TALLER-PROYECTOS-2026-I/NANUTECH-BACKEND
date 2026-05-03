import { jest } from "@jest/globals";

const mockGetAllCamiones = jest.fn();
const mockGetCamionById = jest.fn();
const mockCreateCamion = jest.fn();
const mockGetPanel = jest.fn();
const mockExportCsv = jest.fn();

jest.unstable_mockModule(
  "../../../src/functions/camion-services/camionService.mjs",
  () => ({
    CamionService: jest.fn().mockImplementation(() => ({
      getAllCamiones: mockGetAllCamiones,
      getCamionById: mockGetCamionById,
      createCamion: mockCreateCamion,
      getPanel: mockGetPanel,
      exportCsv: mockExportCsv,
    })),
  }),
);

const {
  getAllCamionesController,
  getCamionByIdController,
  createCamionController,
  getPanelCamionesController,
  exportCamionesCsvController,
} = await import("../../../src/functions/camion-services/camionController.mjs");

describe("HU11 - CamionController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getAllCamionesController debe listar camiones", async () => {
    mockGetAllCamiones.mockResolvedValue([
      {
        id: "unidad-001",
        placa: "ABC-123",
      },
    ]);

    const response = await getAllCamionesController({
      queryStringParameters: {
        estado: "DISPONIBLE",
      },
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(mockGetAllCamiones).toHaveBeenCalledWith({
      estado: "DISPONIBLE",
    });
  });

  test("getCamionByIdController debe retornar camión", async () => {
    mockGetCamionById.mockResolvedValue({
      id: "unidad-001",
      placa: "ABC-123",
    });

    const response = await getCamionByIdController({
      pathParameters: {
        id: "unidad-001",
      },
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.placa).toBe("ABC-123");
  });

  test("getCamionByIdController debe responder 404 si no existe", async () => {
    mockGetCamionById.mockRejectedValue(new Error("Camión no encontrado"));

    const response = await getCamionByIdController({
      pathParameters: {
        id: "unidad-x",
      },
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.success).toBe(false);
  });

  test("createCamionController debe registrar camión y responder 201", async () => {
    mockCreateCamion.mockResolvedValue({
      id: "unidad-001",
      placa: "XYZ-999",
      modelo: "FH16",
      estado: "DISPONIBLE",
      confirmacion: {
        message: "¡Camión registrado con éxito!",
        placa: "XYZ-999",
        modelo: "FH16",
      },
    });

    const event = {
      body: JSON.stringify({
        placa: "XYZ-999",
        marca: "Volvo",
        modelo: "FH16",
        anio: 2024,
        capacidad_ton: 20,
        vin: "VINXYZ999",
        color: "Blanco",
        combustible: "DIESEL",
        gps: true,
      }),
    };

    const response = await createCamionController(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.estado).toBe("DISPONIBLE");
    expect(body.data.confirmacion.message).toBe("¡Camión registrado con éxito!");
  });

  test("createCamionController debe responder 400 si hay error de validación", async () => {
    mockCreateCamion.mockRejectedValue(
      new Error("El campo placa es obligatorio"),
    );

    const response = await createCamionController({
      body: JSON.stringify({}),
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toContain("placa");
  });

  test("createCamionController debe responder 400 si el body no es JSON válido", async () => {
    const response = await createCamionController({
      body: "{json-malo",
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(400);
    expect(body.success).toBe(false);
  });

  test("getPanelCamionesController debe devolver panel", async () => {
    mockGetPanel.mockResolvedValue({
      resumen: {
        total_camiones: 4,
        en_uso: 1,
        disponibles: 2,
        mantenimiento: 1,
      },
      grafica_movimiento: {
        horas_movimiento: 6,
        horas_detenido: 3,
        porcentaje_movimiento: 66.67,
        porcentaje_detenido: 33.33,
      },
      camiones: [],
    });

    const response = await getPanelCamionesController({
      queryStringParameters: {
        estado: "DISPONIBLE",
      },
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.resumen.total_camiones).toBe(4);
    expect(mockGetPanel).toHaveBeenCalledWith({
      estado: "DISPONIBLE",
    });
  });

  test("exportCamionesCsvController debe devolver text/csv", async () => {
    mockExportCsv.mockResolvedValue(
      '"ID","Placa","Marca","Modelo","Año","Capacidad (ton)","Estado","VIN","Color","GPS","Kilometraje","Fecha de Registro","Último Mantenimiento","Próximo Mantenimiento"',
    );

    const response = await exportCamionesCsvController({
      queryStringParameters: {
        estado: "DISPONIBLE",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["Content-Type"]).toContain("text/csv");
    expect(response.body).toContain("Placa");
    expect(response.body).toContain("Capacidad (ton)");
  });

  test("exportCamionesCsvController debe manejar error", async () => {
    mockExportCsv.mockRejectedValue(new Error("Error exportando CSV"));

    const response = await exportCamionesCsvController({
      queryStringParameters: {},
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(500);
    expect(body.success).toBe(false);
  });
});