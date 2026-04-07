import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let ContratoService, ContratoRepository, Contrato;

jest.unstable_mockModule("../../../src/functions/contrato-services/contratoRepository.mjs",
  () => ({ ContratoRepository: jest.fn() }));

jest.unstable_mockModule("../../../src/functions/contrato-services/contratoModel.mjs",
  () => ({ Contrato: { fromDatabaseList: jest.fn() } }));

beforeAll(async () => {
  ({ ContratoRepository } = await import("../../../src/functions/contrato-services/contratoRepository.mjs"));
  ({ Contrato } = await import("../../../src/functions/contrato-services/contratoModel.mjs"));
  ({ ContratoService } = await import("../../../src/functions/contrato-services/contratoService.mjs"));
});

describe("ContratoService", () => {
  let mockRepository;
  let service;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      getAllVigentes: jest.fn(),
    };

    ContratoRepository.mockImplementation(() => mockRepository);
    service = new ContratoService();
  });

  describe("getAllVigentes", () => {
    it("debería retornar lista de contratos vigentes", async () => {
      const mockRows = [
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

      mockRepository.getAllVigentes.mockResolvedValue(mockRows);
      Contrato.fromDatabaseList.mockReturnValue(mockContratos);

      const result = await service.getAllVigentes();

      expect(mockRepository.getAllVigentes).toHaveBeenCalled();
      expect(Contrato.fromDatabaseList).toHaveBeenCalledWith(mockRows);
      expect(result).toEqual(mockContratos);
    });

    it("debería retornar array vacío cuando no hay contratos vigentes", async () => {
      mockRepository.getAllVigentes.mockResolvedValue([]);
      Contrato.fromDatabaseList.mockReturnValue([]);

      const result = await service.getAllVigentes();

      expect(mockRepository.getAllVigentes).toHaveBeenCalled();
      expect(Contrato.fromDatabaseList).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });
});
