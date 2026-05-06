import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let ContratoService, ContratoRepository, Contrato;

// =========================
// MOCKS (FUSIONADOS)
// =========================
jest.unstable_mockModule("../../../src/functions/contrato-services/contratoRepository.mjs", () => ({
  ContratoRepository: jest.fn(),
}));

jest.unstable_mockModule("../../../src/functions/contrato-services/contratoModel.mjs", () => ({
  Contrato: {
    fromDatabaseList: jest.fn(),
    fromDatabase: jest.fn(),
  },
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
      createContrato: jest.fn(),
      getIndicadores: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),

      // HU07 adaptado
      updateContrato: jest.fn(),
      updateTarifas: jest.fn(),
      insertHistorial: jest.fn(),
      deleteUnidades: jest.fn(),
      insertUnidad: jest.fn(),
    };

    ContratoRepository.mockImplementation(() => mockRepository);
    service = new ContratoService();
  });

  // =========================
  // GET VIGENTES
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
  // CREATE
  // =========================
  describe("createContrato", () => {
    it("debería crear contrato con datos válidos", async () => {
      const data = {
        cliente: "Empresa Test SAC",
        ruc: "14575396385",
        descripcion: "Contrato test",
        tipo_servicio: "POR_KM",
        fecha_inicio: "2026-05-01",
        fecha_fin: "2026-05-02",
        origen: "Lima",
        destino: "Callao",
        distancia_estimada_km: 50,
        tarifa_por_km: 10,
        tarifa_por_hora: 10,
        tarifa_espera: 10,
      };

      const row = { id: "1", ...data };
      const contrato = { id: "1", ...data };

      mockRepository.createContrato.mockResolvedValue(row);
      Contrato.fromDatabase.mockReturnValue(contrato);

      const result = await service.createContrato(data);

      expect(mockRepository.createContrato).toHaveBeenCalledWith(data);
      expect(Contrato.fromDatabase).toHaveBeenCalledWith(row);
      expect(result).toEqual(contrato);
    });

    it("rechaza RUC inválido", async () => {
      await expect(
        service.createContrato({
          cliente: "Empresa",
          ruc: "123",
          tipo_servicio: "POR_KM",
          fecha_inicio: "2026-05-01",
          origen: "Lima",
          destino: "Callao",
          distancia_estimada_km: 50,
          tarifa_por_km: 10,
          tarifa_por_hora: 10,
          tarifa_espera: 10,
        })
      ).rejects.toThrow();
    });
  });

  // =========================
  // UPDATE
  // =========================
  describe("updateContrato", () => {
    it("actualiza correctamente", async () => {
      mockRepository.findById.mockResolvedValue({
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

    it("registra historial", async () => {
      mockRepository.findById.mockResolvedValue({
        tarifa: 10,
        descripcion: "old",
      });

      await service.updateContrato(1, { tarifa: 20 }, "ip");

      expect(mockRepository.insertHistorial).toHaveBeenCalled();
    });
  });

  // =========================
  // UNIDADES
  // =========================
  describe("assignUnidades", () => {
    it("asigna unidades", async () => {
      const result = await service.assignUnidades(1, [1, 2]);

      expect(mockRepository.deleteUnidades).toHaveBeenCalledWith(1);
      expect(mockRepository.insertUnidad).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ assigned: true });
    });
  });

  // =========================
  // INDICADORES
  // =========================
  describe("getIndicadores", () => {
    it("retorna indicadores", async () => {
      mockRepository.getIndicadores.mockResolvedValue({ total_contratos: 10 });

      const result = await service.getIndicadores();

      expect(result.total_contratos).toBe(10);
    });
  });

  // =========================
  // LISTADO
  // =========================
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

  // =========================
  // DETALLE
  // =========================
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
