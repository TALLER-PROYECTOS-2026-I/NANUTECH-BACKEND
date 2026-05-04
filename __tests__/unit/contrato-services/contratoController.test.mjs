import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let getAllVigentesController, getIndicadoresController, getAllContratosController, getContratoByIdController;
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
  ({
    getAllVigentesController,
    getIndicadoresController,
    getAllContratosController,
    getContratoByIdController,
  } = await import("../../../src/functions/contrato-services/contratoController.mjs"));
});

describe("contratoController", () => {
  let mockService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    mockService = {
      getAllVigentes: jest.fn(),
      getIndicadores: jest.fn(),
      getAllContratos: jest.fn(),
      getContratoById: jest.fn(),
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

  describe("getIndicadoresController", () => {
    it("debería retornar los indicadores del panel exitosamente", async () => {
      const mockIndicadores = {
        total_contratos: 12,
        contratos_activos: 7,
        contratos_vencidos: 3,
        proximos_a_vencer: 2,
        camiones_asignados: 10,
        distribucion_por_estado: [{ estado: "VIGENTE", cantidad: 7 }],
        distribucion_por_tipo_servicio: [{ tipo_servicio: "POR_VIAJE", cantidad: 5 }],
      };

      mockService.getIndicadores.mockResolvedValue(mockIndicadores);

      const result = await getIndicadoresController({});

      expect(result.statusCode).toBe(200);
      expect(logSuccess).toHaveBeenCalledWith(
        mockIndicadores,
        "Indicadores de contratos obtenidos exitosamente.",
      );
      expect(mockService.getIndicadores).toHaveBeenCalled();
    });

    it("debería manejar error en getIndicadores con status 500", async () => {
      mockService.getIndicadores.mockRejectedValue(new Error("DB error"));

      const result = await getIndicadoresController({});

      expect(result.statusCode).toBe(500);
      expect(logError).toHaveBeenCalledWith("DB error", 500);
    });
  });

  describe("getAllContratosController", () => {
    it("debería retornar contratos paginados con metadata exitosamente", async () => {
      const mockResult = {
        data: [{ id: "con-1", codigo: "CTR-001" }],
        meta: { total: 1, page: 1, limit: 10, total_pages: 1 },
      };

      mockService.getAllContratos.mockResolvedValue(mockResult);

      const result = await getAllContratosController({ queryStringParameters: null });

      expect(result.statusCode).toBe(200);
      expect(logSuccess).toHaveBeenCalledWith(mockResult, SUCCESS_MESSAGES.CONTRATOS_RETRIEVED);
    });

    it("debería pasar los query parameters al servicio", async () => {
      mockService.getAllContratos.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 2, limit: 5, total_pages: 0 },
      });

      await getAllContratosController({
        queryStringParameters: {
          q: "CTR",
          estado: "VIGENTE",
          page: "2",
          limit: "5",
          order_by: "cliente",
        },
      });

      expect(mockService.getAllContratos).toHaveBeenCalledWith(
        { q: "CTR", estado: "VIGENTE" },
        { page: "2", limit: "5", order_by: "cliente" },
      );
    });

    it("debería manejar error en getAllContratos con status 500", async () => {
      mockService.getAllContratos.mockRejectedValue(new Error("DB error"));

      const result = await getAllContratosController({ queryStringParameters: null });

      expect(result.statusCode).toBe(500);
    });
  });

  describe("getContratoByIdController", () => {
    it("debería retornar el contrato por id exitosamente", async () => {
      const mockContrato = {
        id: "con-1",
        codigo: "CTR-001",
        cliente: "Empresa XYZ",
        dias_para_vencer: 45,
        proximo_a_vencer: false,
        unidades: [{ id: "uni-1", placa: "ABC-123" }],
      };

      mockService.getContratoById.mockResolvedValue(mockContrato);

      const result = await getContratoByIdController({
        pathParameters: { id: "con-1" },
      });

      expect(result.statusCode).toBe(200);
      expect(logSuccess).toHaveBeenCalledWith(mockContrato, SUCCESS_MESSAGES.CONTRATO_RETRIEVED);
      expect(mockService.getContratoById).toHaveBeenCalledWith("con-1");
    });

    it("debería retornar 404 cuando el contrato no existe", async () => {
      mockService.getContratoById.mockResolvedValue(null);

      const result = await getContratoByIdController({
        pathParameters: { id: "non-existent" },
      });

      expect(result.statusCode).toBe(404);
      expect(logError).toHaveBeenCalledWith("Contrato no encontrado.", 404);
    });

    it("debería retornar 400 cuando no se proporciona id", async () => {
      const result = await getContratoByIdController({ pathParameters: {} });

      expect(result.statusCode).toBe(400);
      expect(logError).toHaveBeenCalledWith("El id del contrato es requerido.", 400);
      expect(mockService.getContratoById).not.toHaveBeenCalled();
    });

    it("debería manejar error en getContratoById con status 500", async () => {
      mockService.getContratoById.mockRejectedValue(new Error("DB error"));

      const result = await getContratoByIdController({
        pathParameters: { id: "con-1" },
      });

      expect(result.statusCode).toBe(500);
    });
  });
});
