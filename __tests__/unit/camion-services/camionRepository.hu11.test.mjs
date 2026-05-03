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

const { CamionRepository } = await import(
  "../../../src/functions/camion-services/camionRepository.mjs"
);

const columnasUnidades = [
  "id",
  "placa",
  "marca",
  "modelo",
  "anio",
  "capacidad_ton",
  "estado",
  "gps_habilitado",
  "vin",
  "color",
  "tipo_combustible",
  "fecha_registro",
  "ultima_fecha_mantenimiento",
  "proxima_fecha_mantenimiento",
  "kilometraje_actual",
  "activo",
];

const mockColumnas = () => ({
  rows: columnasUnidades.map((column_name) => ({ column_name })),
});

const mockExisteGps = (exists = false) => ({
  rows: [{ exists }],
});

describe("HU11 - CamionRepository", () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new CamionRepository();
  });

  test("getAll debe consultar unidades con filtros cuando gps_registros existe", async () => {
    mockQuery
      .mockResolvedValueOnce(mockColumnas())
      .mockResolvedValueOnce(mockExisteGps(true))
      .mockResolvedValueOnce({
        rows: [
          {
            id: "unidad-001",
            placa: "ABC-123",
            marca: "Volvo",
            modelo: "FH16",
            estado: "DISPONIBLE",
            horas_movimiento: 5,
            horas_detenido: 2,
          },
        ],
      });

    const result = await repository.getAll({
      placa: "ABC",
      estado: "DISPONIBLE",
    });

    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[2][1]).toEqual(["%ABC%", "DISPONIBLE"]);
    expect(result).toHaveLength(1);
    expect(result[0].placa).toBe("ABC-123");
  });

  test("getAll debe funcionar aunque gps_registros no exista", async () => {
    mockQuery
      .mockResolvedValueOnce(mockColumnas())
      .mockResolvedValueOnce(mockExisteGps(false))
      .mockResolvedValueOnce({
        rows: [
          {
            id: "unidad-001",
            placa: "ABC-123",
            horas_movimiento: 0,
            horas_detenido: 0,
          },
        ],
      });

    const result = await repository.getAll();

    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[2][0]).not.toContain("FROM gps_registros");
    expect(result[0].horas_movimiento).toBe(0);
  });

  test("getAll debe mapear EN_USO a EN_JORNADA", async () => {
    mockQuery
      .mockResolvedValueOnce(mockColumnas())
      .mockResolvedValueOnce(mockExisteGps(false))
      .mockResolvedValueOnce({
        rows: [],
      });

    await repository.getAll({
      estado: "EN_USO",
    });

    expect(mockQuery.mock.calls[2][1]).toEqual(["EN_JORNADA"]);
  });

  test("getById debe retornar una unidad por id exacto", async () => {
    mockQuery
      .mockResolvedValueOnce(mockColumnas())
      .mockResolvedValueOnce(mockExisteGps(false))
      .mockResolvedValueOnce({
        rows: [
          {
            id: "unidad-001",
            placa: "ABC-123",
          },
        ],
      });

    const result = await repository.getById("unidad-001");

    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[2][1]).toEqual(["unidad-001"]);
    expect(result.placa).toBe("ABC-123");
  });

  test("getById debe usar fallback ordinal cuando el id es numérico", async () => {
    mockQuery
      .mockResolvedValueOnce(mockColumnas())
      .mockResolvedValueOnce(mockExisteGps(false))
      .mockResolvedValueOnce({
        rows: [],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "unidad-001",
            placa: "ABC-123",
          },
        ],
      });

    const result = await repository.getById("1");

    expect(mockQuery).toHaveBeenCalledTimes(4);
    expect(mockQuery.mock.calls[3][1]).toEqual([0]);
    expect(result.placa).toBe("ABC-123");
  });

  test("getById debe retornar null si no existe", async () => {
    mockQuery
      .mockResolvedValueOnce(mockColumnas())
      .mockResolvedValueOnce(mockExisteGps(false))
      .mockResolvedValueOnce({
        rows: [],
      });

    const result = await repository.getById("unidad-x");

    expect(result).toBeNull();
  });

  test("getByPlaca debe buscar por placa", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "unidad-001",
          placa: "ABC-123",
        },
      ],
    });

    const result = await repository.getByPlaca("ABC-123");

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["ABC-123"]);
    expect(result.placa).toBe("ABC-123");
  });

  test("getByVin debe buscar por VIN cuando existe columna vin", async () => {
    mockQuery
      .mockResolvedValueOnce(mockColumnas())
      .mockResolvedValueOnce({
        rows: [
          {
            id: "unidad-001",
            vin: "VINABC123",
          },
        ],
      });

    const result = await repository.getByVin("VINABC123");

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][1]).toEqual(["VINABC123"]);
    expect(result.vin).toBe("VINABC123");
  });

  test("getByVin debe retornar null si no existe columna vin", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { column_name: "id" },
        { column_name: "placa" },
        { column_name: "marca" },
        { column_name: "modelo" },
        { column_name: "estado" },
      ],
    });

    const result = await repository.getByVin("VINABC123");

    expect(result).toBeNull();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test("create debe insertar unidad y sincronizar legacy", async () => {
    const data = {
      placa: "XYZ-999",
      marca: "Volvo",
      modelo: "FH16",
      anio: 2024,
      capacidad_ton: 20,
      gps_habilitado: true,
      vin: "VINXYZ999",
      color: "Blanco",
      tipo_combustible: "DIESEL",
      fecha_registro: "2026-05-01",
      ultima_fecha_mantenimiento: null,
      proxima_fecha_mantenimiento: null,
      kilometraje_actual: 0,
      notas: null,
    };

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: "unidad-001",
            ...data,
            estado: "DISPONIBLE",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [],
      });

    const result = await repository.create(data);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(result.placa).toBe("XYZ-999");
  });

  test("syncCamionLegacy debe capturar error sin romper", async () => {
    mockQuery.mockRejectedValueOnce(new Error("tabla camiones no existe"));

    await expect(
      repository.syncCamionLegacy({
        id: "unidad-001",
        placa: "XYZ-999",
        marca: "Volvo",
        modelo: "FH16",
      }),
    ).resolves.toBeUndefined();
  });

  test("getPanel debe calcular porcentajes cuando gps_registros existe", async () => {
    mockQuery
      .mockResolvedValueOnce(mockColumnas())
      .mockResolvedValueOnce(mockExisteGps(true))
      .mockResolvedValueOnce({
        rows: [
          {
            camiones: [
              {
                placa: "ABC-123",
                estado: "DISPONIBLE",
              },
            ],
            total_camiones: 2,
            en_uso: 1,
            disponibles: 1,
            mantenimiento: 0,
            horas_movimiento: 8,
            horas_detenido: 2,
          },
        ],
      });

    const result = await repository.getPanel({
      estado: "TODOS",
    });

    expect(result.resumen.total_camiones).toBe(2);
    expect(result.grafica_movimiento.porcentaje_movimiento).toBe(80);
    expect(result.grafica_movimiento.porcentaje_detenido).toBe(20);
    expect(result.camiones).toHaveLength(1);
  });

  test("getPanel debe funcionar aunque gps_registros no exista", async () => {
    mockQuery
      .mockResolvedValueOnce(mockColumnas())
      .mockResolvedValueOnce(mockExisteGps(false))
      .mockResolvedValueOnce({
        rows: [
          {
            camiones: [],
            total_camiones: 0,
            en_uso: 0,
            disponibles: 0,
            mantenimiento: 0,
            horas_movimiento: 0,
            horas_detenido: 0,
          },
        ],
      });

    const result = await repository.getPanel();

    expect(mockQuery.mock.calls[2][0]).not.toContain("FROM gps_registros");
    expect(result.grafica_movimiento.porcentaje_movimiento).toBe(0);
    expect(result.grafica_movimiento.porcentaje_detenido).toBe(0);
  });

  test("exportCsv debe generar CSV con encabezados y filas", async () => {
    mockQuery
      .mockResolvedValueOnce(mockColumnas())
      .mockResolvedValueOnce(mockExisteGps(false))
      .mockResolvedValueOnce({
        rows: [
          {
            camiones: [
              {
                id: "unidad-001",
                placa: "XYZ-999",
                marca: "Volvo",
                modelo: "FH16",
                anio: 2024,
                capacidad_ton: 20,
                estado: "DISPONIBLE",
                vin: "VINXYZ999",
                color: "Blanco",
                gps_habilitado: true,
                kilometros_totales: 1500,
                fecha_registro: "2026-05-01",
                ultima_fecha_mantenimiento: null,
                proxima_fecha_mantenimiento: null,
              },
            ],
            total_camiones: 1,
            en_uso: 0,
            disponibles: 1,
            mantenimiento: 0,
            horas_movimiento: 0,
            horas_detenido: 0,
          },
        ],
      });

    const csv = await repository.exportCsv({
      estado: "DISPONIBLE",
    });

    expect(csv).toContain("Placa");
    expect(csv).toContain("XYZ-999");
    expect(csv).toContain("Capacidad (ton)");
  });

  test("getAll debe lanzar error si falla query principal", async () => {
    mockQuery
      .mockResolvedValueOnce(mockColumnas())
      .mockResolvedValueOnce(mockExisteGps(false))
      .mockRejectedValueOnce(new Error("DB error"));

    await expect(repository.getAll()).rejects.toThrow("Error al obtener camiones");
  });

  test("getPanel debe lanzar error si falla query principal", async () => {
    mockQuery
      .mockResolvedValueOnce(mockColumnas())
      .mockResolvedValueOnce(mockExisteGps(false))
      .mockRejectedValueOnce(new Error("DB error"));

    await expect(repository.getPanel()).rejects.toThrow(
      "Error al obtener panel de camiones",
    );
  });
});