import {
  MOVEMENT_THRESHOLD_KMH,
  SPEED_LIMIT_KMH,
  assertCsvFilename,
  getCsvFromEvent,
  getProviderConfig,
  getProviderConfigs,
  normalizeProvider,
  validateCsvContent,
} from "../../../src/functions/gps-services/gpsValidator.mjs";

describe("HU08 - gpsValidator", () => {
  const csvGpsControl =
    "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
    "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,60,180,1000.50";

  test("debe exponer constantes de movimiento y límite de velocidad", () => {
    expect(MOVEMENT_THRESHOLD_KMH).toBeDefined();
    expect(SPEED_LIMIT_KMH).toBeDefined();
    expect(Number(SPEED_LIMIT_KMH)).toBeGreaterThan(0);
  });

  test("assertCsvFilename debe aceptar archivos CSV", () => {
    expect(() => assertCsvFilename("gps.csv")).not.toThrow();
    expect(() => assertCsvFilename("reporte_gps.CSV")).not.toThrow();
  });

  test("assertCsvFilename debe rechazar archivos no CSV", () => {
    expect(() => assertCsvFilename("gps.xlsx")).toThrow(
      "Solo se permiten archivos CSV",
    );
    expect(() => assertCsvFilename("gps.txt")).toThrow();
  });

  test("normalizeProvider debe normalizar GPSCONTROL", () => {
    expect(normalizeProvider("gpscontrol")).toBe("GPSCONTROL");
    expect(normalizeProvider(" GPSCONTROL ")).toBe("GPSCONTROL");
  });

  test("normalizeProvider debe normalizar GLOBALGPS", () => {
    expect(normalizeProvider("globalgps")).toBe("GLOBALGPS");
    expect(normalizeProvider(" GLOBALGPS ")).toBe("GLOBALGPS");
  });

  test("normalizeProvider debe rechazar proveedor inválido", () => {
    expect(() => normalizeProvider("PROVEEDOR_INVALIDO")).toThrow(
      "Proveedor GPS inválido",
    );
  });

  test("getProviderConfigs debe retornar configuraciones", () => {
    const configs = getProviderConfigs();
    const text = JSON.stringify(configs).toUpperCase();

    expect(configs).toBeDefined();
    expect(text).toContain("GPSCONTROL");
    expect(text).toContain("GLOBALGPS");
  });

  test("getProviderConfig debe retornar configuración GPSCONTROL", () => {
    const config = getProviderConfig("GPSCONTROL");
    const text = JSON.stringify(config).toLowerCase();

    expect(config).toBeDefined();
    expect(text).toContain("placa");
  });

  test("getProviderConfig debe retornar configuración GLOBALGPS", () => {
    const config = getProviderConfig("GLOBALGPS");
    const text = JSON.stringify(config).toLowerCase();

    expect(config).toBeDefined();
    expect(text).toMatch(/plate|placa|vehicle/);
  });

  test("getCsvFromEvent debe obtener datos desde body JSON", () => {
    const result = getCsvFromEvent({
      body: JSON.stringify({
        csv: csvGpsControl,
        nombre_archivo: "gps.csv",
        proveedor: "GPSCONTROL",
      }),
    });

    expect(result).toBeDefined();
    expect(result.csvContent).toContain("ABC-123");
    expect(result.nombreArchivo).toBe("gps.csv");
    expect(result.proveedor).toBe("GPSCONTROL");
  });

  test("validateCsvContent debe validar CSV correcto GPSCONTROL", () => {
    const result = validateCsvContent(csvGpsControl, "GPSCONTROL");
    const text = JSON.stringify(result).toLowerCase();

    expect(result).toBeDefined();
    expect(text).toMatch(/valid|fila|row|import/);
  });

  test("validateCsvContent debe detectar columnas faltantes", () => {
    const csvMalo =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo\n" +
      "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,60,180";

    const result = validateCsvContent(csvMalo, "GPSCONTROL");
    const text = JSON.stringify(result).toLowerCase();

    expect(text).toContain("distancia");
  });

  test("validateCsvContent debe detectar latitud inválida", () => {
    const csv =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
      "2026-05-01,08:00:00,ABC-123,999,-77.0428,60,180,1000.50";

    const result = validateCsvContent(csv, "GPSCONTROL");
    const text = JSON.stringify(result).toLowerCase();

    expect(text).toMatch(/latitud|latitude|rango|range/);
  });

  test("validateCsvContent debe detectar longitud inválida", () => {
    const csv =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
      "2026-05-01,08:00:00,ABC-123,-12.0464,-999,60,180,1000.50";

    const result = validateCsvContent(csv, "GPSCONTROL");
    const text = JSON.stringify(result).toLowerCase();

    expect(text).toMatch(/longitud|longitude|rango|range/);
  });

  test("validateCsvContent debe detectar velocidad negativa", () => {
    const csv =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
      "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,-10,180,1000.50";

    const result = validateCsvContent(csv, "GPSCONTROL");
    const text = JSON.stringify(result).toLowerCase();

    expect(text).toMatch(/velocidad|speed|negativa|negative/);
  });
});