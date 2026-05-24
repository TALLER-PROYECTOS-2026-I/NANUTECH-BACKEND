import { jest } from "@jest/globals";

jest.unstable_mockModule("../../../src/functions/auth-services/authService.mjs", () => ({
  getCurrentSession: jest.fn().mockResolvedValue({
    user: { id: "user-1", correo: "admin@nanutech.com" },
    role: "gerente",
    session: { id: "session-1" },
  }),
}));

jest.unstable_mockModule("../../../src/functions/alerta-services/alertaService.mjs", () => ({
  AlertaService: jest.fn().mockImplementation(() => ({
    getIndicadores: jest.fn(),
    getAlertasActivas: jest.fn(),
    resolverAlerta: jest.fn(),
    actualizarEstado: jest.fn(),
    registrarSos: jest.fn(),
    registrarAuxilio: jest.fn(),
  })),
}));

const {
  getIndicadoresController,
  getAlertasActivasController,
  registrarSosController,
  registrarAuxilioController,
  resolverAlertaController,
  actualizarEstadoController,
} = await import("../../../src/functions/alerta-services/alertaController.mjs");

const { AlertaService } = await import("../../../src/functions/alerta-services/alertaService.mjs");
const { getCurrentSession } = await import("../../../src/functions/auth-services/authService.mjs");

const withAuth = (event = {}) => ({
  ...event,
  headers: {
    Authorization: "Bearer fake-token-test",
    ...(event.headers || {}),
  },
});

