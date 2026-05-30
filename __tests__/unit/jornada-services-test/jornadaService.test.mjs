import { jest } from "@jest/globals";

jest.unstable_mockModule("../../../src/functions/jornada-services/jornadaRepository.mjs", () => ({
  JornadaRepository: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    findById: jest.fn(),
    findCurrentByConductorId: jest.fn(),
    checkUnidadActiva: jest.fn(),
    checkConductorActivo: jest.fn(),
    startTurn: jest.fn(),
    finishTurn: jest.fn(),
    findAll: jest.fn(),
    exportAll: jest.fn(),
    getHistorialMetrics: jest.fn(),
    getAlertDetail: jest.fn(),
    findDriverHistory: jest.fn(),
    getDriverMetrics: jest.fn(),
  })),
}));

const { JornadaService } =
  await import("../../../src/functions/jornada-services/jornadaService.mjs");

const buildJornadaRow = (overrides = {}) => ({
  id: "jor-1",
  conductor_id: "cond-1",
  unidad_id: "uni-1",
  contrato_id: "con-1",
  creado_por: "admin-1",
  fecha_jornada: "2026-04-08",
  hora_inicio: null,
  hora_fin: null,
  origen: null,
  destino: null,
  km_recorridos: null,
  observaciones: null,
  estado: "REGISTRADA",
  created_at: "2026-04-08T10:00:00.000Z",
  updated_at: "2026-04-08T10:00:00.000Z",
  ...overrides,
});

