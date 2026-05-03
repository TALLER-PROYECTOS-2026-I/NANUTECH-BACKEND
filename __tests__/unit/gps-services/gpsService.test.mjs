import { GpsService } from "../../../src/functions/gps-services/gpsService.mjs";

describe("HU8 - gpsService", () => {
  test("debe listar proveedores GPS soportados", () => {
    const service = new GpsService();

    const providers = service.getProviders();

    expect(providers).toHaveLength(2);
    expect(providers.map((provider) => provider.proveedor)).toContain(
      "GPSCONTROL"
    );
    expect(providers.map((provider) => provider.proveedor)).toContain(
      "GLOBALGPS"
    );
  });

  test("debe generar plantilla GPSCONTROL con 8 columnas requeridas", () => {
    const service = new GpsService();

    const template = service.getTemplate("GPSCONTROL");

    expect(template.proveedor).toBe("GPSCONTROL");
    expect(template.filename).toBe("gpscontrol_plantilla_gps.csv");
    expect(template.encabezados).toEqual([
      "fecha",
      "hora",
      "placa",
      "latitud",
      "longitud",
      "velocidad",
      "rumbo",
      "distancia_total",
    ]);
    expect(template.csv).toContain(
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total"
    );
  });

  test("debe generar plantilla GLOBALGPS con encabezados del proveedor", () => {
    const service = new GpsService();

    const template = service.getTemplate("GLOBALGPS");

    expect(template.proveedor).toBe("GLOBALGPS");
    expect(template.filename).toBe("globalgps_plantilla_gps.csv");
    expect(template.encabezados).toEqual([
      "event_date",
      "event_time",
      "vehicle_plate",
      "latitude",
      "longitude",
      "speed",
      "heading",
      "mileage",
    ]);
    expect(template.csv).toContain(
      "event_date,event_time,vehicle_plate,latitude,longitude,speed,heading,mileage"
    );
  });

  test("debe validar CSV correcto y habilitar importación", () => {
    const service = new GpsService();

    const csv =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n" +
      "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,60,180,1000.50";

    const result = service.validateCsv({
      proveedor: "GPSCONTROL",
      nombreArchivo: "gps.csv",
      csvContent: csv,
    });

    expect(result.importacion_habilitada).toBe(true);
    expect(result.total_filas).toBe(1);
    expect(result.filas_validas).toBe(1);
    expect(result.errores).toHaveLength(0);
  });

  test("debe validar CSV con error y deshabilitar importación", () => {
    const service = new GpsService();

    const csv =
      "fecha,hora,placa,latitud,longitud,velocidad,rumbo\n" +
      "2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,60,180";

    const result = service.validateCsv({
      proveedor: "GPSCONTROL",
      nombreArchivo: "gps.csv",
      csvContent: csv,
    });

    expect(result.importacion_habilitada).toBe(false);
    expect(result.total_filas).toBe(1);
    expect(result.errores.length).toBeGreaterThan(0);
  });
});