describe("AlertaController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getIndicadoresController retorna indicadores con status 200", async () => {
    AlertaService.mockImplementation(() => ({
      getIndicadores: jest.fn().mockResolvedValue({
        panico_activas: 2,
        auxilio_pendientes: 2,
        total_resueltas: 12,
        tiene_panico_activo: true,
      }),
    }));

    const result = await getIndicadoresController(withAuth());

    expect(result.statusCode).toBe(200);
    expect(getCurrentSession).toHaveBeenCalledWith("Bearer fake-token-test");

    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.panico_activas).toBe(2);
  });

  test("getIndicadoresController retorna 401 sin token", async () => {
    const authError = new Error("Token requerido");
    authError.statusCode = 401;
    authError.code = "TOKEN_REQUIRED";
    getCurrentSession.mockRejectedValueOnce(authError);

    const result = await getIndicadoresController({ headers: {} });

    expect(result.statusCode).toBe(401);
  });

  test("getAlertasActivasController retorna lista con status 200", async () => {
    AlertaService.mockImplementation(() => ({
      getAlertasActivas: jest.fn().mockResolvedValue([
        {
          id: "alert-1",
          tipo: "PANICO",
          estado: "ACTIVA",
          severidad: "CRITICA",
        },
      ]),
    }));

    const result = await getAlertasActivasController(withAuth());

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data[0].tipo).toBe("PANICO");
  });

  test("getAlertasActivasController sin filtros retorna todas las alertas incluyendo resueltas", async () => {
    const mockGetAlertasActivas = jest.fn().mockResolvedValue([
      {
        id: "alert-1",
        tipo: "PANICO",
        estado: "ACTIVA",
        severidad: "CRITICA",
      },
      {
        id: "alert-2",
        tipo: "AUXILIO_MECANICO",
        estado: "RESUELTA",
        severidad: "ALTA",
        detalle_resolucion: "Cambio de bateria",
      },
    ]);

    AlertaService.mockImplementation(() => ({
      getAlertasActivas: mockGetAlertasActivas,
    }));

    const result = await getAlertasActivasController(withAuth());

    expect(result.statusCode).toBe(200);
    expect(mockGetAlertasActivas).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: undefined, estado: undefined })
    );

    const body = JSON.parse(result.body);
    expect(body.data).toHaveLength(2);
    expect(body.data[1].estado).toBe("RESUELTA");
  });

  test("getAlertasActivasController filtra por tipo", async () => {
    const mockGetAlertasActivas = jest.fn().mockResolvedValue([]);

    AlertaService.mockImplementation(() => ({
      getAlertasActivas: mockGetAlertasActivas,
    }));

    await getAlertasActivasController(
      withAuth({
        queryStringParameters: { tipo: "AUXILIO_MECANICO" },
      })
    );

    expect(mockGetAlertasActivas).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "AUXILIO_MECANICO" })
    );
  });

  test("registrarSosController registra SOS con status 200", async () => {
    const mockRegistrarSos = jest.fn().mockResolvedValue({
      id: "alert-sos-1",
      tipo: "PANICO",
      estado: "ACTIVA",
      severidad: "CRITICA",
      sistema_bloqueado: true,
    });

    AlertaService.mockImplementation(() => ({
      registrarSos: mockRegistrarSos,
    }));

    const result = await registrarSosController(
      withAuth({
        body: JSON.stringify({
          jornada_id: "cccc0003-0000-0000-0000-000000000003",
          conductor_id: "22222222-2222-2222-2222-222222222222",
          latitud: -12.0464,
          longitud: -77.0428,
          event_id_cliente: "sos-test-001",
        }),
      })
    );

    expect(result.statusCode).toBe(200);
    expect(mockRegistrarSos).toHaveBeenCalledWith(
      expect.objectContaining({
        jornada_id: "cccc0003-0000-0000-0000-000000000003",
        conductor_id: "22222222-2222-2222-2222-222222222222",
        latitud: -12.0464,
        longitud: -77.0428,
      })
    );

    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.tipo).toBe("PANICO");
    expect(body.data.sistema_bloqueado).toBe(true);
  });

  test("registrarAuxilioController registra auxilio mecanico con status 200", async () => {
    const mockRegistrarAuxilio = jest.fn().mockResolvedValue({
      id: "alert-aux-1",
      tipo: "AUXILIO_MECANICO",
      estado: "ACTIVA",
      severidad: "ALTA",
      tipo_falla_mecanica: "Pinchazo/Llantas",
    });

    AlertaService.mockImplementation(() => ({
      registrarAuxilio: mockRegistrarAuxilio,
    }));

    const result = await registrarAuxilioController(
      withAuth({
        body: JSON.stringify({
          jornada_id: "cccc0003-0000-0000-0000-000000000003",
          conductor_id: "22222222-2222-2222-2222-222222222222",
          tipo_falla_mecanica: "Pinchazo/Llantas",
          detalle: "Llanta posterior danada.",
          latitud: -12.0464,
          longitud: -77.0428,
          event_id_cliente: "aux-test-001",
        }),
      })
    );

    expect(result.statusCode).toBe(200);
    expect(mockRegistrarAuxilio).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_falla_mecanica: "Pinchazo/Llantas",
        latitud: -12.0464,
        longitud: -77.0428,
      })
    );

    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.tipo).toBe("AUXILIO_MECANICO");
  });

  test("resolverAlertaController resuelve alerta exitosamente", async () => {
    AlertaService.mockImplementation(() => ({
      resolverAlerta: jest.fn().mockResolvedValue({
        id: "alert-1",
        estado: "RESUELTA",
        atendida: true,
      }),
    }));

    const result = await resolverAlertaController(
      withAuth({
        pathParameters: { id: "alert-1" },
        body: JSON.stringify({ detalle_resolucion: "Resuelto por tecnico" }),
      })
    );

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.estado).toBe("RESUELTA");
  });

  test("resolverAlertaController retorna 404 si alerta no existe", async () => {
    AlertaService.mockImplementation(() => ({
      resolverAlerta: jest.fn().mockRejectedValue({
        message: "Alerta no encontrada.",
        statusCode: 404,
        code: "ALERTA_NOT_FOUND",
      }),
    }));

    const result = await resolverAlertaController(
      withAuth({
        pathParameters: { id: "no-existe" },
        body: JSON.stringify({}),
      })
    );

    expect(result.statusCode).toBe(404);
  });

  test("actualizarEstadoController cambia estado a EN_PROCESO", async () => {
    AlertaService.mockImplementation(() => ({
      actualizarEstado: jest.fn().mockResolvedValue({
        id: "alert-1",
        tipo: "AUXILIO_MECANICO",
        estado: "EN_PROCESO",
      }),
    }));

    const result = await actualizarEstadoController(
      withAuth({
        pathParameters: { id: "alert-1" },
        body: JSON.stringify({ estado: "EN_PROCESO" }),
      })
    );

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.estado).toBe("EN_PROCESO");
  });
});