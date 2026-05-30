import { jest } from "@jest/globals";

jest.unstable_mockModule("../../../src/functions/auth-services/authService.mjs", () => ({
  getCurrentSession: jest.fn().mockResolvedValue({
    user: { id: "user-1" },
    role: "chofer",
    session: { id: "session-1" },
  }),
}));

jest.unstable_mockModule("../../../src/functions/combustible-services/combustibleService.mjs", () => ({
  CombustibleService: jest.fn().mockImplementation(() => ({
    registrarCombustible: jest.fn(),
    getUltimoKilometraje: jest.fn(),
    getRegistrosPorJornada: jest.fn(),
  })),
}));

const {
  registrarCombustibleController,
  getUltimoKmController,
  getCombustibleByJornadaController,
} = await import("../../../src/functions/combustible-services/combustibleController.mjs");

const { CombustibleService } = await import(
  "../../../src/functions/combustible-services/combustibleService.mjs"
);
const { getCurrentSession } = await import("../../../src/functions/auth-services/authService.mjs");

const withAuth = (event = {}) => ({
  ...event,
  headers: {
    Authorization: "Bearer fake-token",
    ...(event.headers || {}),
  },
});

describe("CombustibleController", () => {
  beforeEach(() => jest.clearAllMocks());

  test("registrarCombustibleController registra combustible con status 200", async () => {
    const mockRegistrar = jest.fn().mockResolvedValue({
      id: "fuel-1",
      rendimiento_km_galon: 35,
    });

    CombustibleService.mockImplementation(() => ({
      registrarCombustible: mockRegistrar,
    }));

    const result = await registrarCombustibleController(
      withAuth({
        body: JSON.stringify({
          jornada_id: "cccc0003-0000-0000-0000-000000000003",
          conductor_id: "22222222-2222-2222-2222-222222222222",
          galones: 10,
          costo_total: 180,
          kilometraje_actual: 1350,
          foto_comprobante_url: "https://demo.com/foto.jpg",
        }),
      })
    );

    expect(getCurrentSession).toHaveBeenCalledWith("Bearer fake-token");
    expect(mockRegistrar).toHaveBeenCalled();
    expect(result.statusCode).toBe(200);
  });

  test("registrarCombustibleController retorna 400 con JSON inválido", async () => {
    const result = await registrarCombustibleController(
      withAuth({ body: "{json-mal-formado" })
    );

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.data.code).toBe("INVALID_JSON");
  });

  test("registrarCombustibleController retorna error del servicio", async () => {
    CombustibleService.mockImplementation(() => ({
      registrarCombustible: jest.fn().mockRejectedValue({
        message: "El kilometraje debe ser mayor al último registro de la unidad",
        statusCode: 400,
        code: "KILOMETRAJE_INVALIDO",
      }),
    }));

    const result = await registrarCombustibleController(
      withAuth({ body: JSON.stringify({}) })
    );

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.data.code).toBe("KILOMETRAJE_INVALIDO");
  });

  test("getUltimoKmController retorna último kilometraje", async () => {
    const mockUltimoKm = jest.fn().mockResolvedValue({
      unidad_id: "aaaa0001-0000-0000-0000-000000000001",
      ultimo_kilometraje: 1000,
    });

    CombustibleService.mockImplementation(() => ({
      getUltimoKilometraje: mockUltimoKm,
    }));

    const result = await getUltimoKmController(
      withAuth({
        pathParameters: { unidadId: "aaaa0001-0000-0000-0000-000000000001" },
      })
    );

    expect(result.statusCode).toBe(200);
    expect(mockUltimoKm).toHaveBeenCalledWith(
      "aaaa0001-0000-0000-0000-000000000001"
    );
  });

  test("getUltimoKmController retorna error del servicio", async () => {
    CombustibleService.mockImplementation(() => ({
      getUltimoKilometraje: jest.fn().mockRejectedValue({
        message: "El campo unidad_id debe ser UUID válido.",
        statusCode: 400,
        code: "INVALID_UNIDAD_ID",
      }),
    }));

    const result = await getUltimoKmController(
      withAuth({ pathParameters: { unidadId: "bad-id" } })
    );

    expect(result.statusCode).toBe(400);
  });

  test("getCombustibleByJornadaController retorna registros por jornada", async () => {
    const mockByJornada = jest.fn().mockResolvedValue([
      { id: "fuel-1", jornada_id: "cccc0003-0000-0000-0000-000000000003" },
    ]);

    CombustibleService.mockImplementation(() => ({
      getRegistrosPorJornada: mockByJornada,
    }));

    const result = await getCombustibleByJornadaController(
      withAuth({
        pathParameters: { jornadaId: "cccc0003-0000-0000-0000-000000000003" },
      })
    );

    expect(result.statusCode).toBe(200);
    expect(mockByJornada).toHaveBeenCalledWith(
      "cccc0003-0000-0000-0000-000000000003"
    );
  });

  test("getCombustibleByJornadaController retorna error del servicio", async () => {
    CombustibleService.mockImplementation(() => ({
      getRegistrosPorJornada: jest.fn().mockRejectedValue({
        message: "El campo jornada_id debe ser UUID válido.",
        statusCode: 400,
        code: "INVALID_JORNADA_ID",
      }),
    }));

    const result = await getCombustibleByJornadaController(
      withAuth({ pathParameters: { jornadaId: "bad-id" } })
    );

    expect(result.statusCode).toBe(400);
  });
});