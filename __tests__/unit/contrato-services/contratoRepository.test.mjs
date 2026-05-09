import { jest } from "@jest/globals";

const mockQuery = jest.fn();
const mockGetClient = jest.fn();

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  default: { query: mockQuery, getClient: mockGetClient },
  query: mockQuery,
  getClient: mockGetClient,
}));

const { ContratoRepository } = await import(
  "../../../src/functions/contrato-services/contratoRepository.mjs"
);

describe("ContratoRepository", () => {
  let repository;

  beforeEach(() => {
    repository = new ContratoRepository();
    mockQuery.mockReset();
    mockGetClient.mockReset();
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

  test("calculateTotalReferencial multiplica distancia por tarifa por km", () => {
    const result = repository.calculateTotalReferencial({
      distancia_estimada_km: 180,
      tarifa_por_km: 5.5,
    });

    expect(result).toBe(990);
  });

  test("generateCodigoContrato genera codigo con prefijo CONT", () => {
    const result = repository.generateCodigoContrato();

    expect(result).toMatch(/^CONT-\d+-\d+$/);
  });

  test("createContrato registra contrato completo dentro de una transaccion", async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValue(client);
    jest.spyOn(repository, "generateCodigoContrato").mockReturnValue("CONT-TEST");

    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: "con-1", codigo: "CONT-TEST" }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: "con-1", cliente: "Empresa ABC" }] })
      .mockResolvedValueOnce({}); // COMMIT

    const result = await repository.createContrato({
      cliente: " Empresa ABC ",
      ruc: "12345678901",
      descripcion: "Contrato mensual",
      tipo_servicio: "POR_KM",
      fecha_inicio: "2026-05-01",
      fecha_fin: "2026-08-01",
      moneda: "PEN",
      origen: "Arequipa",
      destino: "Matarani",
      distancia_estimada_km: 180,
      tarifa_por_km: 5,
      tarifa_por_hora: 0,
      tarifa_espera: 20,
    });

    expect(result).toEqual({ id: "con-1", cliente: "Empresa ABC" });
    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query.mock.calls[1][1]).toContain("CONT-TEST");
    expect(client.query.mock.calls[1][1]).toContain("Empresa ABC");
    expect(client.query.mock.calls[2][1]).toEqual(["con-1", "Arequipa", "Matarani", "180.00"]);
    expect(client.query.mock.calls[3][1]).toEqual(["con-1", "5.00", "0.00", "20.00", 900]);
    expect(client.query).toHaveBeenNthCalledWith(6, "COMMIT");
    expect(client.release).toHaveBeenCalled();
  });

  test("createContrato ejecuta rollback y libera cliente si falla", async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValue(client);

    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error("insert failed"))
      .mockResolvedValueOnce({}); // ROLLBACK

    await expect(
      repository.createContrato({
        cliente: "Empresa ABC",
        ruc: "12345678901",
        tipo_servicio: "POR_KM",
        fecha_inicio: "2026-05-01",
        origen: "Arequipa",
        destino: "Matarani",
        distancia_estimada_km: 180,
        tarifa_por_km: 5,
      })
    ).rejects.toThrow("insert failed");

    expect(client.query).toHaveBeenLastCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalled();
  });

  test("getFullContratoByIdWithClient retorna el primer contrato encontrado", async () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: "con-1" }] }),
    };

    const result = await repository.getFullContratoByIdWithClient(client, "con-1");

    expect(result).toEqual({ id: "con-1" });
    expect(client.query.mock.calls[0][1]).toEqual(["con-1"]);
  });

  test("getById consulta contrato por id", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "con-1" }] });

    const result = await repository.getById("con-1");

    expect(result).toEqual({ id: "con-1" });
    expect(mockQuery.mock.calls[0][1]).toEqual(["con-1"]);
  });

  test("getTarifasByContrato retorna tarifa o null si falla", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ contrato_id: "con-1", tarifa_base: "100" }] });

    await expect(repository.getTarifasByContrato("con-1")).resolves.toEqual({
      contrato_id: "con-1",
      tarifa_base: "100",
    });

    mockQuery.mockRejectedValueOnce(new Error("tabla no existe"));

    await expect(repository.getTarifasByContrato("con-1")).resolves.toBeNull();
  });

  test("updateContrato, updateTarifas e historial ejecutan queries con parametros esperados", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await repository.updateContrato("con-1", {
      fecha_inicio: "2026-05-01",
      fecha_fin: "2026-08-01",
      tipo_servicio: "POR_TONELADA",
      descripcion: "Actualizado",
      tarifa: 3000,
    });

    expect(mockQuery.mock.calls[0][1]).toEqual([
      "2026-05-01",
      "2026-08-01",
      "POR_TONELADA",
      "Actualizado",
      3000,
      "con-1",
    ]);

    await repository.updateTarifas("con-1", { base: 100, hora: 50, tonelada: 80 });
    expect(mockQuery.mock.calls[1][1]).toEqual([100, 50, 80, "con-1"]);

    await repository.insertHistorial({
      contrato_id: "con-1",
      campo: "estado",
      valor_anterior: "VIGENTE",
      valor_nuevo: "INACTIVO",
      ip_address: "127.0.0.1",
    });
    expect(mockQuery.mock.calls[2][1]).toEqual([
      "con-1",
      "UPDATE",
      "estado",
      "VIGENTE",
      "INACTIVO",
      "127.0.0.1",
    ]);
  });

  test("insertUnidad y deleteUnidades modifican la relacion contrato-unidades", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await repository.insertUnidad("con-1", "uni-1");
    await repository.deleteUnidades("con-1");

    expect(mockQuery.mock.calls[0][1]).toEqual(["con-1", "uni-1"]);
    expect(mockQuery.mock.calls[1][1]).toEqual(["con-1"]);
  });
});
