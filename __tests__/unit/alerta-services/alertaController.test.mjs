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
  })),
}));

const {
  getIndicadoresController,
  getAlertasActivasController,
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
    expect(body.data.tiene_panico_activo).toBe(true);
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
          codigo: "ALT-001",
          tipo: "PANICO",
          estado: "ACTIVA",
          severidad: "CRITICA",
          conductor: { id: "cond-1", nombre_completo: "Carlos Rodriguez" },
          unidad: { id: "uni-1", placa: "ABC-123" },
        },
      ]),
    }));

    const result = await getAlertasActivasController(withAuth());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0].tipo).toBe("PANICO");
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
        body: JSON.stringify({ detalle_resolucion: "Resuelto por técnico" }),
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
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
  });

  test("resolverAlertaController retorna 400 si ya está resuelta", async () => {
    AlertaService.mockImplementation(() => ({
      resolverAlerta: jest.fn().mockRejectedValue({
        message: "La alerta ya fue resuelta.",
        statusCode: 400,
        code: "ALERTA_YA_RESUELTA",
      }),
    }));

    const result = await resolverAlertaController(
      withAuth({
        pathParameters: { id: "alert-1" },
        body: JSON.stringify({}),
      })
    );

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
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

  test("actualizarEstadoController retorna 400 si no es AUXILIO_MECANICO", async () => {
    AlertaService.mockImplementation(() => ({
      actualizarEstado: jest.fn().mockRejectedValue({
        message: "Solo aplica para auxilios mecánicos.",
        statusCode: 400,
        code: "SOLO_AUXILIO_MECANICO",
      }),
    }));

    const result = await actualizarEstadoController(
      withAuth({
        pathParameters: { id: "alert-1" },
        body: JSON.stringify({ estado: "EN_PROCESO" }),
      })
    );

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
  });
});
