import { jest } from "@jest/globals";

jest.unstable_mockModule("../../../src/functions/auth-services/authService.mjs", () => ({
  getCurrentSession: jest.fn().mockResolvedValue({
    user: { id: "user-1", correo: "admin@nanutech.com" },
    role: "gerente",
    session: { id: "session-1" },
  }),
}));

jest.unstable_mockModule("../../../src/functions/jornada-services/jornadaService.mjs", () => ({
  JornadaService: jest.fn().mockImplementation(() => ({
    createJornada: jest.fn(),
    getAllJornadas: jest.fn(),
    getCurrentJornada: jest.fn(),
    startTurn: jest.fn(),
    finishTurn: jest.fn(),
    generateCsv: jest.fn(),
    getDriverHistory: jest.fn(),
    getDriverMetrics: jest.fn(),
  })),
}));

const {
  createJornadaController,
  getAllJornadasController,
  exportCsvController,
  getCurrentJornadaController,
  startTurnController,
  finishTurnController,
  getDriverHistoryController,
  getDriverMetricsController,
} = await import("../../../src/functions/jornada-services/jornadaController.mjs");
const { JornadaService } =
  await import("../../../src/functions/jornada-services/jornadaService.mjs");
const { getCurrentSession } = await import("../../../src/functions/auth-services/authService.mjs");

const withAuth = (event = {}) => ({
  ...event,
  headers: {
    Authorization: "Bearer fake-token-test",
    ...(event.headers || {}),
  },
});

