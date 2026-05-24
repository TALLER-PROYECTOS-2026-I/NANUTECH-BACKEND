import { jest } from "@jest/globals";

const mockQuery = jest.fn();
const mockRelease = jest.fn();

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  getClient: jest.fn().mockResolvedValue({
    query: mockQuery,
    release: mockRelease,
  }),
}));

const { AlertaRepository } = await import("../../../src/functions/alerta-services/alertaRepository.mjs");
const { getClient } = await import("../../../src/shared/config/database.mjs");

describe("AlertaRepository", () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new AlertaRepository();
  });

  test("getIndicadores ejecuta query correcta", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          panico_activas: "2",
          auxilio_pendientes: "2",
          total_resueltas: "12",
          tiene_panico_activo: true,
        },
      ],
    });

    const result = await repository.getIndicadores();

    expect(getClient).toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalled();
    const queryArg = mockQuery.mock.calls[0][0];
    expect(queryArg).toContain("COUNT(CASE WHEN tipo = 'PANICO'");
    expect(mockQuery.mock.calls[0][1]).toBeUndefined();
    expect(result.panico_activas).toBe(2);
    expect(result.tiene_panico_activo).toBe(true);
  });

  test("findActivas construye WHERE dinámico con filtros", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await repository.findActivas({ tipo: "PANICO", estado: "ACTIVA" });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("a.tipo = $1"),
      expect.arrayContaining(["PANICO", "ACTIVA"])
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("a.estado = $2"),
      expect.anything()
    );
    expect(mockRelease).toHaveBeenCalled();
  });

  test("findActivas sin filtros retorna todas las alertas", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await repository.findActivas();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.not.stringContaining("a.estado IN ('ACTIVA', 'EN_PROCESO')"),
      []
    );
    expect(mockRelease).toHaveBeenCalled();
  });

  test("resolverAlerta actualiza campos correctos", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "alert-1",
          estado: "RESUELTA",
          atendida: true,
          detalle_resolucion: "Cambio de batería",
          servicio_tecnico_realizado: "Técnico A",
        },
      ],
    });

    const result = await repository.resolverAlerta("alert-1", {
      detalle_resolucion: "Cambio de batería",
      servicio_tecnico_realizado: "Técnico A",
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("estado = 'RESUELTA'"),
      expect.anything()
    );
    expect(result.estado).toBe("RESUELTA");
    expect(mockRelease).toHaveBeenCalled();
  });

  test("actualizarEstado actualiza estado correctamente", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: "alert-1", estado: "EN_PROCESO" }],
    });

    const result = await repository.actualizarEstado("alert-1", "EN_PROCESO");

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("estado = $2"),
      ["alert-1", "EN_PROCESO"]
    );
    expect(result.estado).toBe("EN_PROCESO");
    expect(mockRelease).toHaveBeenCalled();
  });

  test("findById retorna null si no existe", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await repository.findById("no-existe");

    expect(result).toBeNull();
    expect(mockRelease).toHaveBeenCalled();
  });
  test("findJornadaEnProceso valida jornada del conductor en estado EN_PROCESO", async () => {
  mockQuery.mockResolvedValue({
    rows: [
      {
        id: "cccc0003-0000-0000-0000-000000000003",
        conductor_id: "22222222-2222-2222-2222-222222222222",
        unidad_id: "aaaa0001-0000-0000-0000-000000000001",
        estado: "EN_PROCESO",
        unidad_placa: "ABC-123",
      },
    ],
  });

  const result = await repository.findJornadaEnProceso(
    "cccc0003-0000-0000-0000-000000000003",
    "22222222-2222-2222-2222-222222222222"
  );

  expect(mockQuery).toHaveBeenCalledWith(
    expect.stringContaining("j.estado = 'EN_PROCESO'"),
    [
      "cccc0003-0000-0000-0000-000000000003",
      "22222222-2222-2222-2222-222222222222",
    ]
  );

  expect(result.estado).toBe("EN_PROCESO");
  expect(mockRelease).toHaveBeenCalled();
});

test("createAlerta inserta alerta HU21 correctamente", async () => {
  mockQuery.mockResolvedValue({
    rows: [
      {
        id: "alert-1",
        codigo: "sos-test-001",
        jornada_id: "cccc0003-0000-0000-0000-000000000003",
        tipo: "PANICO",
        estado: "ACTIVA",
        severidad: "CRITICA",
        detalle: "Alerta SOS generada desde app movil.",
        tipo_falla_mecanica: null,
        latitud: -12.0464,
        longitud: -77.0428,
        direccion: null,
        fecha_hora: "2026-05-19T22:05:00.000Z",
        bloqueo_sos_activo: true,
      },
    ],
  });

  const result = await repository.createAlerta({
    codigo: "sos-test-001",
    jornada_id: "cccc0003-0000-0000-0000-000000000003",
    tipo: "PANICO",
    estado: "ACTIVA",
    severidad: "CRITICA",
    detalle: "Alerta SOS generada desde app movil.",
    tipo_falla_mecanica: null,
    latitud: -12.0464,
    longitud: -77.0428,
    direccion: null,
    fecha_hora: "2026-05-19T22:05:00",
    bloqueo_sos_activo: true,
  });

  expect(mockQuery).toHaveBeenCalledWith(
    expect.stringContaining("INSERT INTO alertas_jornada"),
    expect.arrayContaining([
      "sos-test-001",
      "cccc0003-0000-0000-0000-000000000003",
      "PANICO",
      "ACTIVA",
      "CRITICA",
    ])
  );

  expect(result.tipo).toBe("PANICO");
  expect(result.bloqueo_sos_activo).toBe(true);
  expect(mockRelease).toHaveBeenCalled();
});
});
