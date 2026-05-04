import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
} from "@jest/globals";

let ContratoService, ContratoRepository, Contrato;

jest.unstable_mockModule(
  "../../../src/functions/contrato-services/contratoRepository.mjs",
  () => ({ ContratoRepository: jest.fn() }),
);

jest.unstable_mockModule(
  "../../../src/functions/contrato-services/contratoModel.mjs",
  () => ({ Contrato: { fromDatabaseList: jest.fn() } }),
);

beforeAll(async () => {
  ({ ContratoRepository } =
    await import("../../../src/functions/contrato-services/contratoRepository.mjs"));
  ({ Contrato } =
    await import("../../../src/functions/contrato-services/contratoModel.mjs"));
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

      // 🔥 NUEVOS mocks
      getById: jest.fn(),
      getTarifasByContrato: jest.fn(),
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
  // TEST EXISTENTE
  // =========================
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
      ];

      const mockContratos = [...mockRows];

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

      expect(result).toEqual([]);
    });
  });

  // =========================
  // 🔥 HU07 - NUEVOS TESTS
  // =========================

  describe("getDetalleContrato", () => {
    it("debería retornar contrato y tarifas", async () => {
      const contratoMock = { id: 1 };
      const tarifasMock = { tarifa: 100 };

      mockRepository.getById.mockResolvedValue(contratoMock);
      mockRepository.getTarifasByContrato.mockResolvedValue(tarifasMock);

      const result = await service.getDetalleContrato(1);

      expect(mockRepository.getById).toHaveBeenCalledWith(1);
      expect(mockRepository.getTarifasByContrato).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        contrato: contratoMock,
        tarifas: tarifasMock,
      });
    });
  });

  describe("updateContrato", () => {
    it("debería actualizar contrato correctamente", async () => {
      mockRepository.getById.mockResolvedValue({
        fecha_fin: "2025-01-01",
        tarifa: 10,
        descripcion: "old",
      });

      const data = {
        fecha_fin: "2025-02-01",
        tarifa: 20,
        descripcion: "new",
      };

      const result = await service.updateContrato(1, data, "127.0.0.1");

      expect(mockRepository.updateContrato).toHaveBeenCalled();
      expect(result).toEqual({ updated: true });
    });

    it("debería fallar si fecha_fin < fecha_inicio", async () => {
      await expect(
        service.updateContrato(
          1,
          {
            fecha_inicio: "2025-05-01",
            fecha_fin: "2025-01-01",
          },
          "127.0.0.1",
        ),
      ).rejects.toThrow("Fecha fin no puede ser menor a inicio");
    });

    it("debería fallar si tarifa es 0", async () => {
      await expect(
        service.updateContrato(1, { tarifa: 0 }, "127.0.0.1"),
      ).rejects.toThrow("La tarifa no puede ser 0");
    });

    it("debería fallar si descripción está vacía", async () => {
      await expect(
        service.updateContrato(1, { descripcion: "" }, "127.0.0.1"),
      ).rejects.toThrow("La descripción no puede estar vacía");
    });

    it("debería registrar historial cuando cambia tarifa", async () => {
      mockRepository.getById.mockResolvedValue({
        tarifa: 10,
        descripcion: "old",
      });

      await service.updateContrato(1, { tarifa: 20 }, "127.0.0.1");

      expect(mockRepository.insertHistorial).toHaveBeenCalled();
    });
  });

  describe("assignUnidades", () => {
    it("debería asignar unidades correctamente", async () => {
      const unidades = [1, 2, 3];

      const result = await service.assignUnidades(1, unidades);

      expect(mockRepository.deleteUnidades).toHaveBeenCalledWith(1);
      expect(mockRepository.insertUnidad).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ assigned: true });
    });
  });
});
