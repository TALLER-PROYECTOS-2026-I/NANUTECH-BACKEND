import { jest } from "@jest/globals";

const mockQuery = jest.fn();

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  default: { query: mockQuery },
  query: mockQuery,
  getClient: jest.fn(),
}));

const { ContratoRepository } = await import(
  "../../../src/functions/contrato-services/contratoRepository.mjs"
);

describe("ContratoRepository", () => {
  let repository;

  beforeEach(() => {
    repository = new ContratoRepository();
    mockQuery.mockReset();
  });

  test("getAllVigentes retorna contratos vigentes filtrando por estado y fecha", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: "con-1", codigo: "CTR-001", estado: "VIGENTE" }],
    });

    const result = await repository.getAllVigentes();

    const [query] = mockQuery.mock.calls[0];
    expect(query).toContain("estado = 'VIGENTE'");
    expect(query).toContain("activo = TRUE");
    expect(query).toContain("fecha_inicio <= CURRENT_DATE");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("con-1");
  });

  test("getIndicadores retorna los 5 contadores y las 2 distribuciones en una sola query", async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        total_contratos: 10,
        contratos_activos: 5,
        contratos_vencidos: 3,
        proximos_a_vencer: 2,
        camiones_asignados: 8,
        distribucion_por_estado: [{ estado: "VIGENTE", cantidad: 5 }, { estado: "VENCIDO", cantidad: 3 }],
        distribucion_por_tipo_servicio: [{ tipo_servicio: "POR_VIAJE", cantidad: 4 }],
      }],
    });

    const result = await repository.getIndicadores();

    const [query] = mockQuery.mock.calls[0];
    expect(query).toContain("total_contratos");
    expect(query).toContain("contratos_activos");
    expect(query).toContain("contratos_vencidos");
    expect(query).toContain("proximos_a_vencer");
    expect(query).toContain("camiones_asignados");
    expect(query).toContain("distribucion_por_estado");
    expect(query).toContain("distribucion_por_tipo_servicio");
    expect(result.total_contratos).toBe(10);
    expect(result.contratos_activos).toBe(5);
    expect(result.camiones_asignados).toBe(8);
    expect(result.distribucion_por_estado).toHaveLength(2);
    expect(result.distribucion_por_tipo_servicio).toHaveLength(1);
  });

  test("findAll sin filtros retorna todos los contratos con paginación por defecto", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 2 }] });
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: "con-1", codigo: "CTR-001", camiones_asignados: 3, dias_para_vencer: 45, proximo_a_vencer: false },
        { id: "con-2", codigo: "CTR-002", camiones_asignados: 1, dias_para_vencer: 10, proximo_a_vencer: true },
      ],
    });

    const result = await repository.findAll();

    expect(result.rows).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);

    const [countQuery, countParams] = mockQuery.mock.calls[0];
    expect(countQuery).toContain("COUNT(*)");
    expect(countParams).toEqual([]);

    const [dataQuery, dataParams] = mockQuery.mock.calls[1];
    expect(dataQuery).toContain("LIMIT");
    expect(dataQuery).toContain("OFFSET");
    expect(dataQuery).toContain("dias_para_vencer");
    expect(dataQuery).toContain("camiones_asignados");
    expect(dataQuery).toContain("proximo_a_vencer");
    expect(dataParams).toEqual([10, 0]);
  });

  test("findAll con filtro q aplica ILIKE en codigo y cliente", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "con-1" }] });

    await repository.findAll({ q: "ABC" });

    const [countQuery, countParams] = mockQuery.mock.calls[0];
    expect(countQuery).toContain("ILIKE");
    expect(countParams).toEqual(["%ABC%"]);

    const [, dataParams] = mockQuery.mock.calls[1];
    expect(dataParams).toEqual(["%ABC%", 10, 0]);
  });

  test("findAll con filtro estado aplica WHERE c.estado = $N", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 3 }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await repository.findAll({ estado: "VIGENTE" });

    const [countQuery, countParams] = mockQuery.mock.calls[0];
    expect(countQuery).toContain("c.estado = $");
    expect(countParams).toEqual(["VIGENTE"]);
  });

  test("findAll combina filtro q y estado con parámetros correctos", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await repository.findAll({ q: "XYZ", estado: "VENCIDO" });

    const [, countParams] = mockQuery.mock.calls[0];
    expect(countParams).toEqual(["%XYZ%", "VENCIDO"]);

    const [, dataParams] = mockQuery.mock.calls[1];
    expect(dataParams).toEqual(["%XYZ%", "VENCIDO", 10, 0]);
  });

  test("findAll calcula offset correcto para páginas mayores a 1", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 30 }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await repository.findAll({}, { page: 3, limit: 5 });

    const [, dataParams] = mockQuery.mock.calls[1];
    expect(dataParams).toEqual([5, 10]); // LIMIT 5, OFFSET (3-1)*5 = 10
    expect(result.page).toBe(3);
    expect(result.limit).toBe(5);
    expect(result.total).toBe(30);
  });

  test("findById retorna contrato con unidades asignadas", async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        id: "con-1",
        codigo: "CTR-001",
        cliente: "Empresa XYZ",
        unidades: [{ id: "uni-1", placa: "ABC-123", marca: "Volvo", modelo: "FH", estado: "EN_JORNADA" }],
        dias_para_vencer: 45,
        proximo_a_vencer: false,
      }],
    });

    const result = await repository.findById("con-1");

    const [query, values] = mockQuery.mock.calls[0];
    expect(query).toContain("c.id = $1");
    expect(query).toContain("unidades");
    expect(query).toContain("contrato_unidades");
    expect(values).toEqual(["con-1"]);
    expect(result.id).toBe("con-1");
    expect(result.unidades).toHaveLength(1);
  });

  test("findById retorna null cuando el contrato no existe", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await repository.findById("non-existent-id");

    expect(result).toBeNull();
  });
});
