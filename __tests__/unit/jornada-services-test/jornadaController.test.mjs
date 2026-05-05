import { jest } from "@jest/globals";

jest.unstable_mockModule(
  "../../../src/functions/jornada-services/jornadaService.mjs",
  () => ({
    JornadaService: jest.fn().mockImplementation(() => ({
      createJornada: jest.fn(),
      getAllJornadas: jest.fn(),
      getCurrentJornada: jest.fn(),
      startTurn: jest.fn(),
      finishTurn: jest.fn(),
      generateCsv: jest.fn(),
    })),
  }),
);

const {
  createJornadaController,
  getAllJornadasController,
  exportCsvController,
  getCurrentJornadaController,
  startTurnController,
  finishTurnController,
} = await import("../../../src/functions/jornada-services/jornadaController.mjs");
const { JornadaService } = await import(
  "../../../src/functions/jornada-services/jornadaService.mjs"
);

describe("JornadaController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("crea jornada exitosamente", async () => {
    JornadaService.mockImplementation(() => ({
      createJornada: jest.fn().mockResolvedValue({ id: "jor-1" }),
    }));

    const result = await createJornadaController({
      body: JSON.stringify({
        conductor_id: "cond-1",
        unidad_id: "uni-1",
        contrato_id: "con-1",
        creado_por: "admin-1",
      }),
    });

    expect(result.statusCode).toBe(200);
  });

  test("obtiene la jornada actual exitosamente", async () => {
    JornadaService.mockImplementation(() => ({
      getCurrentJornada: jest.fn().mockResolvedValue({ id: "jor-1" }),
    }));

    const result = await getCurrentJornadaController({
      pathParameters: { conductorId: "cond-1" },
    });

    expect(result.statusCode).toBe(200);
  });

  test("inicia turno exitosamente", async () => {
    JornadaService.mockImplementation(() => ({
      startTurn: jest.fn().mockResolvedValue({
        id: "jor-1",
        estado: "EN_PROCESO",
      }),
    }));

    const result = await startTurnController({
      body: JSON.stringify({ jornada_id: "jor-1" }),
    });

    expect(result.statusCode).toBe(200);
  });

  test("finaliza turno exitosamente con duración", async () => {
    JornadaService.mockImplementation(() => ({
      finishTurn: jest.fn().mockResolvedValue({
        id: "jor-1",
        estado: "COMPLETADA",
        duracion_total_segundos: 7200,
      }),
    }));

    const result = await finishTurnController({
      body: JSON.stringify({
        jornada_id: "jor-1",
        observaciones: "Todo correcto",
      }),
    });

    expect(result.statusCode).toBe(200);
  });

  test("devuelve error controlado cuando el service rechaza el inicio", async () => {
    JornadaService.mockImplementation(() => ({
      startTurn: jest.fn().mockRejectedValue({
        message: "La jornada ya fue iniciada.",
        statusCode: 400,
        code: "JORNADA_ALREADY_STARTED",
      }),
    }));

    const result = await startTurnController({
      body: JSON.stringify({ jornada_id: "jor-1" }),
    });

    expect(result.statusCode).toBe(400);
  });

  test("obtiene todas las jornadas sin filtros", async () => {
    JornadaService.mockImplementation(() => ({
      getAllJornadas: jest.fn().mockResolvedValue([
        { id: "jor-1", estado: "COMPLETADA", duracion_total: "08:00", tiene_observaciones: false },
      ]),
    }));

    const result = await getAllJornadasController({ queryStringParameters: null });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  test("obtiene jornadas filtradas por texto de búsqueda", async () => {
    const mockGetAll = jest.fn().mockResolvedValue([]);
    JornadaService.mockImplementation(() => ({ getAllJornadas: mockGetAll }));

    await getAllJornadasController({
      queryStringParameters: { q: "ABC" },
    });

    expect(mockGetAll).toHaveBeenCalledWith(
      expect.objectContaining({ q: "ABC" }),
    );
  });

  test("obtiene jornadas filtradas por conductor y rango de fechas", async () => {
    const mockGetAll = jest.fn().mockResolvedValue([]);
    JornadaService.mockImplementation(() => ({ getAllJornadas: mockGetAll }));

    await getAllJornadasController({
      queryStringParameters: {
        conductor_id: "cond-1",
        fecha_desde: "2026-01-01",
        fecha_hasta: "2026-04-30",
      },
    });

    expect(mockGetAll).toHaveBeenCalledWith(
      expect.objectContaining({
        conductor_id: "cond-1",
        fecha_desde: "2026-01-01",
        fecha_hasta: "2026-04-30",
      }),
    );
  });

  test("exporta jornadas como CSV sin filtros", async () => {
    JornadaService.mockImplementation(() => ({
      generateCsv: jest.fn().mockResolvedValue(
        "ID Jornada,Fecha,Conductor,Placa del Camion,Contrato,Hora Inicio,Hora Fin,Duracion Total,KM Recorridos,Estado,Observaciones\njor-1,2026-04-08,Juan Perez,ABC-123,CON-001,,,,150,COMPLETADA,",
      ),
    }));

    const result = await exportCsvController({ queryStringParameters: null });

    expect(result.statusCode).toBe(200);
    expect(result.headers["Content-Type"]).toBe("text/csv");
    expect(result.headers["Content-Disposition"]).toContain("jornadas.csv");
    expect(result.body).toContain("ID Jornada");
  });

  test("exporta jornadas con filtros aplicados", async () => {
    const mockGenerateCsv = jest.fn().mockResolvedValue("ID Jornada,...\n");
    JornadaService.mockImplementation(() => ({ generateCsv: mockGenerateCsv }));

    await exportCsvController({
      queryStringParameters: { fecha_desde: "2026-04-01", fecha_hasta: "2026-04-30" },
    });

    expect(mockGenerateCsv).toHaveBeenCalledWith(
      expect.objectContaining({
        fecha_desde: "2026-04-01",
        fecha_hasta: "2026-04-30",
      }),
    );
  });

  test("devuelve error controlado cuando falla la exportación CSV", async () => {
    JornadaService.mockImplementation(() => ({
      generateCsv: jest.fn().mockRejectedValue({
        message: "Error de base de datos.",
        statusCode: 500,
        code: "DB_ERROR",
      }),
    }));

    const result = await exportCsvController({ queryStringParameters: null });

    expect(result.statusCode).toBe(500);
  });
});
