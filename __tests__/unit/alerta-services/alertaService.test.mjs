import { jest } from "@jest/globals";

jest.unstable_mockModule("../../../src/functions/alerta-services/alertaRepository.mjs", () => ({
  AlertaRepository: jest.fn().mockImplementation(() => ({
    getIndicadores: jest.fn(),
    findActivas: jest.fn(),
    findById: jest.fn(),
    resolverAlerta: jest.fn(),
    actualizarEstado: jest.fn(),
  })),
}));

const { AlertaService } = await import("../../../src/functions/alerta-services/alertaService.mjs");

const buildAlertaRow = (overrides = {}) => ({
  id: "alert-1",
  codigo: "ALT-001",
  jornada_id: "jor-1",
  tipo: "AUXILIO_MECANICO",
  estado: "ACTIVA",
  severidad: "ALTA",
  detalle: "Falla de motor",
  tipo_falla_mecanica: "Sobrecalentamiento",
  latitud: -12.0264,
  longitud: -76.9916,
  direccion: "Av. Principal 123",
  fecha_hora: "2026-04-07T11:53:30.000Z",
  bloqueo_sos_activo: false,
  conductor_id: "cond-1",
  conductor_nombre_completo: "Carlos Rodriguez",
  conductor_telefono: "999111222",
  conductor_dni: "70000001",
  unidad_id: "uni-1",
  unidad_placa: "ABC-123",
  unidad_marca: "Volvo",
  unidad_modelo: "FH16",
  ...overrides,
});

describe("AlertaService", () => {
  let alertaService;

  beforeEach(() => {
    jest.clearAllMocks();
    alertaService = new AlertaService();
  });

  test("getIndicadores retorna objeto con 4 campos", async () => {
    alertaService.repository.getIndicadores.mockResolvedValue({
      panico_activas: 2,
      auxilio_pendientes: 2,
      total_resueltas: 12,
      tiene_panico_activo: true,
    });

    const result = await alertaService.getIndicadores();

    expect(alertaService.repository.getIndicadores).toHaveBeenCalled();
    expect(result).toHaveProperty("panico_activas", 2);
    expect(result).toHaveProperty("auxilio_pendientes", 2);
    expect(result).toHaveProperty("total_resueltas", 12);
    expect(result).toHaveProperty("tiene_panico_activo", true);
  });

  test("getAlertasActivas retorna lista filtrada", async () => {
    alertaService.repository.findActivas.mockResolvedValue([
      buildAlertaRow({ tipo: "PANICO", estado: "ACTIVA" }),
      buildAlertaRow({ id: "alert-2", tipo: "AUXILIO_MECANICO", estado: "EN_PROCESO" }),
    ]);

    const result = await alertaService.getAlertasActivas({ tipo: "PANICO" });

    expect(alertaService.repository.findActivas).toHaveBeenCalledWith({ tipo: "PANICO" });
    expect(result).toHaveLength(2);
    expect(result[0].tipo).toBe("PANICO");
  });

  test("resolverAlerta lanza error si no existe", async () => {
    alertaService.repository.findById.mockResolvedValue(null);

    await expect(alertaService.resolverAlerta("no-existe")).rejects.toMatchObject({
      message: "Alerta no encontrada.",
      statusCode: 404,
      code: "ALERTA_NOT_FOUND",
    });
  });

  test("resolverAlerta lanza error si ya está resuelta", async () => {
    alertaService.repository.findById.mockResolvedValue(
      buildAlertaRow({ estado: "RESUELTA" })
    );

    await expect(alertaService.resolverAlerta("alert-1")).rejects.toMatchObject({
      message: "La alerta ya fue resuelta.",
      statusCode: 400,
      code: "ALERTA_YA_RESUELTA",
    });
  });

  test("actualizarEstado lanza error si tipo no es AUXILIO_MECANICO", async () => {
    alertaService.repository.findById.mockResolvedValue(
      buildAlertaRow({ tipo: "PANICO", estado: "ACTIVA" })
    );

    await expect(alertaService.actualizarEstado("alert-1", "EN_PROCESO")).rejects.toMatchObject({
      message: "Solo aplica para auxilios mecánicos.",
      statusCode: 400,
      code: "SOLO_AUXILIO_MECANICO",
    });
  });

  test("actualizarEstado actualiza estado correctamente", async () => {
    alertaService.repository.findById.mockResolvedValue(
      buildAlertaRow({ tipo: "AUXILIO_MECANICO", estado: "ACTIVA" })
    );
    alertaService.repository.actualizarEstado.mockResolvedValue(
      buildAlertaRow({ estado: "EN_PROCESO" })
    );

    const result = await alertaService.actualizarEstado("alert-1", "EN_PROCESO");

    expect(alertaService.repository.actualizarEstado).toHaveBeenCalledWith("alert-1", "EN_PROCESO");
    expect(result.estado).toBe("EN_PROCESO");
  });
});
