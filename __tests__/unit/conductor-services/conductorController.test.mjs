import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let getAllConductoresController;
let updateLicenciaController;
let getConductorDetailController;
let ConductorService,
  successResponse,
  errorResponse,
  SUCCESS_MESSAGES,
  getCurrentSession,
  LicenciaValidator;

const logSuccess = jest.fn();
const logError = jest.fn();

jest.unstable_mockModule("../../../src/functions/conductor-services/conductorService.mjs", () => ({
  ConductorService: jest.fn(),
}));

jest.unstable_mockModule("../../../src/shared/utils/response/response.mjs", () => ({
  successResponse: jest.fn(),
  errorResponse: jest.fn(),
}));

jest.unstable_mockModule("../../../src/functions/auth-services/authService.mjs", () => ({
  getCurrentSession: jest.fn(),
}));

jest.unstable_mockModule("../../../src/shared/utils/validators/licenciaValidator.mjs", () => ({
  LicenciaValidator: {
    validateUpdateLicencia: jest.fn(),
    validateConductorId: jest.fn(),
  },
}));

beforeAll(async () => {
  ({ ConductorService } =
    await import("../../../src/functions/conductor-services/conductorService.mjs"));
  ({ successResponse, errorResponse } =
    await import("../../../src/shared/utils/response/response.mjs"));
  ({ getCurrentSession } = await import("../../../src/functions/auth-services/authService.mjs"));

  ({ LicenciaValidator } =
    await import("../../../src/shared/utils/validators/licenciaValidator.mjs"));
  ({ SUCCESS_MESSAGES } = await import("../../../src/shared/constants/successMessages.mjs"));
  ({ getAllConductoresController, updateLicenciaController, getConductorDetailController } =
    await import("../../../src/functions/conductor-services/conductorController.mjs"));
});

describe("conductorController", () => {
  let mockService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    mockService = {
      getAllActiveConductores: jest.fn(),
      updateLicencia: jest.fn(),
      getConductorDetail: jest.fn(),
    };

    ConductorService.mockImplementation(() => mockService);

    getCurrentSession.mockResolvedValue({
      userId: "123",
      role: "CHOFER",
    });

    LicenciaValidator.validateUpdateLicencia.mockImplementation((data) => data);

    LicenciaValidator.validateConductorId.mockImplementation(() => true);

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

      getCurrentSession.mockResolvedValue({
        userId: "123",
        role: "admin",
      });

      mockService.getAllActiveConductores.mockResolvedValue(mockConductores);

      const event = {
        headers: {
          Authorization: "token",
        },
      };

      const result = await getAllConductoresController(event);

      expect(result.statusCode).toBe(200);
      expect(logSuccess).toHaveBeenCalledWith(
        mockConductores,
        SUCCESS_MESSAGES.CONDUCTORES_RETRIEVED
      );
      expect(mockService.getAllActiveConductores).toHaveBeenCalled();
    });

    it("debería manejar error cuando el servicio falla con status 500", async () => {
      getCurrentSession.mockResolvedValue({
        userId: "123",
        role: "admin",
      });

      const errorMessage = "Error en la base de datos";

      mockService.getAllActiveConductores.mockRejectedValue(new Error(errorMessage));

      const event = {
        headers: {
          Authorization: "token",
        },
      };

      const result = await getAllConductoresController(event);

      expect(result.statusCode).toBe(500);
      expect(logError).toHaveBeenCalledWith("Error interno del servidor", 500);
    });

    it("debería retornar array vacío cuando no hay conductores con status 200", async () => {
      getCurrentSession.mockResolvedValue({
        userId: "123",
        role: "admin",
      });

      mockService.getAllActiveConductores.mockResolvedValue([]);

      const event = {
        headers: {
          Authorization: "token",
        },
      };

      const result = await getAllConductoresController(event);

      expect(result.statusCode).toBe(200);
      expect(logSuccess).toHaveBeenCalledWith([], SUCCESS_MESSAGES.CONDUCTORES_RETRIEVED);
    });
  });
  describe("updateLicenciaController", () => {
    it("debería actualizar licencia exitosamente", async () => {
      const licenciaActualizada = {
        id: "1",
        categoria: "A-IIb",
      };

      mockService.updateLicencia.mockResolvedValue(licenciaActualizada);

      const event = {
        headers: {
          Authorization: "token",
        },
        body: JSON.stringify({
          categoria: "A-IIb",
          fechaVencimiento: "2030-01-01",
        }),
      };

      const result = await updateLicenciaController(event);

      expect(result.statusCode).toBe(200);

      expect(mockService.updateLicencia).toHaveBeenCalledWith("123", {
        categoria: "A-IIb",
        fechaVencimiento: "2030-01-01",
      });
    });

    it("debería retornar 403 si no es CHOFER", async () => {
      getCurrentSession.mockResolvedValue({
        userId: "123",
        role: "ADMIN",
      });

      const result = await updateLicenciaController({
        headers: {},
        body: JSON.stringify({}),
      });

      expect(result.statusCode).toBe(403);
    });
  });

  describe("getConductorDetailController", () => {
    beforeEach(() => {
      getCurrentSession.mockResolvedValue({
        userId: "1",
        role: "ADMIN",
      });
    });

    it("debería retornar detalle de conductor", async () => {
      const conductor = {
        id: "123",
        nombres: "Juan",
        apellidos: "Perez",
      };

      mockService.getConductorDetail.mockResolvedValue(conductor);

      const event = {
        headers: {
          Authorization: "token",
        },
        pathParameters: {
          id: "123",
        },
      };

      const result = await getConductorDetailController(event);

      expect(result.statusCode).toBe(200);

      expect(mockService.getConductorDetail).toHaveBeenCalledWith("123");
    });

    it("debería retornar 403 si no es ADMIN", async () => {
      getCurrentSession.mockResolvedValue({
        userId: "1",
        role: "CHOFER",
      });

      const result = await getConductorDetailController({
        headers: {},
        pathParameters: {
          id: "123",
        },
      });

      expect(result.statusCode).toBe(403);
    });
  });
});
