import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let getAllConductoresController;
let ConductorService, successResponse, errorResponse, SUCCESS_MESSAGES;

const logSuccess = jest.fn();
const logError = jest.fn();

jest.unstable_mockModule("../../../src/functions/conductor-services/conductorService.mjs",
  () => ({ ConductorService: jest.fn() }));

jest.unstable_mockModule("../../../src/shared/utils/response/response.mjs",
  () => ({ successResponse: jest.fn(), errorResponse: jest.fn() }));

beforeAll(async () => {
  ({ ConductorService } = await import("../../../src/functions/conductor-services/conductorService.mjs"));
  ({ successResponse, errorResponse } = await import("../../../src/shared/utils/response/response.mjs"));
  ({ SUCCESS_MESSAGES } = await import("../../../src/shared/constants/successMessages.mjs"));
  ({ getAllConductoresController } = await import("../../../src/functions/conductor-services/conductorController.mjs"));
});

describe("conductorController", () => {
  let mockService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    mockService = {
      getAllActiveConductores: jest.fn(),
    };

    ConductorService.mockImplementation(() => mockService);

    successResponse.mockImplementation((data, message) => {
      logSuccess(data, message);
      return { statusCode: 200, body: JSON.stringify({ success: true, data, message }) };
    });

    errorResponse.mockImplementation((message, statusCode) => {
      logError(message, statusCode);
      return { statusCode, body: JSON.stringify({ success: false, message }) };
    });
  });

  describe("getAllConductoresController", () => {
    it("debería retornar conductores exitosamente con status 200", async () => {
      const mockConductores = [
        {
          id: 1,
          nombre: "Carlos Mendoza",
          dni: "12345678",
          licencia: "A-001",
          telefono: "999888777",
          estado: "activo",
        },
        {
          id: 2,
          nombre: "Juan Pérez",
          dni: "87654321",
          licencia: "A-002",
          telefono: "988777666",
          estado: "activo",
        },
      ];

      mockService.getAllActiveConductores.mockResolvedValue(mockConductores);

      const event = {};
      const result = await getAllConductoresController(event);

      expect(result.statusCode).toBe(200);
      expect(logSuccess).toHaveBeenCalledWith(mockConductores, SUCCESS_MESSAGES.CONDUCTORES_RETRIEVED);
      expect(mockService.getAllActiveConductores).toHaveBeenCalled();
    });

    it("debería manejar error cuando el servicio falla con status 500", async () => {
      const errorMessage = "Error en la base de datos";
      mockService.getAllActiveConductores.mockRejectedValue(new Error(errorMessage));

      const event = {};
      const result = await getAllConductoresController(event);

      expect(result.statusCode).toBe(500);
      expect(logError).toHaveBeenCalledWith(errorMessage, 500);
    });

    it("debería retornar array vacío cuando no hay conductores con status 200", async () => {
      mockService.getAllActiveConductores.mockResolvedValue([]);

      const event = {};
      const result = await getAllConductoresController(event);

      expect(result.statusCode).toBe(200);
      expect(logSuccess).toHaveBeenCalledWith([], SUCCESS_MESSAGES.CONDUCTORES_RETRIEVED);
    });
  });
});
