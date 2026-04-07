import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let getAllVigentesController;
let ContratoService, successResponse, errorResponse, SUCCESS_MESSAGES;

const logSuccess = jest.fn();
const logError = jest.fn();

jest.unstable_mockModule("../../../src/functions/contrato-services/contratoService.mjs",
  () => ({ ContratoService: jest.fn() }));

jest.unstable_mockModule("../../../src/shared/utils/response/response.mjs",
  () => ({ successResponse: jest.fn(), errorResponse: jest.fn() }));

beforeAll(async () => {
  ({ ContratoService } = await import("../../../src/functions/contrato-services/contratoService.mjs"));
  ({ successResponse, errorResponse } = await import("../../../src/shared/utils/response/response.mjs"));
  ({ SUCCESS_MESSAGES } = await import("../../../src/shared/constants/successMessages.mjs"));
  ({ getAllVigentesController } = await import("../../../src/functions/contrato-services/contratoController.mjs"));
});

describe("contratoController", () => {
  let mockService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    mockService = {
      getAllVigentes: jest.fn(),
    };

    ContratoService.mockImplementation(() => mockService);

    successResponse.mockImplementation((data, message) => {
      logSuccess(data, message);
      return { statusCode: 200, body: JSON.stringify({ success: true, data, message }) };
    });

    errorResponse.mockImplementation((message, statusCode) => {
      logError(message, statusCode);
      return { statusCode, body: JSON.stringify({ success: false, message }) };
    });
  });

  describe("getAllVigentesController", () => {
    it("debería retornar contratos vigentes exitosamente con status 200", async () => {
      const mockContratos = [
        {
          id: 1,
          codigo: "CTR-2026-001",
          empresa: "Transportes XYZ",
          tipo_servicio: "por_viaje",
          tarifa: 500.0,
          moneda: "PEN",
          fecha_inicio: "2026-01-01",
          fecha_fin: "2026-12-31",
          estado: "activo",
          descripcion: "Contrato anual",
        },
        {
          id: 2,
          codigo: "CTR-2026-002",
          empresa: "Logística ABC",
          tipo_servicio: "mensual",
          tarifa: 1500.0,
          moneda: "PEN",
          fecha_inicio: "2026-02-01",
          fecha_fin: "2026-11-30",
          estado: "activo",
          descripcion: "Contrato mensual",
        },
      ];

      mockService.getAllVigentes.mockResolvedValue(mockContratos);

      const event = {};
      const result = await getAllVigentesController(event);

      expect(result.statusCode).toBe(200);
      expect(logSuccess).toHaveBeenCalledWith(mockContratos, SUCCESS_MESSAGES.CONTRATOS_RETRIEVED);
      expect(mockService.getAllVigentes).toHaveBeenCalled();
    });

    it("debería manejar error cuando el servicio falla con status 500", async () => {
      const errorMessage = "Error consultando contratos vigentes";
      mockService.getAllVigentes.mockRejectedValue(new Error(errorMessage));

      const event = {};
      const result = await getAllVigentesController(event);

      expect(result.statusCode).toBe(500);
      expect(logError).toHaveBeenCalledWith(errorMessage, 500);
    });

    it("debería retornar array vacío cuando no hay contratos vigentes con status 200", async () => {
      mockService.getAllVigentes.mockResolvedValue([]);

      const event = {};
      const result = await getAllVigentesController(event);

      expect(result.statusCode).toBe(200);
      expect(logSuccess).toHaveBeenCalledWith([], SUCCESS_MESSAGES.CONTRATOS_RETRIEVED);
    });
  });
});
