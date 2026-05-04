import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let getAllDisponiblesController;
let UnidadService, successResponse, errorResponse, SUCCESS_MESSAGES;

const logSuccess = jest.fn();
const logError = jest.fn();

jest.unstable_mockModule("../../../src/functions/unidad-services/unidadService.mjs",
  () => ({ UnidadService: jest.fn() }));

jest.unstable_mockModule("../../../src/shared/utils/response/response.mjs",
  () => ({ successResponse: jest.fn(), errorResponse: jest.fn() }));

beforeAll(async () => {
  ({ UnidadService } = await import("../../../src/functions/unidad-services/unidadService.mjs"));
  ({ successResponse, errorResponse } = await import("../../../src/shared/utils/response/response.mjs"));
  ({ SUCCESS_MESSAGES } = await import("../../../src/shared/constants/successMessages.mjs"));
  ({ getAllDisponiblesController } = await import("../../../src/functions/unidad-services/unidadController.mjs"));
});

describe("unidadController", () => {
  let mockService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    mockService = {
      getAllDisponibles: jest.fn(),
    };

    UnidadService.mockImplementation(() => mockService);

    successResponse.mockImplementation((data, message) => {
      logSuccess(data, message);
      return { statusCode: 200, body: JSON.stringify({ success: true, data, message }) };
    });

    errorResponse.mockImplementation((message, statusCode) => {
      logError(message, statusCode);
      return { statusCode, body: JSON.stringify({ success: false, message }) };
    });
  });

  describe("getAllDisponiblesController", () => {
    it("debería retornar unidades disponibles exitosamente con status 200", async () => {
      const mockUnidades = [
        {
          id: 1,
          placa: "ABC-123",
          marca: "Mercedes",
          modelo: "Actros 2021",
          estado: "activo",
        },
        {
          id: 2,
          placa: "XYZ-456",
          marca: "Volvo",
          modelo: "FH16 2020",
          estado: "activo",
        },
      ];

      mockService.getAllDisponibles.mockResolvedValue(mockUnidades);

      const event = {};
      const result = await getAllDisponiblesController(event);

      expect(result.statusCode).toBe(200);
      expect(logSuccess).toHaveBeenCalledWith(mockUnidades, SUCCESS_MESSAGES.UNIDADES_RETRIEVED);
      expect(mockService.getAllDisponibles).toHaveBeenCalled();
    });

    it("debería manejar error cuando el servicio falla con status 500", async () => {
      const errorMessage = "Error consultando unidades disponibles";
      mockService.getAllDisponibles.mockRejectedValue(new Error(errorMessage));

      const event = {};
      const result = await getAllDisponiblesController(event);

      expect(result.statusCode).toBe(500);
      expect(logError).toHaveBeenCalledWith(errorMessage, 500);
    });

    it("debería retornar array vacío cuando no hay unidades disponibles con status 200", async () => {
      mockService.getAllDisponibles.mockResolvedValue([]);

      const event = {};
      const result = await getAllDisponiblesController(event);

      expect(result.statusCode).toBe(200);
      expect(logSuccess).toHaveBeenCalledWith([], SUCCESS_MESSAGES.UNIDADES_RETRIEVED);
    });
  });
});
