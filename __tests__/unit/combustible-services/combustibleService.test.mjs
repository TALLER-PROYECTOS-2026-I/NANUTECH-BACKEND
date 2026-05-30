import { jest } from "@jest/globals";

jest.unstable_mockModule("../../../src/functions/combustible-services/combustibleRepository.mjs", () => ({
  CombustibleRepository: jest.fn().mockImplementation(() => ({
    findJornadaEnProceso: jest.fn(),
    getUltimoKilometraje: jest.fn(),
    createRegistro: jest.fn(),
    findByJornada: jest.fn(),
  })),
}));

const { CombustibleService } = await import(
  "../../../src/functions/combustible-services/combustibleService.mjs"
);

describe("CombustibleService", () => {
  let service;

  const validPayload = {
    jornada_id: "cccc0003-0000-0000-0000-000000000003",
    conductor_id: "22222222-2222-2222-2222-222222222222",
    galones: 10,
    costo_total: 180,
    kilometraje_actual: 1350,
    foto_comprobante_url: "https://demo.com/foto.jpg",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CombustibleService();
  });

  function mockJornada() {
    service.repository.findJornadaEnProceso.mockResolvedValue({
      id: validPayload.jornada_id,
      conductor_id: validPayload.conductor_id,
      unidad_id: "aaaa0001-0000-0000-0000-000000000001",
      contrato_id: "bbbb0001-0000-0000-0000-000000000001",
      estado: "EN_PROCESO",
      placa: "ABC-123",
    });
  }

  function mockCreateRegistro() {
    service.repository.createRegistro.mockResolvedValue({
      id: "fuel-1",
      jornada_id: validPayload.jornada_id,
      conductor_id: validPayload.conductor_id,
      unidad_id: "aaaa0001-0000-0000-0000-000000000001",
      contrato_id: "bbbb0001-0000-0000-0000-000000000001",
      tipo_comprobante: "TICKET",
      numero_comprobante: null,
      galones: "10",
      costo_total: "180",
      kilometraje_actual: "1350",
      kilometraje_anterior: "1000",
      rendimiento_km_galon: "35",
      foto_comprobante_url: "https://demo.com/foto.jpg",
      observaciones: null,
      latitud: null,
      longitud: null,
      estado: "SINCRONIZADO",
      sincronizado: true,
      registrado_at: "2026-05-29T10:00:00.000Z",
      created_at: "2026-05-29T10:00:00.000Z",
    });
  }

  test("getUltimoKilometraje retorna último km", async () => {
    service.repository.getUltimoKilometraje.mockResolvedValue(1500);

    const result = await service.getUltimoKilometraje(
      "aaaa0001-0000-0000-0000-000000000001"
    );

    expect(result.ultimo_kilometraje).toBe(1500);
  });

  test("getUltimoKilometraje rechaza unidad_id inválido", async () => {
    await expect(service.getUltimoKilometraje("bad-id")).rejects.toMatchObject({
      code: "INVALID_UNIDAD_ID",
    });
  });

  test("getRegistrosPorJornada retorna lista", async () => {
    service.repository.findByJornada.mockResolvedValue([
      {
        id: "fuel-1",
        galones: "10",
        costo_total: "180",
        kilometraje_actual: "1350",
        kilometraje_anterior: "1000",
        rendimiento_km_galon: "35",
        latitud: null,
        longitud: null,
      },
    ]);

    const result = await service.getRegistrosPorJornada(validPayload.jornada_id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("fuel-1");
  });

  test("getRegistrosPorJornada rechaza jornada_id inválido", async () => {
    await expect(service.getRegistrosPorJornada("bad-id")).rejects.toMatchObject({
      code: "INVALID_JORNADA_ID",
    });
  });

  test("registrarCombustible calcula rendimiento correctamente", async () => {
    mockJornada();
    service.repository.getUltimoKilometraje.mockResolvedValue(1000);
    mockCreateRegistro();

    const result = await service.registrarCombustible(validPayload);

    expect(service.repository.createRegistro).toHaveBeenCalledWith(
      expect.objectContaining({
        kilometraje_anterior: 1000,
        kilometraje_actual: 1350,
        rendimiento_km_galon: 35,
        estado: "SINCRONIZADO",
        sincronizado: true,
      })
    );
    expect(result.rendimiento_km_galon).toBe(35);
  });

  test("registrarCombustible soporta created_offline", async () => {
    mockJornada();
    service.repository.getUltimoKilometraje.mockResolvedValue(1000);
    mockCreateRegistro();

    await service.registrarCombustible({
      ...validPayload,
      created_offline: true,
      timestamp_local: "2026-05-29T10:00:00.000Z",
    });

    expect(service.repository.createRegistro).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: "PENDIENTE_SINCRONIZACION",
        sincronizado: false,
      })
    );
  });

  test("bloquea jornada que no está EN_PROCESO", async () => {
    service.repository.findJornadaEnProceso.mockResolvedValue(null);

    await expect(service.registrarCombustible(validPayload)).rejects.toMatchObject({
      code: "JORNADA_NOT_IN_PROGRESS",
    });
  });

  test("bloquea kilometraje menor o igual al último registro", async () => {
    mockJornada();
    service.repository.getUltimoKilometraje.mockResolvedValue(1350);

    await expect(service.registrarCombustible(validPayload)).rejects.toMatchObject({
      code: "KILOMETRAJE_INVALIDO",
    });
  });

  test.each([
    ["jornada_id", "bad-id", "INVALID_JORNADA_ID"],
    ["conductor_id", "bad-id", "INVALID_CONDUCTOR_ID"],
  ])("rechaza %s inválido", async (field, value, code) => {
    await expect(
      service.registrarCombustible({ ...validPayload, [field]: value })
    ).rejects.toMatchObject({ code });
  });

  test.each([
    ["galones", "", "GALONES_REQUIRED"],
    ["galones", 0, "GALONES_REQUIRED"],
    ["costo_total", "", "COSTO_TOTAL_REQUIRED"],
    ["costo_total", -1, "COSTO_TOTAL_REQUIRED"],
    ["kilometraje_actual", "", "KILOMETRAJE_REQUIRED"],
    ["kilometraje_actual", 0, "KILOMETRAJE_REQUIRED"],
  ])("rechaza campo numérico inválido %s", async (field, value, code) => {
    await expect(
      service.registrarCombustible({ ...validPayload, [field]: value })
    ).rejects.toMatchObject({ code });
  });

  test("bloquea foto obligatoria", async () => {
    await expect(
      service.registrarCombustible({ ...validPayload, foto_comprobante_url: "" })
    ).rejects.toMatchObject({ code: "FOTO_REQUIRED" });
  });

  test("bloquea foto no PNG/JPG", async () => {
    await expect(
      service.registrarCombustible({
        ...validPayload,
        foto_comprobante_url: "https://demo.com/archivo.pdf",
      })
    ).rejects.toMatchObject({ code: "INVALID_IMAGE_FORMAT" });
  });

  test("bloquea URL de foto demasiado larga", async () => {
    await expect(
      service.registrarCombustible({
        ...validPayload,
        foto_comprobante_url: `https://demo.com/${"a".repeat(600)}.jpg`,
      })
    ).rejects.toMatchObject({ code: "INVALID_FOTO_URL" });
  });

  test("bloquea latitud inválida", async () => {
    mockJornada();
    service.repository.getUltimoKilometraje.mockResolvedValue(1000);

    await expect(
      service.registrarCombustible({ ...validPayload, latitud: -200, longitud: -71 })
    ).rejects.toMatchObject({ code: "INVALID_LATITUDE" });
  });

  test("bloquea longitud inválida", async () => {
    mockJornada();
    service.repository.getUltimoKilometraje.mockResolvedValue(1000);

    await expect(
      service.registrarCombustible({ ...validPayload, latitud: -16, longitud: -200 })
    ).rejects.toMatchObject({ code: "INVALID_LONGITUDE" });
  });

  test("permite coordenadas válidas", async () => {
    mockJornada();
    service.repository.getUltimoKilometraje.mockResolvedValue(1000);
    mockCreateRegistro();

    await service.registrarCombustible({
      ...validPayload,
      latitud: -16.4014,
      longitud: -71.5343,
    });

    expect(service.repository.createRegistro).toHaveBeenCalledWith(
      expect.objectContaining({
        latitud: -16.4014,
        longitud: -71.5343,
      })
    );
  });
});