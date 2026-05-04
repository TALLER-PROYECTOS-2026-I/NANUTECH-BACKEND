import { jest } from "@jest/globals";

const mockQuery = jest.fn();

jest.unstable_mockModule(
  "../../../src/shared/config/database.mjs",
  () => ({
    default: {
      query: mockQuery,
    },
  }),
);

const { GpsRepository } = await import(
  "../../../src/functions/gps-services/gpsRepository.mjs"
);

describe("HU08 - GpsRepository", () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new GpsRepository();
  });

  test("findUnidadByPlaca debe buscar unidad por placa", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "unidad-001",
          placa: "ABC-123",
        },
      ],
    });

    const result = await repository.findUnidadByPlaca("ABC-123");

    expect(mockQuery).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.placa).toBe("ABC-123");
  });

  test("findUnidadByPlaca debe retornar null si no encuentra unidad", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
    });

    const result = await repository.findUnidadByPlaca("NO-EXISTE");

    expect(mockQuery).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test("createImportacion debe crear cabecera de importación", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "importacion-001",
          proveedor: "GPSCONTROL",
          nombre_archivo: "gps.csv",
          estado: "VALIDADA",
        },
      ],
    });

    const result = await repository.createImportacion({
      proveedor: "GPSCONTROL",
      nombreArchivo: "gps.csv",
      nombre_archivo: "gps.csv",
      totalRegistros: 1,
      total_registros: 1,
      registrosValidos: 1,
      registros_validos: 1,
      registrosInvalidos: 0,
      registros_invalidos: 0,
      estado: "VALIDADA",
    });

    expect(mockQuery).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(JSON.stringify(result)).toContain("GPSCONTROL");
  });

  test("saveImportacionError debe registrar error de importación sin romper", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    });

    await expect(
      repository.saveImportacionError({
        importacionId: "importacion-001",
        importacion_id: "importacion-001",
        numeroFila: 2,
        numero_fila: 2,
        campo: "latitud",
        valorRecibido: "999",
        valor_recibido: "999",
        motivoError: "Latitud fuera de rango",
        motivo_error: "Latitud fuera de rango",
      }),
    ).resolves.toBeUndefined();

    expect(mockQuery).toHaveBeenCalled();
  });

  test("existsRegistro debe retornar true si existe registro duplicado", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          exists: true,
        },
      ],
    });

    const result = await repository.existsRegistro({
      proveedor: "GPSCONTROL",
      unidadId: "unidad-001",
      unidad_id: "unidad-001",
      fechaHora: "2026-05-01T08:00:00.000Z",
      fecha_hora: "2026-05-01T08:00:00.000Z",
    });

    expect(mockQuery).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test("existsRegistro debe retornar false si no existe registro", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          exists: false,
        },
      ],
    });

    const result = await repository.existsRegistro({
      proveedor: "GPSCONTROL",
      unidadId: "unidad-001",
      unidad_id: "unidad-001",
      fechaHora: "2026-05-01T08:00:00.000Z",
      fecha_hora: "2026-05-01T08:00:00.000Z",
    });

    expect(mockQuery).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  test("importRows debe procesar filas válidas", async () => {
    repository.createImportacion = jest.fn().mockResolvedValue({
      id: "importacion-001",
    });

    repository.findUnidadByPlaca = jest.fn().mockResolvedValue({
      id: "unidad-001",
      placa: "ABC-123",
    });

    repository.existsRegistro = jest.fn().mockResolvedValue(false);

    repository.insertRegistro = jest.fn().mockResolvedValue({
      id: "registro-001",
      proveedor: "GPSCONTROL",
      unidad_id: "unidad-001",
    });

    const result = await repository.importRows({
      proveedor: "GPSCONTROL",
      nombreArchivo: "gps.csv",
      validRows: [
        {
          placa: "ABC-123",
          fecha_hora: "2026-05-01T08:00:00.000Z",
          latitud: -12.0464,
          longitud: -77.0428,
          velocidad_kmh: 60,
          rumbo: 180,
          odometro_km: 1000,
          estado: "MOVIENDO",
        },
      ],
      validationErrors: [],
    });

    expect(repository.createImportacion).toHaveBeenCalled();
    expect(repository.findUnidadByPlaca).toHaveBeenCalledWith("ABC-123");
    expect(repository.existsRegistro).toHaveBeenCalled();
    expect(repository.insertRegistro).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test("importRows debe omitir registros duplicados", async () => {
    repository.createImportacion = jest.fn().mockResolvedValue({
      id: "importacion-001",
    });

    repository.findUnidadByPlaca = jest.fn().mockResolvedValue({
      id: "unidad-001",
      placa: "ABC-123",
    });

    repository.existsRegistro = jest.fn().mockResolvedValue(true);
    repository.insertRegistro = jest.fn();

    const result = await repository.importRows({
      proveedor: "GPSCONTROL",
      nombreArchivo: "gps.csv",
      validRows: [
        {
          placa: "ABC-123",
          fecha_hora: "2026-05-01T08:00:00.000Z",
          latitud: -12.0464,
          longitud: -77.0428,
          velocidad_kmh: 60,
          rumbo: 180,
          odometro_km: 1000,
          estado: "MOVIENDO",
        },
      ],
      validationErrors: [],
    });

    expect(repository.createImportacion).toHaveBeenCalled();
    expect(repository.findUnidadByPlaca).toHaveBeenCalledWith("ABC-123");
    expect(repository.existsRegistro).toHaveBeenCalled();
    expect(repository.insertRegistro).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test("importRows debe registrar errores de validación cuando existan", async () => {
    repository.createImportacion = jest.fn().mockResolvedValue({
      id: "importacion-001",
    });

    repository.saveImportacionError = jest.fn().mockResolvedValue(undefined);

    const result = await repository.importRows({
      proveedor: "GPSCONTROL",
      nombreArchivo: "gps.csv",
      validRows: [],
      validationErrors: [
        {
          numeroFila: 2,
          numero_fila: 2,
          campo: "latitud",
          valorRecibido: "999",
          valor_recibido: "999",
          motivoError: "Latitud fuera de rango",
          motivo_error: "Latitud fuera de rango",
        },
      ],
    });

    expect(repository.createImportacion).toHaveBeenCalled();
    expect(repository.saveImportacionError).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test("getSummary debe retornar resumen GPS", async () => {
    jest.clearAllMocks();

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          total_registros_activos: 10,
          unidades_en_movimiento: 4,
          unidades_detenidas: 6,
          velocidad_promedio: 35,
        },
      ],
    });

    const result = await repository.getSummary();

    expect(mockQuery).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(JSON.stringify(result)).toContain("10");
  });

    test("getSummary debe retornar undefined si no hay filas", async () => {
    jest.clearAllMocks();

    mockQuery.mockResolvedValueOnce({
      rows: [],
    });

    const result = await repository.getSummary();

    expect(mockQuery).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  test("listRegistros debe listar registros GPS", async () => {
    jest.clearAllMocks();

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "registro-001",
          placa: "ABC-123",
          proveedor: "GPSCONTROL",
          velocidad_kmh: 60,
          estado: "MOVIENDO",
        },
      ],
    });

    const result = await repository.listRegistros({
      proveedor: "GPSCONTROL",
      placa: "ABC-123",
    });

    expect(mockQuery).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(JSON.stringify(result)).toContain("ABC-123");
  });

  test("listRegistros debe permitir filtros vacíos", async () => {
    jest.clearAllMocks();

    mockQuery.mockResolvedValueOnce({
      rows: [],
    });

    const result = await repository.listRegistros({});

    expect(mockQuery).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});