describe("JornadaController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("crea jornada exitosamente", async () => {
    JornadaService.mockImplementation(() => ({
      createJornada: jest.fn().mockResolvedValue({ id: "jor-1" }),
    }));

    const result = await createJornadaController(
      withAuth({
        body: JSON.stringify({
          conductor_id: "cond-1",
          unidad_id: "uni-1",
          contrato_id: "con-1",
          creado_por: "admin-1",
        }),
      })
    );

    expect(result.statusCode).toBe(200);
    expect(getCurrentSession).toHaveBeenCalledWith("Bearer fake-token-test");
  });

  test("obtiene la jornada actual exitosamente", async () => {
    JornadaService.mockImplementation(() => ({
      getCurrentJornada: jest.fn().mockResolvedValue({ id: "jor-1" }),
    }));

    const result = await getCurrentJornadaController(
      withAuth({
        pathParameters: { conductorId: "cond-1" },
      })
    );

    expect(result.statusCode).toBe(200);
  });

  test("inicia turno exitosamente", async () => {
    JornadaService.mockImplementation(() => ({
      startTurn: jest.fn().mockResolvedValue({
        id: "jor-1",
        estado: "EN_PROCESO",
      }),
    }));

    const result = await startTurnController(
      withAuth({
        body: JSON.stringify({ jornada_id: "jor-1" }),
      })
    );

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

    const result = await finishTurnController(
      withAuth({
        body: JSON.stringify({
          jornada_id: "jor-1",
          observaciones: "Todo correcto",
        }),
      })
    );

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

    const result = await startTurnController(
      withAuth({
        body: JSON.stringify({ jornada_id: "jor-1" }),
      })
    );

    expect(result.statusCode).toBe(400);
  });

  test("obtiene todas las jornadas sin filtros", async () => {
    JornadaService.mockImplementation(() => ({
      getAllJornadas: jest
        .fn()
        .mockResolvedValue([
          {
            id: "jor-1",
            estado: "COMPLETADA",
            duracion_total: "08:00",
            tiene_observaciones: false,
          },
        ]),
    }));

    const result = await getAllJornadasController(withAuth({ queryStringParameters: null }));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  test("obtiene jornadas filtradas por texto de búsqueda", async () => {
    const mockGetAll = jest.fn().mockResolvedValue([]);
    JornadaService.mockImplementation(() => ({ getAllJornadas: mockGetAll }));

    await getAllJornadasController(
      withAuth({
        queryStringParameters: { q: "ABC" },
      })
    );

    expect(mockGetAll).toHaveBeenCalledWith(expect.objectContaining({ q: "ABC" }));
  });

  test("obtiene jornadas filtradas por conductor y rango de fechas", async () => {
    const mockGetAll = jest.fn().mockResolvedValue([]);
    JornadaService.mockImplementation(() => ({ getAllJornadas: mockGetAll }));

    await getAllJornadasController(
      withAuth({
        queryStringParameters: {
          conductor_id: "cond-1",
          fecha_desde: "2026-01-01",
          fecha_hasta: "2026-04-30",
        },
      })
    );

    expect(mockGetAll).toHaveBeenCalledWith(
      expect.objectContaining({
        conductor_id: "cond-1",
        fecha_desde: "2026-01-01",
        fecha_hasta: "2026-04-30",
      })
    );
  });

  test("exporta jornadas como CSV sin filtros", async () => {
    JornadaService.mockImplementation(() => ({
      generateCsv: jest
        .fn()
        .mockResolvedValue(
          "ID Jornada,Fecha,Conductor,Placa del Camion,Contrato,Hora Inicio,Hora Fin,Duracion Total,KM Recorridos,Estado,Observaciones\njor-1,2026-04-08,Juan Perez,ABC-123,CON-001,,,,150,COMPLETADA,"
        ),
    }));

    const result = await exportCsvController(withAuth({ queryStringParameters: null }));

    expect(result.statusCode).toBe(200);
    expect(result.headers["Content-Type"]).toBe("text/csv");
    expect(result.headers["Content-Disposition"]).toContain("jornadas.csv");
    expect(result.body).toContain("ID Jornada");
  });

  test("exporta jornadas con filtros aplicados", async () => {
    const mockGenerateCsv = jest.fn().mockResolvedValue("ID Jornada,...\n");
    JornadaService.mockImplementation(() => ({ generateCsv: mockGenerateCsv }));

    await exportCsvController(
      withAuth({
        queryStringParameters: { fecha_desde: "2026-04-01", fecha_hasta: "2026-04-30" },
      })
    );

    expect(mockGenerateCsv).toHaveBeenCalledWith(
      expect.objectContaining({
        fecha_desde: "2026-04-01",
        fecha_hasta: "2026-04-30",
      })
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

    const result = await exportCsvController(withAuth({ queryStringParameters: null }));

    expect(result.statusCode).toBe(500);
  });

  /**
   * ===============================
   * HU04 - Historial de Journadas (Driver)
   * ===============================
   */

  test("getDriverHistoryController retorna 200 con datos correctos", async () => {
    const mockHistory = [
      {
        id: "jor-uuid-1",
        codigo: "shift_test_progress_maria_002",
        placa: "ABC-123",
        marca: "Volvo",
        modelo: "FH16",
        origen: "Lima",
        destino: "Arequipa",
        fecha: "2026-05-28",
        hora_inicio: "08:00 AM",
        hora_fin: "04:30 PM",
        km_recorridos: 450.5,
        estado: "COMPLETADA",
        duracion_formateada: "8h 30m",
        observaciones: "Todo correcto",
      },
    ];

    JornadaService.mockImplementation(() => ({
      getDriverHistory: jest.fn().mockResolvedValue(mockHistory),
    }));

    getCurrentSession.mockResolvedValueOnce({
      user: { id: "cond-1", correo: "chofer@nanutech.com" },
      role: "chofer",
      session: { id: "session-1" },
    });

    const result = await getDriverHistoryController(
      withAuth({ queryStringParameters: { periodo: "semana", observaciones: "todas" } })
    );

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].placa).toBe("ABC-123");
    expect(body.data[0].codigo).toBe("shift_test_progress_maria_002");
    expect(body.data[0].duracion_formateada).toBe("8h 30m");
  });

  test("getDriverHistoryController retorna 401 sin token", async () => {
    getCurrentSession.mockRejectedValueOnce({
      message: "Token inválido o ausente.",
      statusCode: 401,
      code: "UNAUTHORIZED",
    });

    const result = await getDriverHistoryController({
      headers: {},
      queryStringParameters: {},
    });

    expect(result.statusCode).toBe(401);
  });

  test("getDriverHistoryController retorna 400 con período inválido", async () => {
    JornadaService.mockImplementation(() => ({
      getDriverHistory: jest.fn().mockRejectedValue({
        message: "El período debe ser: semana, mes o todas.",
        statusCode: 400,
        code: "INVALID_PERIOD",
      }),
    }));

    getCurrentSession.mockResolvedValueOnce({
      user: { id: "cond-1", correo: "chofer@nanutech.com" },
      role: "chofer",
      session: { id: "session-1" },
    });

    const result = await getDriverHistoryController(
      withAuth({ queryStringParameters: { periodo: "invalid" } })
    );

    expect(result.statusCode).toBe(400);
  });

  test("getDriverHistoryController extrae conductor_id del token y no del query param", async () => {
    const mockGetDriverHistory = jest.fn().mockResolvedValue([]);
    JornadaService.mockImplementation(() => ({
      getDriverHistory: mockGetDriverHistory,
    }));

    getCurrentSession.mockResolvedValueOnce({
      user: { id: "cond-token-id", correo: "chofer@nanutech.com" },
      role: "chofer",
      session: { id: "session-1" },
    });

    await getDriverHistoryController(
      withAuth({ queryStringParameters: { conductor_id: "otro-conductor" } })
    );

    expect(mockGetDriverHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        conductor_id: "cond-token-id",
      })
    );
    expect(mockGetDriverHistory).not.toHaveBeenCalledWith(
      expect.objectContaining({
        conductor_id: "otro-conductor",
      })
    );
  });

  test("getDriverMetricsController retorna 200 con datos correctos", async () => {
    const mockMetrics = {
      total_jornadas: 12,
      horas_trabajadas: 97.6,
      km_recorridos: 4850.5,
      con_observaciones: 4,
    };

    JornadaService.mockImplementation(() => ({
      getDriverMetrics: jest.fn().mockResolvedValue(mockMetrics),
    }));

    getCurrentSession.mockResolvedValueOnce({
      user: { id: "cond-1", correo: "chofer@nanutech.com" },
      role: "chofer",
      session: { id: "session-1" },
    });

    const result = await getDriverMetricsController(
      withAuth({ queryStringParameters: { periodo: "mes" } })
    );

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.total_jornadas).toBe(12);
    expect(body.data.horas_trabajadas).toBe(97.6);
    expect(body.data.km_recorridos).toBe(4850.5);
    expect(body.data.con_observaciones).toBe(4);
  });

  test("getDriverMetricsController retorna 401 sin token", async () => {
    getCurrentSession.mockRejectedValueOnce({
      message: "Token inválido o ausente.",
      statusCode: 401,
      code: "UNAUTHORIZED",
    });

    const result = await getDriverMetricsController({
      headers: {},
      queryStringParameters: {},
    });

    expect(result.statusCode).toBe(401);
  });

  test("getDriverMetricsController retorna 400 con período inválido", async () => {
    JornadaService.mockImplementation(() => ({
      getDriverMetrics: jest.fn().mockRejectedValue({
        message: "El período debe ser: semana, mes o todas.",
        statusCode: 400,
        code: "INVALID_PERIOD",
      }),
    }));

    getCurrentSession.mockResolvedValueOnce({
      user: { id: "cond-1", correo: "chofer@nanutech.com" },
      role: "chofer",
      session: { id: "session-1" },
    });

    const result = await getDriverMetricsController(
      withAuth({ queryStringParameters: { periodo: "invalid" } })
    );

    expect(result.statusCode).toBe(400);
  });
});
