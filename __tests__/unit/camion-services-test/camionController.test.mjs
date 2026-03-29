import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
} from "@jest/globals";

let getAllCamionesController, getCamionByIdController;
let CamionService, successResponse, errorResponse, SUCCESS_MESSAGES;

// ─── Mocks de módulos ────────────────────────────────────────────────────────

jest.unstable_mockModule(
  "../../../src/functions/camion-services/camionService.mjs",
  () => ({ CamionService: jest.fn() }),
);

jest.unstable_mockModule(
  "../../../src/shared/utils/response/response.mjs",
  () => ({
    successResponse: jest.fn(),
    errorResponse: jest.fn(),
  }),
);

// ─── Imports dinámicos ───────────────────────────────────────────────────────

beforeAll(async () => {
  ({ CamionService } =
    await import("../../../src/functions/camion-services/camionService.mjs"));
  ({ successResponse, errorResponse } =
    await import("../../../src/shared/utils/response/response.mjs"));
  ({ SUCCESS_MESSAGES } =
    await import("../../../src/shared/constants/successMessages.mjs"));
  ({ getAllCamionesController, getCamionByIdController } =
    await import("../../../src/functions/camion-services/camionController.mjs"));
  process.stdout.write(`\n${"─".repeat(60)}\n`);
  process.stdout.write(`  🚀 Iniciando tests: camionController.test.mjs\n`);
  process.stdout.write(`${"─".repeat(60)}\n`);
});

// ─── Helpers de logging ──────────────────────────────────────────────────────

const logSuccess = (label, data) => {
  process.stdout.write(`\n  ✅ Respuesta exitosa\n`);
  process.stdout.write(`     test    : ${label}\n`);
  process.stdout.write(`     datos   : ${JSON.stringify(data, null, 0)}\n`);
};

const logError = (label, message) => {
  process.stdout.write(`\n  ⚠️  Error esperado\n`);
  process.stdout.write(`     test    : ${label}\n`);
  process.stdout.write(`     mensaje : ${message}\n`);
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CamionController", () => {
  let mockCamionService;
  let mockCamiones;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(console, "error").mockImplementation(() => {});

    successResponse.mockImplementation((data, message) => {
      logSuccess(message, data);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, data, message }),
      };
    });

    errorResponse.mockImplementation((message, statusCode) => {
      logError(statusCode || 500, message);
      return {
        statusCode: statusCode || 500,
        body: JSON.stringify({ success: false, error: message }),
      };
    });

    mockCamiones = [
      {
        id: "CAM-001",
        placa: "ABC-123",
        modelo: "Volvo FH16",
        capacidad: 20,
        year: 2022,
        estado: "activo",
      },
      {
        id: "CAM-002",
        placa: "XYZ-789",
        modelo: "Scania R450",
        capacidad: 18,
        year: 2023,
        estado: "activo",
      },
    ];

    mockCamionService = {
      getAllCamiones: jest.fn(),
      getCamionById: jest.fn(),
    };

    CamionService.mockImplementation(() => mockCamionService);
  });

  // ─── getAllCamionesController ──────────────────────────────────────────────

  describe("getAllCamionesController", () => {
    it("debería retornar todos los camiones exitosamente", async () => {
      mockCamionService.getAllCamiones.mockResolvedValue(mockCamiones);

      const result = await getAllCamionesController({});

      expect(mockCamionService.getAllCamiones).toHaveBeenCalledTimes(1);
      expect(successResponse).toHaveBeenCalledWith(
        mockCamiones,
        SUCCESS_MESSAGES.CAMIONES_RETRIEVED,
      );
      expect(result.statusCode).toBe(200);
    });

    it("debería manejar error cuando el servicio falla", async () => {
      mockCamionService.getAllCamiones.mockRejectedValue(
        new Error("Error de base de datos"),
      );

      const result = await getAllCamionesController({});

      expect(errorResponse).toHaveBeenCalledWith("Error de base de datos", 500);
      expect(result.statusCode).toBe(500);
    });

    it("debería retornar array vacío cuando no hay camiones", async () => {
      mockCamionService.getAllCamiones.mockResolvedValue([]);

      const result = await getAllCamionesController({});

      expect(successResponse).toHaveBeenCalledWith(
        [],
        SUCCESS_MESSAGES.CAMIONES_RETRIEVED,
      );
      expect(result.statusCode).toBe(200);
    });
  });

  // ─── getCamionByIdController ───────────────────────────────────────────────

  describe("getCamionByIdController", () => {
    const mockCamion = {
      id: "CAM-001",
      placa: "ABC-123",
      modelo: "Volvo FH16",
      capacidad: 20,
      year: 2022,
      estado: "activo",
    };

    it("debería retornar camión por ID exitosamente", async () => {
      mockCamionService.getCamionById.mockResolvedValue(mockCamion);

      const result = await getCamionByIdController({
        pathParameters: { id: "CAM-001" },
      });

      expect(mockCamionService.getCamionById).toHaveBeenCalledWith("CAM-001");
      expect(successResponse).toHaveBeenCalledWith(
        mockCamion,
        SUCCESS_MESSAGES.CAMION_RETRIEVED,
      );
      expect(result.statusCode).toBe(200);
    });

    it("debería retornar error 400 cuando no se proporciona ID", async () => {
      const result = await getCamionByIdController({ pathParameters: {} });

      expect(mockCamionService.getCamionById).not.toHaveBeenCalled();
      expect(errorResponse).toHaveBeenCalledWith("El id es requerido", 400);
      expect(result.statusCode).toBe(400);
    });

    it("debería retornar error 404 cuando el camión no existe", async () => {
      mockCamionService.getCamionById.mockRejectedValue(
        new Error("Camión no encontrado"),
      );

      const result = await getCamionByIdController({
        pathParameters: { id: "CAM-999" },
      });

      expect(errorResponse).toHaveBeenCalledWith("Camión no encontrado", 404);
      expect(result.statusCode).toBe(404);
    });
  });
});
