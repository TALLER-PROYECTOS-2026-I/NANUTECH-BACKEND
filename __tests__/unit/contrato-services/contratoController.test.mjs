import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
} from "@jest/globals";

let getAllVigentesController, createContratoController;
let ContratoService,
  successResponse,
  errorResponse,
  SUCCESS_MESSAGES,
  getCurrentSession;

const logSuccess = jest.fn();
const logError = jest.fn();

jest.unstable_mockModule(
  "../../../src/functions/contrato-services/contratoService.mjs",
  () => ({ ContratoService: jest.fn() }),
);

jest.unstable_mockModule(
  "../../../src/shared/utils/response/response.mjs",
  () => ({ successResponse: jest.fn(), errorResponse: jest.fn() }),
);

jest.unstable_mockModule(
  "../../../src/functions/auth-services/authService.mjs",
  () => ({
    getCurrentSession: jest.fn(),
  }),
);

beforeAll(async () => {
  ({ ContratoService } =
    await import("../../../src/functions/contrato-services/contratoService.mjs"));
  ({ successResponse, errorResponse } =
    await import("../../../src/shared/utils/response/response.mjs"));
  ({ SUCCESS_MESSAGES } =
    await import("../../../src/shared/constants/successMessages.mjs"));
  ({ getAllVigentesController, createContratoController } =
    await import("../../../src/functions/contrato-services/contratoController.mjs"));
  ({ getCurrentSession } =
    await import("../../../src/functions/auth-services/authService.mjs"));
});

describe("contratoController", () => {
  let mockService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    getCurrentSession.mockResolvedValue({
      role: "gerente",
      user: {
        email: "gerencia@nanutech.com",
      },
    });
    mockService = {
      getAllVigentes: jest.fn(),
      createContrato: jest.fn(),
    };

    ContratoService.mockImplementation(() => mockService);

    successResponse.mockImplementation((data, message) => {
      logSuccess(data, message);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, data, message }),
      };
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
      expect(logSuccess).toHaveBeenCalledWith(
        mockContratos,
        SUCCESS_MESSAGES.CONTRATOS_RETRIEVED,
      );
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
      expect(logSuccess).toHaveBeenCalledWith(
        [],
        SUCCESS_MESSAGES.CONTRATOS_RETRIEVED,
      );
    });
  });
  describe("createContratoController", () => {
    it("debería registrar contrato exitosamente con status 200", async () => {
      const body = {
        cliente: "Empresa Test SAC",
        ruc: "14575396385",
        descripcion: "Servicio de transporte Lima - Callao",
        tipo_servicio: "POR_KM",
        fecha_inicio: "2026-05-01",
        fecha_fin: "2026-05-02",
        moneda: "PEN",
        origen: "Lima",
        destino: "Callao",
        distancia_estimada_km: 50,
        tarifa_por_km: 10,
        tarifa_por_hora: 10,
        tarifa_espera: 10,
      };

      const contratoCreado = {
        id: "1",
        codigo: "CONT-123",
        ...body,
        tarifa: 500,
      };

      mockService.createContrato.mockResolvedValue(contratoCreado);

      const event = {
        body: JSON.stringify(body),
        headers: {
          Authorization: "Bearer token-test",
        },
      };

      const result = await createContratoController(event);

      expect(result.statusCode).toBe(200);
      expect(getCurrentSession).toHaveBeenCalledWith("Bearer token-test");
      expect(mockService.createContrato).toHaveBeenCalledWith(body);
      expect(logSuccess).toHaveBeenCalledWith(
        contratoCreado,
        "Contrato registrado correctamente",
      );
    });

    it("debería retornar 400 si el body JSON es inválido", async () => {
      const event = {
        body: "{ json inválido",
        headers: {},
      };

      const result = await createContratoController(event);

      expect(result.statusCode).toBe(400);
      expect(logError).toHaveBeenCalledWith(
        "Cuerpo de solicitud inválido",
        400,
      );
    });

    it("debería retornar 400 si el servicio lanza error de validación", async () => {
      const body = {
        cliente: "",
        ruc: "14575396385",
      };

      mockService.createContrato.mockRejectedValue(
        new Error("El nombre del cliente no puede estar vacío"),
      );

      const event = {
        body: JSON.stringify(body),
        headers: {},
      };

      const result = await createContratoController(event);

      expect(result.statusCode).toBe(400);
      expect(logError).toHaveBeenCalledWith(
        "El nombre del cliente no puede estar vacío",
        400,
      );
    });
    it("debería retornar 403 si el usuario no es gerente", async () => {
      getCurrentSession.mockResolvedValue({
        role: "chofer",
      });

      const event = {
        body: JSON.stringify({}),
        headers: {
          Authorization: "Bearer token-chofer",
        },
      };

      const result = await createContratoController(event);

      expect(result.statusCode).toBe(403);
      expect(mockService.createContrato).not.toHaveBeenCalled();
      expect(logError).toHaveBeenCalledWith(
        "Solo el Gerente de Operaciones puede registrar contratos",
        403,
      );
    });
  });
});
