import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let UnidadService, UnidadRepository, Unidad;

jest.unstable_mockModule("../../../src/functions/unidad-services/unidadRepository.mjs",
  () => ({ UnidadRepository: jest.fn() }));

jest.unstable_mockModule("../../../src/functions/unidad-services/unidadModel.mjs",
  () => ({ Unidad: { fromDatabaseList: jest.fn() } }));

beforeAll(async () => {
  ({ UnidadRepository } = await import("../../../src/functions/unidad-services/unidadRepository.mjs"));
  ({ Unidad } = await import("../../../src/functions/unidad-services/unidadModel.mjs"));
  ({ UnidadService } = await import("../../../src/functions/unidad-services/unidadService.mjs"));
});

describe("UnidadService", () => {
  let mockRepository;
  let service;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      getAllDisponibles: jest.fn(),
    };

    UnidadRepository.mockImplementation(() => mockRepository);
    service = new UnidadService();
  });

  describe("getAllDisponibles", () => {
    it("debería retornar lista de unidades disponibles", async () => {
      const mockRows = [
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

      mockRepository.getAllDisponibles.mockResolvedValue(mockRows);
      Unidad.fromDatabaseList.mockReturnValue(mockUnidades);

      const result = await service.getAllDisponibles();

      expect(mockRepository.getAllDisponibles).toHaveBeenCalled();
      expect(Unidad.fromDatabaseList).toHaveBeenCalledWith(mockRows);
      expect(result).toEqual(mockUnidades);
    });

    it("debería retornar array vacío cuando no hay unidades disponibles", async () => {
      mockRepository.getAllDisponibles.mockResolvedValue([]);
      Unidad.fromDatabaseList.mockReturnValue([]);

      const result = await service.getAllDisponibles();

      expect(mockRepository.getAllDisponibles).toHaveBeenCalled();
      expect(Unidad.fromDatabaseList).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });
});
