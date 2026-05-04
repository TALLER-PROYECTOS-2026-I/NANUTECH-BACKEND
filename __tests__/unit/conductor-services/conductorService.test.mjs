import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let ConductorService, ConductorRepository, Conductor;

jest.unstable_mockModule("../../../src/functions/conductor-services/conductorRepository.mjs",
  () => ({ ConductorRepository: jest.fn() }));

jest.unstable_mockModule("../../../src/functions/conductor-services/conductorModel.mjs",
  () => ({ Conductor: { fromDatabaseList: jest.fn() } }));

beforeAll(async () => {
  ({ ConductorRepository } = await import("../../../src/functions/conductor-services/conductorRepository.mjs"));
  ({ Conductor } = await import("../../../src/functions/conductor-services/conductorModel.mjs"));
  ({ ConductorService } = await import("../../../src/functions/conductor-services/conductorService.mjs"));
});

describe("ConductorService", () => {
  let mockRepository;
  let service;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      getAllActive: jest.fn(),
    };

    ConductorRepository.mockImplementation(() => mockRepository);
    service = new ConductorService();
  });

  describe("getAllActiveConductores", () => {
    it("debería retornar lista de conductores activos", async () => {
      const mockRows = [
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

      mockRepository.getAllActive.mockResolvedValue(mockRows);
      Conductor.fromDatabaseList.mockReturnValue(mockConductores);

      const result = await service.getAllActiveConductores();

      expect(mockRepository.getAllActive).toHaveBeenCalled();
      expect(Conductor.fromDatabaseList).toHaveBeenCalledWith(mockRows);
      expect(result).toEqual(mockConductores);
    });

    it("debería retornar array vacío cuando no hay conductores", async () => {
      mockRepository.getAllActive.mockResolvedValue([]);
      Conductor.fromDatabaseList.mockReturnValue([]);

      const result = await service.getAllActiveConductores();

      expect(mockRepository.getAllActive).toHaveBeenCalled();
      expect(Conductor.fromDatabaseList).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });
});
