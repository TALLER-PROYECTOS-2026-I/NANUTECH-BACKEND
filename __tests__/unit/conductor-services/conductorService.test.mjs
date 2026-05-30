import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let ConductorService, ConductorRepository, Conductor;

jest.unstable_mockModule(
  "../../../src/functions/conductor-services/conductorRepository.mjs",
  () => ({ ConductorRepository: jest.fn() })
);

jest.unstable_mockModule("../../../src/functions/conductor-services/conductorModel.mjs", () => ({
  Conductor: { fromDatabaseList: jest.fn() },
}));

beforeAll(async () => {
  ({ ConductorRepository } =
    await import("../../../src/functions/conductor-services/conductorRepository.mjs"));
  ({ Conductor } = await import("../../../src/functions/conductor-services/conductorModel.mjs"));
  ({ ConductorService } =
    await import("../../../src/functions/conductor-services/conductorService.mjs"));
});

describe("ConductorService", () => {
  let mockRepository;
  let service;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      getAllActive: jest.fn(),
      getConductorDetail: jest.fn(),
      getLicenciaActiva: jest.fn(),
      updateLicencia: jest.fn(),
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

  describe("getConductorDetail", () => {
    it("debería retornar detalle del conductor", async () => {
      const mockConductor = {
        id: "123",
        nombres: "Juan",
        apellidos: "Perez",
        numero_licencia: "ABC123",
      };

      mockRepository.getConductorDetail.mockResolvedValue(mockConductor);

      const result = await service.getConductorDetail("123");

      expect(mockRepository.getConductorDetail).toHaveBeenCalledWith("123");

      expect(result).toEqual(mockConductor);
    });

    it("debería lanzar error si conductor no existe", async () => {
      mockRepository.getConductorDetail.mockResolvedValue(null);

      await expect(service.getConductorDetail("123")).rejects.toThrow("Conductor no encontrado");
    });
  });

  describe("updateLicencia", () => {
    it("debería actualizar licencia correctamente", async () => {
      const licenciaActual = {
        categoria: "A-IIa",
      };

      const licenciaNueva = {
        numeroLicencia: "ABC123",
        categoria: "A-IIb",
        fechaEmision: "2025-01-01",
        fechaVencimiento: "2030-01-01",
        autoridadEmisora: "MTC",
      };

      const licenciaActualizada = {
        id: "1",
      };

      mockRepository.getLicenciaActiva.mockResolvedValue(licenciaActual);

      mockRepository.updateLicencia.mockResolvedValue(licenciaActualizada);

      const result = await service.updateLicencia("123", licenciaNueva);

      expect(mockRepository.updateLicencia).toHaveBeenCalled();

      expect(result).toEqual(licenciaActualizada);
    });

    it("debería lanzar error si la licencia no existe", async () => {
      mockRepository.getLicenciaActiva.mockResolvedValue(null);

      await expect(service.updateLicencia("123", {})).rejects.toThrow("Licencia no encontrada");
    });

    it("debería bloquear degradación de categoría", async () => {
      mockRepository.getLicenciaActiva.mockResolvedValue({
        categoria: "A-IIIb",
      });

      await expect(
        service.updateLicencia("123", {
          categoria: "A-IIa",
          fechaVencimiento: "2030-01-01",
        })
      ).rejects.toThrow(
        "Error: No se permite registrar una categoría vehicular inferior a la actual"
      );
    });

    it("debería bloquear licencia vencida", async () => {
      mockRepository.getLicenciaActiva.mockResolvedValue({
        categoria: "A-IIa",
      });

      await expect(
        service.updateLicencia("123", {
          categoria: "A-IIa",
          fechaVencimiento: "2020-01-01",
        })
      ).rejects.toThrow("Error: La fecha de vencimiento ingresada se encuentra expirada");
    });
  });
});
