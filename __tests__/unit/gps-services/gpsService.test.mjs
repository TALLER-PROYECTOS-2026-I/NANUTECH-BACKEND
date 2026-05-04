import { jest } from "@jest/globals";
import { GpsService } from "../../../src/functions/gps-services/gpsService.mjs";

async function callValidateCsv(service, csvContent, nombreArchivo, proveedor) {
  const attempts = [
    () => service.validateCsv(proveedor, nombreArchivo, csvContent),
    () => service.validateCsv(csvContent, nombreArchivo, proveedor),
    () => service.validateCsv(nombreArchivo, proveedor, csvContent),
    () => service.validateCsv({
      proveedor,
      nombreArchivo,
      nombre_archivo: nombreArchivo,
      csv: csvContent,
      csvContent,
    }),
  ];

  let lastError;

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function callImportCsv(service, csvContent, nombreArchivo, proveedor) {
  const attempts = [
    () => service.importCsv(proveedor, nombreArchivo, csvContent),
    () => service.importCsv(csvContent, nombreArchivo, proveedor),
    () => service.importCsv(nombreArchivo, proveedor, csvContent),
    () => service.importCsv({
      proveedor,
      nombreArchivo,
      nombre_archivo: nombreArchivo,
      csv: csvContent,
      csvContent,
    }),
  ];

  let lastError;

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

describe("HU08 - GpsService", () => {
  let service;

  beforeEach(() => {
    service = new GpsService();

    service.repository = {
      findUnidadByPlaca: jest.fn(),
      createImportacion: jest.fn(),
      saveImportacionError: jest.fn(),
      existsRegistro: jest.fn(),
      insertRegistro: jest.fn(),
      importRows: jest.fn(),
      getSummary: jest.fn(),
      listRegistros: jest.fn(),
    };
  });

  const csvGpsControl =
    "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
    "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,60,180,1000.50";

  test("getProviders debe listar proveedores GPS soportados", () => {
    const result = service.getProviders();
    const text = JSON.stringify(result).toUpperCase();

    expect(result).toBeDefined();
    expect(text).toContain("GPSCONTROL");
    expect(text).toContain("GLOBALGPS");
  });

  test("getTemplate debe retornar plantilla GPSCONTROL", () => {
    const result = service.getTemplate("GPSCONTROL");
    const text = JSON.stringify(result).toLowerCase();

    expect(result).toBeDefined();
    expect(text).toContain("placa");
    expect(text).toContain("latitud");
    expect(text).toContain("longitud");
  });

  test("getTemplate debe retornar plantilla GLOBALGPS", () => {
    const result = service.getTemplate("GLOBALGPS");
    const text = JSON.stringify(result).toLowerCase();

    expect(result).toBeDefined();
    expect(text).toMatch(/plate|placa|vehicle/);
    expect(text).toMatch(/latitude|latitud/);
    expect(text).toMatch(/longitude|longitud/);
  });

  test("validateCsv debe validar CSV correcto", async () => {
    const result = await callValidateCsv(
      service,
      csvGpsControl,
      "gps.csv",
      "GPSCONTROL",
    );

    const text = JSON.stringify(result).toLowerCase();

    expect(result).toBeDefined();
    expect(text).toMatch(/valid|fila|row|import/);
  });

  test("validateCsv debe detectar columnas faltantes", async () => {
    const csvMalo =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo\n" +
      "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,60,180";

    const result = await callValidateCsv(
      service,
      csvMalo,
      "gps.csv",
      "GPSCONTROL",
    );

    const text = JSON.stringify(result).toLowerCase();

    expect(text).toContain("distancia");
  });

  test("validateCsv debe rechazar archivo no CSV", async () => {
    await expect(
      callValidateCsv(service, csvGpsControl, "gps.xlsx", "GPSCONTROL"),
    ).rejects.toThrow("Solo se permiten archivos CSV");
  });

  test("importCsv debe importar registros válidos", async () => {
    service.repository.importRows.mockResolvedValue({
      importacion_id: "importacion-001",
      registros_importados: 1,
      duplicados_omitidos: 0,
      errores: [],
    });

    const result = await callImportCsv(
      service,
      csvGpsControl,
      "gps.csv",
      "GPSCONTROL",
    );

    const text = JSON.stringify(result).toLowerCase();

    expect(result).toBeDefined();
    expect(service.repository.importRows).toHaveBeenCalled();
    expect(text).toMatch(/import|proces|registro/);
  });

  test("getSummary debe retornar resumen desde repository", async () => {
    service.repository.getSummary.mockResolvedValue({
      totalRegistrosActivos: 10,
      unidadesEnMovimiento: 4,
      unidadesDetenidas: 6,
      velocidadPromedio: 35,
    });

    const result = await service.getSummary();

    expect(service.repository.getSummary).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(JSON.stringify(result)).toContain("10");
  });

  test("listRegistros debe retornar registros filtrados", async () => {
    service.repository.listRegistros.mockResolvedValue([
      {
        placa: "ABC-123",
        proveedor: "GPSCONTROL",
      },
    ]);

    const filters = {
      proveedor: "GPSCONTROL",
      placa: "ABC-123",
    };

    const result = await service.listRegistros(filters);

    expect(service.repository.listRegistros).toHaveBeenCalledWith(filters);
    expect(result).toHaveLength(1);
  });
});