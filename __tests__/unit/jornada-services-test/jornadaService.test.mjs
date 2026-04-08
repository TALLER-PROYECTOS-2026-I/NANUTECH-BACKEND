import { jest } from "@jest/globals";

jest.unstable_mockModule(
  "../../../src/functions/jornada-services/jornadaRepository.mjs",
  () => ({
    JornadaRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn(),
      findById: jest.fn(),
      findCurrentByConductorId: jest.fn(),
      checkUnidadActiva: jest.fn(),
      checkConductorActivo: jest.fn(),
      startTurn: jest.fn(),
      finishTurn: jest.fn(),
    })),
  }),
);

const { JornadaService } =
  await import("../../../src/functions/jornada-services/jornadaService.mjs");

const buildJornadaRow = (overrides = {}) => ({
  id: "jornada-1",
  conductor_id: "chofer-1",
  unidad_id: "unidad-1",
  contrato_id: "contrato-1",
  creado_por: "admin-1",
  fecha_jornada: "2026-04-08",
  hora_inicio: null,
  hora_fin: null,
  origen: null,
  destino: null,
  km_recorridos: 0,
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

  test("crea jornada alineada al schema real", async () => {
    jornadaService.repository.checkUnidadActiva.mockResolvedValue(false);
    jornadaService.repository.checkConductorActivo.mockResolvedValue(false);
    jornadaService.repository.create.mockResolvedValue(buildJornadaRow());

    const result = await jornadaService.createJornada({
      conductor_id: "chofer-1",
      unidad_id: "unidad-1",
      contrato_id: "contrato-1",
      creado_por: "admin-1",
      observaciones: "Pendiente de salida",
    });

    expect(jornadaService.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conductor_id: "chofer-1",
        unidad_id: "unidad-1",
        contrato_id: "contrato-1",
        creado_por: "admin-1",
        estado: "REGISTRADA",
      }),
    );
    expect(result.estado).toBe("REGISTRADA");
  });

  test("rechaza crear jornada si la unidad ya tiene una jornada activa o pendiente", async () => {
    jornadaService.repository.checkUnidadActiva.mockResolvedValue(true);

    await expect(
      jornadaService.createJornada({
        conductor_id: "chofer-1",
        unidad_id: "unidad-1",
        contrato_id: "contrato-1",
        creado_por: "admin-1",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "UNIDAD_CON_JORNADA_ACTIVA",
    });
  });

  test("obtiene la jornada actual del conductor", async () => {
    jornadaService.repository.findCurrentByConductorId.mockResolvedValue(
      buildJornadaRow({ estado: "EN_PROCESO", hora_inicio: "2026-04-08T08:00:00.000Z" }),
    );

    const result = await jornadaService.getCurrentJornada("chofer-1");

    expect(jornadaService.repository.findCurrentByConductorId).toHaveBeenCalledWith(
      "chofer-1",
    );
    expect(result.estado).toBe("EN_PROCESO");
  });

  test("inicia turno solo si la jornada esta registrada", async () => {
    jornadaService.repository.findById.mockResolvedValue(buildJornadaRow());
    jornadaService.repository.startTurn.mockResolvedValue(
      buildJornadaRow({
        estado: "EN_PROCESO",
        hora_inicio: "2026-04-08T08:00:00.000Z",
      }),
    );

    const result = await jornadaService.startTurn({ jornada_id: "jornada-1" });

    expect(jornadaService.repository.startTurn).toHaveBeenCalledWith("jornada-1");
    expect(result.estado).toBe("EN_PROCESO");
    expect(result.hora_inicio).toBe("2026-04-08T08:00:00.000Z");
  });

  test("rechaza iniciar una jornada ya iniciada", async () => {
    jornadaService.repository.findById.mockResolvedValue(
      buildJornadaRow({ estado: "EN_PROCESO", hora_inicio: "2026-04-08T08:00:00.000Z" }),
    );

    await expect(
      jornadaService.startTurn({ jornada_id: "jornada-1" }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "JORNADA_ALREADY_STARTED",
    });
  });

  test("finaliza turno solo si la jornada esta en proceso y devuelve duracion total", async () => {
    jornadaService.repository.findById.mockResolvedValue(
      buildJornadaRow({ estado: "EN_PROCESO", hora_inicio: "2026-04-08T08:00:00.000Z" }),
    );
    jornadaService.repository.finishTurn.mockResolvedValue(
      buildJornadaRow({
        estado: "COMPLETADA",
        hora_inicio: "2026-04-08T08:00:00.000Z",
        hora_fin: "2026-04-08T18:00:00.000Z",
        observaciones: "Turno cerrado",
        duracion_total_segundos: 36000,
      }),
    );

    const result = await jornadaService.finishTurn({
      jornada_id: "jornada-1",
      observaciones: "Turno cerrado",
    });

    expect(jornadaService.repository.finishTurn).toHaveBeenCalledWith(
      "jornada-1",
      "Turno cerrado",
    );
    expect(result.estado).toBe("COMPLETADA");
    expect(result.duracion_total_segundos).toBe(36000);
  });

  test("rechaza finalizar una jornada fuera de EN_PROCESO", async () => {
    jornadaService.repository.findById.mockResolvedValue(buildJornadaRow());

    await expect(
      jornadaService.finishTurn({ jornada_id: "jornada-1" }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "JORNADA_NOT_IN_PROGRESS",
    });
  });
});
