import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
} from "@jest/globals";

let CamionService, CamionRepository, CamionValidator, Camion, ERROR_MESSAGES;

// ─── Mocks de módulos ────────────────────────────────────────────────────────

jest.unstable_mockModule(
  "../../../src/functions/camion-services/camionRepository.mjs",
  () => ({ CamionRepository: jest.fn() }),
);

jest.unstable_mockModule(
  "../../../src/shared/utils/validators/camionValidator.mjs",
  () => ({
    CamionValidator: {
      validateId: jest.fn(),
      validateCreateCamion: jest.fn(),
      validateUpdateCamion: jest.fn(),
    },
  }),
);

jest.unstable_mockModule(
  "../../../src/functions/camion-services/camionModel.mjs",
  () => {
    const MockCamion = jest
      .fn()
      .mockImplementation((id, placa, modelo, capacidad, year, estado) => ({
        id,
        placa,
        modelo,
        capacidad,
        year,
        estado,
        toJSON: jest
          .fn()
          .mockReturnValue({ id, placa, modelo, capacidad, year, estado }),
      }));
    MockCamion.fromDatabase = jest.fn();
    MockCamion.fromDatabaseList = jest.fn();
    return { Camion: MockCamion };
  },
);

// ─── Imports dinámicos ───────────────────────────────────────────────────────

beforeAll(async () => {
  ({ CamionRepository } =
    await import("../../../src/functions/camion-services/camionRepository.mjs"));
  ({ CamionValidator } =
    await import("../../../src/shared/utils/validators/camionValidator.mjs"));
  ({ Camion } =
    await import("../../../src/functions/camion-services/camionModel.mjs"));
  ({ ERROR_MESSAGES } =
    await import("../../../src/shared/constants/errorMessages.mjs"));
  ({ CamionService } =
    await import("../../../src/functions/camion-services/camionService.mjs"));
  process.stdout.write(`\n${"─".repeat(60)}\n`);
  process.stdout.write(`  🚀 Iniciando tests: camionService.test.mjs\n`);
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

describe("CamionService", () => {
  let camionService;
  let mockRepository;
  let mockCamionData;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(console, "error").mockImplementation(() => {});

    mockCamionData = {
      id: "CAM-001",
      placa: "ABC-123",
      modelo: "Volvo FH16",
      capacidad: 20,
      year: 2022,
      estado: "activo",
    };

    mockRepository = {
      getAll: jest.fn(),
      getById: jest.fn(),
      getByPlaca: jest.fn(),
      exists: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    CamionRepository.mockImplementation(() => mockRepository);

    CamionValidator.validateId.mockImplementation((id) => {
      if (!id || id === "") throw new Error("ID inválido");
      return id;
    });
    CamionValidator.validateCreateCamion.mockImplementation((data) => data);
    CamionValidator.validateUpdateCamion.mockImplementation((data) => data);

    Camion.fromDatabase.mockImplementation((data) => data);
    Camion.fromDatabaseList.mockImplementation((list) => list);

    camionService = new CamionService();
  });

  // ─── getAllCamiones ────────────────────────────────────────────────────────

  describe("getAllCamiones", () => {
    it("debería retornar todos los camiones", async () => {
      mockRepository.getAll.mockResolvedValue([mockCamionData]);

      const result = await camionService.getAllCamiones();

      expect(mockRepository.getAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockCamionData]);
      logSuccess("getAllCamiones", result);
    });

    it("debería retornar array vacío cuando no hay camiones", async () => {
      mockRepository.getAll.mockResolvedValue([]);

      const result = await camionService.getAllCamiones();

      expect(result).toEqual([]);
      logSuccess("getAllCamiones - vacío", result);
    });
  });

  // ─── getCamionById ────────────────────────────────────────────────────────

  describe("getCamionById", () => {
    it("debería retornar camión por ID exitosamente", async () => {
      mockRepository.getById.mockResolvedValue(mockCamionData);
      Camion.fromDatabase.mockReturnValue(mockCamionData);

      const result = await camionService.getCamionById("CAM-001");

      expect(CamionValidator.validateId).toHaveBeenCalledWith("CAM-001");
      expect(mockRepository.getById).toHaveBeenCalledWith("CAM-001");
      expect(result).toEqual(mockCamionData);
      logSuccess("getCamionById - CAM-001", result);
    });

    it("debería lanzar error cuando el camión no existe", async () => {
      mockRepository.getById.mockResolvedValue(null);

      await expect(camionService.getCamionById("CAM-999")).rejects.toThrow(
        ERROR_MESSAGES.CAMION_NOT_FOUND,
      );
      logError("getCamionById - no existe", ERROR_MESSAGES.CAMION_NOT_FOUND);
    });
  });

  // ─── createCamion ─────────────────────────────────────────────────────────

  describe("createCamion", () => {
    const newCamionData = {
      id: "CAM-003",
      placa: "NEW-456",
      modelo: "Mercedes Actros",
      capacidad: 22,
      year: 2023,
      estado: "activo",
    };

    it("debería crear camión exitosamente", async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.getByPlaca.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(newCamionData);
      Camion.fromDatabase.mockReturnValue(newCamionData);

      const result = await camionService.createCamion(newCamionData);

      expect(mockRepository.create).toHaveBeenCalled();
      expect(result).toEqual(newCamionData);
      logSuccess("createCamion - CAM-003", result);
    });

    it("debería lanzar error cuando el ID ya existe", async () => {
      mockRepository.exists.mockResolvedValue(true);

      await expect(camionService.createCamion(newCamionData)).rejects.toThrow(
        ERROR_MESSAGES.CAMION_ALREADY_EXISTS,
      );
      logError(
        "createCamion - ID duplicado",
        ERROR_MESSAGES.CAMION_ALREADY_EXISTS,
      );
    });

    it("debería lanzar error cuando la placa ya existe", async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.getByPlaca.mockResolvedValue({ id: "OTHER-ID" });

      await expect(camionService.createCamion(newCamionData)).rejects.toThrow(
        ERROR_MESSAGES.CAMION_PLACA_EXISTS,
      );
      logError(
        "createCamion - placa duplicada",
        ERROR_MESSAGES.CAMION_PLACA_EXISTS,
      );
    });
  });
});
