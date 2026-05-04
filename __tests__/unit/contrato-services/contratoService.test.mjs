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
      getIndicadores: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
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

  describe("getIndicadores", () => {
    it("debería retornar los indicadores del panel de contratos", async () => {
      const mockIndicadores = {
        total_contratos: 12,
        contratos_activos: 7,
        contratos_vencidos: 3,
        proximos_a_vencer: 2,
        camiones_asignados: 10,
        distribucion_por_estado: [
          { estado: "VIGENTE", cantidad: 7 },
          { estado: "VENCIDO", cantidad: 3 },
        ],
        distribucion_por_tipo_servicio: [
          { tipo_servicio: "POR_VIAJE", cantidad: 5 },
          { tipo_servicio: "MENSUAL", cantidad: 4 },
        ],
      };

      mockRepository.getIndicadores.mockResolvedValue(mockIndicadores);

      const result = await service.getIndicadores();

      expect(mockRepository.getIndicadores).toHaveBeenCalled();
      expect(result.total_contratos).toBe(12);
      expect(result.contratos_activos).toBe(7);
      expect(result.camiones_asignados).toBe(10);
      expect(result.distribucion_por_estado).toHaveLength(2);
      expect(result.distribucion_por_tipo_servicio).toHaveLength(2);
    });

    it("debería retornar distribuciones vacías cuando no hay contratos", async () => {
      mockRepository.getIndicadores.mockResolvedValue({
        total_contratos: 0,
        contratos_activos: 0,
        contratos_vencidos: 0,
        proximos_a_vencer: 0,
        camiones_asignados: 0,
        distribucion_por_estado: [],
        distribucion_por_tipo_servicio: [],
      });

      const result = await service.getIndicadores();

      expect(result.total_contratos).toBe(0);
      expect(result.distribucion_por_estado).toHaveLength(0);
    });
  });

  describe("getAllContratos", () => {
    it("debería retornar contratos paginados con metadata", async () => {
      const mockRows = [
        { id: "con-1", codigo: "CTR-001", camiones_asignados: 3, dias_para_vencer: 45, proximo_a_vencer: false },
        { id: "con-2", codigo: "CTR-002", camiones_asignados: 1, dias_para_vencer: 10, proximo_a_vencer: true },
      ];

      mockRepository.findAll.mockResolvedValue({
        rows: mockRows,
        total: 25,
        page: 1,
        limit: 10,
      });

      const result = await service.getAllContratos({}, { page: 1, limit: 10 });

      expect(mockRepository.findAll).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(25);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total_pages).toBe(3); // ceil(25/10)
    });

    it("debería pasar filtros al repository", async () => {
      mockRepository.findAll.mockResolvedValue({
        rows: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const filtros = { q: "ABC", estado: "VIGENTE" };
      const pagination = { page: 2, limit: 5, order_by: "cliente" };
      await service.getAllContratos(filtros, pagination);

      expect(mockRepository.findAll).toHaveBeenCalledWith(filtros, pagination);
    });

    it("debería calcular total_pages = 1 cuando hay menos resultados que el límite", async () => {
      mockRepository.findAll.mockResolvedValue({
        rows: [{ id: "con-1" }],
        total: 3,
        page: 1,
        limit: 10,
      });

      const result = await service.getAllContratos();

      expect(result.meta.total_pages).toBe(1); // ceil(3/10) = 1
    });

    it("debería retornar data vacía y meta correcta cuando no hay contratos", async () => {
      mockRepository.findAll.mockResolvedValue({
        rows: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const result = await service.getAllContratos();

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.total_pages).toBe(0); // ceil(0/10) = 0
    });
  });

  describe("getContratoById", () => {
    it("debería retornar el contrato con sus unidades asignadas", async () => {
      const mockContrato = {
        id: "con-1",
        codigo: "CTR-001",
        cliente: "Empresa XYZ",
        dias_para_vencer: 45,
        proximo_a_vencer: false,
        unidades: [{ id: "uni-1", placa: "ABC-123" }],
      };

      mockRepository.findById.mockResolvedValue(mockContrato);

      const result = await service.getContratoById("con-1");

      expect(mockRepository.findById).toHaveBeenCalledWith("con-1");
      expect(result.id).toBe("con-1");
      expect(result.unidades).toHaveLength(1);
    });

    it("debería retornar null cuando el contrato no existe", async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getContratoById("non-existent");

      expect(mockRepository.findById).toHaveBeenCalledWith("non-existent");
      expect(result).toBeNull();
    });
  });
});
