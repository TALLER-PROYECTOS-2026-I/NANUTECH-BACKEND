import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let ContratoService, ContratoRepository, Contrato;

jest.unstable_mockModule("../../../src/functions/contrato-services/contratoRepository.mjs", () => ({
  ContratoRepository: jest.fn(),
}));

jest.unstable_mockModule("../../../src/functions/contrato-services/contratoModel.mjs", () => ({
  Contrato: { fromDatabaseList: jest.fn() },
}));

beforeAll(async () => {
  ({ ContratoRepository } =
    await import("../../../src/functions/contrato-services/contratoRepository.mjs"));
  ({ Contrato } = await import("../../../src/functions/contrato-services/contratoModel.mjs"));
  ({ ContratoService } =
    await import("../../../src/functions/contrato-services/contratoService.mjs"));
});

describe("ContratoService", () => {
  let mockRepository;
  let service;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      getAllVigentes: jest.fn(),

      // 🔥 HU07
      getById: jest.fn(),
      getTarifasByContrato: jest.fn(),
      updateContrato: jest.fn(),
      updateTarifas: jest.fn(),
      insertHistorial: jest.fn(),
      deleteUnidades: jest.fn(),
      insertUnidad: jest.fn(),

      // 🔥 DEVELOP
      getIndicadores: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    ContratoRepository.mockImplementation(() => mockRepository);
    service = new ContratoService();
  });

  // =========================
  // EXISTENTE
  // =========================
  describe("getAllVigentes", () => {
    it("debería retornar lista de contratos vigentes", async () => {
      const mockRows = [{ id: 1 }];
      const mockContratos = [{ id: 1 }];

      mockRepository.getAllVigentes.mockResolvedValue(mockRows);
      Contrato.fromDatabaseList.mockReturnValue(mockContratos);

      const result = await service.getAllVigentes();

      expect(result).toEqual(mockContratos);
    });
  });

  // =========================
  // 🔥 HU07
  // =========================

  describe("getDetalleContrato", () => {
    it("debería retornar contrato y tarifas", async () => {
      mockRepository.getById.mockResolvedValue({ id: 1 });
      mockRepository.getTarifasByContrato.mockResolvedValue({ tarifa: 100 });

      const result = await service.getDetalleContrato(1);

      expect(result).toEqual({
        contrato: { id: 1 },
        tarifas: { tarifa: 100 },
      });
    });
  });

  describe("updateContrato", () => {
    it("actualiza correctamente", async () => {
      mockRepository.getById.mockResolvedValue({
        fecha_fin: "2025-01-01",
        tarifa: 10,
        descripcion: "old",
      });

      const result = await service.updateContrato(
        1,
        { tarifa: 20, descripcion: "new" },
        "127.0.0.1"
      );

      expect(result).toEqual({ updated: true });
    });

    it("valida fecha", async () => {
      await expect(
        service.updateContrato(
          1,
          {
            fecha_inicio: "2025-05-01",
            fecha_fin: "2025-01-01",
          },
          "ip"
        )
      ).rejects.toThrow();
    });

    it("valida tarifa", async () => {
      await expect(service.updateContrato(1, { tarifa: 0 }, "ip")).rejects.toThrow();
    });

    it("valida descripción", async () => {
      await expect(service.updateContrato(1, { descripcion: "" }, "ip")).rejects.toThrow();
    });

    it("registra historial", async () => {
      mockRepository.getById.mockResolvedValue({
        tarifa: 10,
        descripcion: "old",
      });

      await service.updateContrato(1, { tarifa: 20 }, "ip");

      expect(mockRepository.insertHistorial).toHaveBeenCalled();
    });
  });

  describe("assignUnidades", () => {
    it("asigna unidades", async () => {
      const result = await service.assignUnidades(1, [1, 2]);

      expect(mockRepository.deleteUnidades).toHaveBeenCalledWith(1);
      expect(mockRepository.insertUnidad).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ assigned: true });
    });
  });

  // =========================
  // 🔥 DEVELOP
  // =========================

  describe("getIndicadores", () => {
    it("retorna indicadores", async () => {
      mockRepository.getIndicadores.mockResolvedValue({ total_contratos: 10 });

      const result = await service.getIndicadores();

      expect(result.total_contratos).toBe(10);
    });
  });

  describe("getAllContratos", () => {
    it("retorna paginación", async () => {
      mockRepository.findAll.mockResolvedValue({
        rows: [{ id: 1 }],
        total: 10,
        page: 1,
        limit: 5,
      });

      const result = await service.getAllContratos();

      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(10);
    });
  });

  describe("getContratoById", () => {
    it("retorna contrato", async () => {
      mockRepository.findById.mockResolvedValue({ id: 1 });

      const result = await service.getContratoById(1);

      expect(result.id).toBe(1);
    });

    it("retorna null si no existe", async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getContratoById(999);

      expect(result).toBeNull();
    });
  });
});