describe("JornadaService", () => {
  let jornadaService;

  beforeEach(() => {
    jest.clearAllMocks();
    jornadaService = new JornadaService();
  });

  test("crea una jornada alineada al schema real", async () => {
    jornadaService.repository.checkUnidadActiva.mockResolvedValue(false);
    jornadaService.repository.checkConductorActivo.mockResolvedValue(false);
    jornadaService.repository.create.mockResolvedValue(buildJornadaRow({ estado: "REGISTRADA" }));

    const result = await jornadaService.createJornada({
      conductor_id: "cond-1",
      unidad_id: "uni-1",
      contrato_id: "con-1",
      creado_por: "admin-1",
      observaciones: "Salida inicial",
    });

    expect(jornadaService.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conductor_id: "cond-1",
        unidad_id: "uni-1",
        contrato_id: "con-1",
        creado_por: "admin-1",
        estado: "REGISTRADA",
      })
    );
    expect(result.estado).toBe("REGISTRADA");
  });

  test("rechaza crear una jornada si la unidad ya está activa o pendiente", async () => {
    jornadaService.repository.checkUnidadActiva.mockResolvedValue(true);

    await expect(
      jornadaService.createJornada({
        conductor_id: "cond-1",
        unidad_id: "uni-1",
        contrato_id: "con-1",
        creado_por: "admin-1",
      })
    ).rejects.toMatchObject({
      message: "La unidad ya tiene una jornada activa o pendiente.",
      code: "UNIDAD_CON_JORNADA_ACTIVA",
    });
  });

  test("obtiene la jornada actual del conductor", async () => {
    jornadaService.repository.findCurrentByConductorId.mockResolvedValue(
      buildJornadaRow({ estado: "EN_PROCESO" })
    );

    const result = await jornadaService.getCurrentJornada("cond-1");

    expect(jornadaService.repository.findCurrentByConductorId).toHaveBeenCalledWith("cond-1");
    expect(result.estado).toBe("EN_PROCESO");
  });

  test("inicia turno solo cuando la jornada está registrada", async () => {
    jornadaService.repository.findById.mockResolvedValue(buildJornadaRow({ estado: "REGISTRADA" }));
    jornadaService.repository.startTurn.mockResolvedValue(
      buildJornadaRow({
        estado: "EN_PROCESO",
        hora_inicio: "2026-04-08T12:00:00.000Z",
      })
    );

    const result = await jornadaService.startTurn({ jornada_id: "jor-1" });

    expect(jornadaService.repository.startTurn).toHaveBeenCalledWith("jor-1");
    expect(result.estado).toBe("EN_PROCESO");
  });

  test("rechaza iniciar un turno ya iniciado", async () => {
    jornadaService.repository.findById.mockResolvedValue(buildJornadaRow({ estado: "EN_PROCESO" }));

    await expect(jornadaService.startTurn({ jornada_id: "jor-1" })).rejects.toMatchObject({
      message: "La jornada ya fue iniciada.",
      code: "JORNADA_ALREADY_STARTED",
    });
  });

  test("finaliza un turno en proceso y devuelve la duración total", async () => {
    jornadaService.repository.findById.mockResolvedValue(
      buildJornadaRow({
        estado: "EN_PROCESO",
        hora_inicio: "2026-04-08T12:00:00.000Z",
      })
    );
    jornadaService.repository.finishTurn.mockResolvedValue(
      buildJornadaRow({
        estado: "COMPLETADA",
        hora_inicio: "2026-04-08T12:00:00.000Z",
        hora_fin: "2026-04-08T18:00:00.000Z",
        duracion_total_segundos: 21600,
        observaciones: "Turno cerrado",
      })
    );

    const result = await jornadaService.finishTurn({
      jornada_id: "jor-1",
      observaciones: "Turno cerrado",
    });

    expect(jornadaService.repository.finishTurn).toHaveBeenCalledWith("jor-1", "Turno cerrado");
    expect(result.estado).toBe("COMPLETADA");
    expect(result.duracion_total_segundos).toBe(21600);
  });

  test("rechaza finalizar una jornada fuera de EN_PROCESO", async () => {
    jornadaService.repository.findById.mockResolvedValue(buildJornadaRow({ estado: "REGISTRADA" }));

    await expect(jornadaService.finishTurn({ jornada_id: "jor-1" })).rejects.toMatchObject({
      message: "La jornada solo puede finalizarse cuando está EN_PROCESO.",
      code: "JORNADA_NOT_IN_PROGRESS",
    });
  });

  test("obtiene todas las jornadas sin filtros y delega al repository", async () => {
    jornadaService.repository.findAll.mockResolvedValue([
      { id: "jor-1", duracion_total: "08:00", tiene_observaciones: false },
    ]);

    const result = await jornadaService.getAllJornadas();

    expect(jornadaService.repository.findAll).toHaveBeenCalledWith({});
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("jor-1");
  });

  test("pasa los filtros al repository en getAllJornadas", async () => {
    jornadaService.repository.findAll.mockResolvedValue([]);

    const filtros = {
      q: "ABC-123",
      conductor_id: "cond-1",
      fecha_desde: "2026-01-01",
      fecha_hasta: "2026-04-30",
    };
    await jornadaService.getAllJornadas(filtros);

    expect(jornadaService.repository.findAll).toHaveBeenCalledWith(filtros);
  });

  test("genera CSV con los datos de exportación", async () => {
    jornadaService.repository.exportAll.mockResolvedValue([
      {
        id: "jor-1",
        fecha: "2026-04-08",
        conductor: "Juan Perez",
        placa: "ABC-123",
        contrato: "CON-001",
        hora_inicio: "2026-04-08 08:00:00",
        hora_fin: "2026-04-08 16:00:00",
        duracion_total: "08:00",
        km_recorridos: 150,
        estado: "COMPLETADA",
        observaciones: null,
      },
    ]);

    const csv = await jornadaService.generateCsv({});

    expect(typeof csv).toBe("string");
    expect(csv).toContain("ID Jornada,Fecha,Conductor,Placa del Camion");
    expect(csv).toContain("jor-1");
    expect(csv).toContain("ABC-123");
    expect(csv).toContain("08:00");
    expect(jornadaService.repository.exportAll).toHaveBeenCalledWith({});
  });

  test("genera CSV vacío cuando no hay jornadas", async () => {
    jornadaService.repository.exportAll.mockResolvedValue([]);

    const csv = await jornadaService.generateCsv({});

    expect(csv).toBe(
      "ID Jornada,Fecha,Conductor,Placa del Camion,Contrato,Hora Inicio,Hora Fin,Duracion Total,KM Recorridos,Estado,Observaciones"
    );
  });

  test("escapa correctamente valores con comas en el CSV", async () => {
    jornadaService.repository.exportAll.mockResolvedValue([
      {
        id: "jor-1",
        fecha: "2026-04-08",
        conductor: "Perez, Juan",
        placa: "ABC-123",
        contrato: "CON-001",
        hora_inicio: null,
        hora_fin: null,
        duracion_total: "Sin iniciar",
        km_recorridos: 0,
        estado: "REGISTRADA",
        observaciones: 'Nota con "comillas"',
      },
    ]);

    const csv = await jornadaService.generateCsv({});
    const lines = csv.split("\n");

    expect(lines[1]).toContain('"Perez, Juan"');
    expect(lines[1]).toContain('"Nota con ""comillas"""');
  });

  test("pasa los filtros al repository en generateCsv", async () => {
    jornadaService.repository.exportAll.mockResolvedValue([]);

    const filtros = { conductor_id: "cond-1", fecha_desde: "2026-04-01" };
    await jornadaService.generateCsv(filtros);

    expect(jornadaService.repository.exportAll).toHaveBeenCalledWith(filtros);
  });
  /**
   * ===============================
   * HU 17 - Métricas y alertas
   * ===============================
   */

  test("obtiene métricas del historial de jornadas", async () => {
    jornadaService.repository.getHistorialMetrics.mockResolvedValue({
      total_jornadas: "15",
      alertas_panico: "2",
      auxilio_mecanico: "1",
      jornadas_observaciones: "5",
      km_promedio: "120.50",
    });

    const filtros = {
      fecha_desde: "2026-01-01",
      fecha_hasta: "2026-12-31",
    };

    const result = await jornadaService.getHistorialMetrics(filtros);

    expect(jornadaService.repository.getHistorialMetrics).toHaveBeenCalledWith(filtros);

    expect(result.total_jornadas).toBe("15");
    expect(result.alertas_panico).toBe("2");
    expect(result.auxilio_mecanico).toBe("1");
    expect(result.km_promedio).toBe("120.50");
  });

  test("obtiene el detalle de una alerta", async () => {
    jornadaService.repository.getAlertDetail.mockResolvedValue({
      jornada_id: "jor-1",
      conductor: "Juan Perez",
      placa: "ABC-123",
      tipo_alerta: "PANICO",
      detalle: "Botón de pánico activado",
      estado: "ATENDIDA",
    });

    const result = await jornadaService.getAlertDetail("jor-1");

    expect(jornadaService.repository.getAlertDetail).toHaveBeenCalledWith("jor-1");

    expect(result.jornada_id).toBe("jor-1");
    expect(result.tipo_alerta).toBe("PANICO");
    expect(result.estado).toBe("ATENDIDA");
  });

  test("pasa filtros de alerta y observaciones al repository", async () => {
    jornadaService.repository.findAll.mockResolvedValue([]);

    const filtros = {
      estado_alerta: "PANICO",
      observaciones: "true",
    };

    await jornadaService.getAllJornadas(filtros);

    expect(jornadaService.repository.findAll).toHaveBeenCalledWith(filtros);
  });

  test("incluye km_estimados y km_recorridos en exportación", async () => {
    jornadaService.repository.exportAll.mockResolvedValue([
      {
        id: "jor-1",
        fecha: "2026-04-08",
        conductor: "Juan Perez",
        placa: "ABC-123",
        contrato: "CON-001",
        hora_inicio: "2026-04-08 08:00:00",
        hora_fin: "2026-04-08 16:00:00",
        duracion_total: "08:00",
        km_estimados: 140,
        km_recorridos: 150,
        estado: "COMPLETADA",
        observaciones: null,
      },
    ]);

    const csv = await jornadaService.generateCsv({});

    expect(csv).toContain("150");
    expect(jornadaService.repository.exportAll).toHaveBeenCalled();
  });

  /**
   * ===============================
   * HU04 - Historial de Journadas (Driver)
   * ===============================
   */

  test("getDriverHistory delega correctamente al repository con filtros", async () => {
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

    jornadaService.repository.findDriverHistory.mockResolvedValue(mockHistory);

    const result = await jornadaService.getDriverHistory({
      conductor_id: "cond-1",
      periodo: "semana",
      observaciones: "con",
    });

    expect(jornadaService.repository.findDriverHistory).toHaveBeenCalledWith({
      conductor_id: "cond-1",
      periodo: "semana",
      observaciones: "con",
    });
    expect(result).toHaveLength(1);
    expect(result[0].duracion_formateada).toBe("8h 30m");
    expect(result[0].codigo).toBe("shift_test_progress_maria_002");
  });

  test("getDriverHistory usa 'todas' como período default", async () => {
    jornadaService.repository.findDriverHistory.mockResolvedValue([]);

    await jornadaService.getDriverHistory({ conductor_id: "cond-1" });

    expect(jornadaService.repository.findDriverHistory).toHaveBeenCalledWith({
      conductor_id: "cond-1",
      periodo: "todas",
      observaciones: "todas",
    });
  });

  test("getDriverHistory lanza error 400 con período inválido", async () => {
    await expect(
      jornadaService.getDriverHistory({
        conductor_id: "cond-1",
        periodo: "invalid",
      })
    ).rejects.toMatchObject({
      message: "El período debe ser: semana, mes o todas.",
      code: "INVALID_PERIOD",
      statusCode: 400,
    });
  });

  test("getDriverHistory lanza error 400 con filtro de observaciones inválido", async () => {
    await expect(
      jornadaService.getDriverHistory({
        conductor_id: "cond-1",
        observaciones: "invalid",
      })
    ).rejects.toMatchObject({
      message: "El filtro de observaciones debe ser: todas, con o sin.",
      code: "INVALID_OBSERVACIONES_FILTER",
      statusCode: 400,
    });
  });

  test("getDriverMetrics delega correctamente al repository", async () => {
    jornadaService.repository.getDriverMetrics.mockResolvedValue({
      total_jornadas: "12",
      horas_trabajadas: "97.6",
      km_recorridos: "4850.5",
      con_observaciones: "4",
    });

    const result = await jornadaService.getDriverMetrics({
      conductor_id: "cond-1",
      periodo: "mes",
    });

    expect(jornadaService.repository.getDriverMetrics).toHaveBeenCalledWith({
      conductor_id: "cond-1",
      periodo: "mes",
    });
    expect(result.total_jornadas).toBe(12);
    expect(result.horas_trabajadas).toBe(97.6);
    expect(result.km_recorridos).toBe(4850.5);
    expect(result.con_observaciones).toBe(4);
  });

  test("getDriverMetrics usa 'todas' como período default", async () => {
    jornadaService.repository.getDriverMetrics.mockResolvedValue({
      total_jornadas: "5",
      horas_trabajadas: "40.0",
      km_recorridos: "1000.0",
      con_observaciones: "2",
    });

    await jornadaService.getDriverMetrics({ conductor_id: "cond-1" });

    expect(jornadaService.repository.getDriverMetrics).toHaveBeenCalledWith({
      conductor_id: "cond-1",
      periodo: "todas",
    });
  });

  test("getDriverMetrics lanza error 400 con período inválido", async () => {
    await expect(
      jornadaService.getDriverMetrics({
        conductor_id: "cond-1",
        periodo: "invalid",
      })
    ).rejects.toMatchObject({
      message: "El período debe ser: semana, mes o todas.",
      code: "INVALID_PERIOD",
      statusCode: 400,
    });
  });
});
