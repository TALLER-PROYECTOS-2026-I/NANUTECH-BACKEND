import {
  assertCsvFilename,
  normalizeProvider,
  validateCsvContent,
} from "../../../src/functions/gps-services/gpsValidator.mjs";

describe("HU8 - gpsValidator", () => {
  test("debe aceptar proveedor GPSControl.pe como GPSCONTROL", () => {
    expect(normalizeProvider("GPSControl.pe")).toBe("GPSCONTROL");
  });

  test("debe aceptar proveedor GlobalGPSPeru.com como GLOBALGPS", () => {
    expect(normalizeProvider("GlobalGPSPeru.com")).toBe("GLOBALGPS");
  });

  test("debe rechazar proveedor GPS inválido", () => {
    expect(() => normalizeProvider("ProveedorX")).toThrow(
      "Proveedor GPS inválido"
    );
  });

  test("debe aceptar archivo CSV", () => {
    expect(() => assertCsvFilename("datos_gps.csv")).not.toThrow();
  });

  test("debe rechazar archivo que no sea CSV", () => {
    expect(() => assertCsvFilename("datos_gps.xlsx")).toThrow(
      "Solo se permiten archivos CSV"
    );
  });

  test("debe validar CSV correcto de GPSCONTROL", () => {
    const csv =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
      "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,60,180,1000.50";

    const result = validateCsvContent(csv, "GPSCONTROL");

    expect(result.valid).toBe(true);
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    expect(result.validRows[0].placa).toBe("ABC-123");
    expect(result.validRows[0].estado).toBe("MOVIENDO");
  });

  test("debe detectar columna faltante distancia_total", () => {
    const csv =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo\n" +
      "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,60,180";

    const result = validateCsvContent(csv, "GPSCONTROL");

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.field === "distancia_total")).toBe(
      true
    );
  });

  test("debe rechazar latitud fuera de rango", () => {
    const csv =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
      "2026-05-01,08:00:00,ABC-123,999,-77.0428,60,180,1000.50";

    const result = validateCsvContent(csv, "GPSCONTROL");

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.field === "latitud")).toBe(true);
  });

  test("debe rechazar longitud fuera de rango", () => {
    const csv =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
      "2026-05-01,08:00:00,ABC-123,-12.0464,-999,60,180,1000.50";

    const result = validateCsvContent(csv, "GPSCONTROL");

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.field === "longitud")).toBe(true);
  });

  test("debe rechazar velocidad negativa", () => {
    const csv =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
      "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,-10,180,1000.50";

    const result = validateCsvContent(csv, "GPSCONTROL");

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.field === "velocidad")).toBe(true);
  });

  test("debe marcar exceso de velocidad cuando supera el límite", () => {
    const csv =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
      "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,95,180,1000.50";

    const result = validateCsvContent(csv, "GPSCONTROL");

    expect(result.valid).toBe(true);
    expect(result.validRows[0].estado).toBe("EXCESO_VELOCIDAD");
  });

  test("debe marcar detenido cuando velocidad es menor o igual a 5 km/h", () => {
    const csv =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
      "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,5,180,1000.50";

    const result = validateCsvContent(csv, "GPSCONTROL");

    expect(result.valid).toBe(true);
    expect(result.validRows[0].estado).toBe("DETENIDO");
  });
});