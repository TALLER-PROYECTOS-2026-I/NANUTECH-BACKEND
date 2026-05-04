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
  () => ({
    Contrato: { fromDatabaseList: jest.fn(), fromDatabase: jest.fn() },
  }),
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
      createContrato: jest.fn(),
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

    it("debería rechazar RUC con 10 dígitos", async () => {
      await expect(
        service.createContrato({
          cliente: "Empresa Test SAC",
          ruc: "1234567890",
          tipo_servicio: "POR_KM",
          fecha_inicio: "2026-05-01",
          fecha_fin: "2026-05-02",
          origen: "Lima",
          destino: "Callao",
          distancia_estimada_km: 50,
          tarifa_por_km: 10,
          tarifa_por_hora: 10,
          tarifa_espera: 10,
        }),
      ).rejects.toThrow("El RUC debe tener exactamente 11 dígitos");
    });

    it("debería rechazar RUC con letras", async () => {
      await expect(
        service.createContrato({
          cliente: "Empresa Test SAC",
          ruc: "14575ABC385",
          tipo_servicio: "POR_KM",
          fecha_inicio: "2026-05-01",
          fecha_fin: "2026-05-02",
          origen: "Lima",
          destino: "Callao",
          distancia_estimada_km: 50,
          tarifa_por_km: 10,
          tarifa_por_hora: 10,
          tarifa_espera: 10,
        }),
      ).rejects.toThrow("El RUC debe contener solo dígitos numéricos");
    });

    it("debería rechazar cliente vacío", async () => {
      await expect(
        service.createContrato({
          cliente: "   ",
          ruc: "14575396385",
          tipo_servicio: "POR_KM",
          fecha_inicio: "2026-05-01",
          fecha_fin: "2026-05-02",
          origen: "Lima",
          destino: "Callao",
          distancia_estimada_km: 50,
          tarifa_por_km: 10,
          tarifa_por_hora: 10,
          tarifa_espera: 10,
        }),
      ).rejects.toThrow("El nombre del cliente no puede estar vacío");
    });

    it("debería rechazar distancia 0", async () => {
      await expect(
        service.createContrato({
          cliente: "Empresa Test SAC",
          ruc: "14575396385",
          tipo_servicio: "POR_KM",
          fecha_inicio: "2026-05-01",
          fecha_fin: "2026-05-02",
          origen: "Lima",
          destino: "Callao",
          distancia_estimada_km: 0,
          tarifa_por_km: 10,
          tarifa_por_hora: 10,
          tarifa_espera: 10,
        }),
      ).rejects.toThrow("La distancia debe ser mayor a 0");
    });
  });
});
