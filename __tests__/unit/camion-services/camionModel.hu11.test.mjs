import { Camion } from "../../../src/functions/camion-services/camionModel.mjs";

describe("HU11 - CamionModel", () => {
  const row = {
    id: "unidad-001",
    placa: "ABC-123",
    marca: "Volvo",
    modelo: "FH16",
    anio: 2024,
    capacidad_ton: "20",
    estado: "DISPONIBLE",
    gps_habilitado: true,
    vin: "VINABC123",
    color: "Blanco",
    tipo_combustible: "DIESEL",
    kilometraje_actual: "1500",
    fecha_registro: "2026-05-01",
    ultima_fecha_mantenimiento: null,
    proxima_fecha_mantenimiento: null,
    horas_movimiento: "5",
    horas_detenido: "2",
    horas_totales: "7",
    kilometros_totales: "1500",
    ultimo_gps_at: "2026-05-01T10:00:00.000Z",
    activo: true,
  };

  test("debe crear instancia y serializar a JSON", () => {
    const camion = new Camion(row);
    const json = camion.toJSON();

    expect(json.id).toBe("unidad-001");
    expect(json.placa).toBe("ABC-123");
    expect(json.estado).toBe("DISPONIBLE");
    expect(json.gps_habilitado).toBe(true);
    expect(json.capacidad_ton).toBe(20);
    expect(json.kilometraje_actual).toBe(1500);
    expect(json.horas_movimiento).toBe(5);
    expect(json.horas_detenido).toBe(2);
    expect(json.horas_totales).toBe(7);
  });

  test("fromDatabase debe retornar Camion", () => {
    const camion = Camion.fromDatabase(row);

    expect(camion).toBeInstanceOf(Camion);
    expect(camion.placa).toBe("ABC-123");
  });

  test("fromDatabase debe retornar null si no recibe fila", () => {
    expect(Camion.fromDatabase(null)).toBeNull();
  });

  test("fromDatabaseList debe mapear lista", () => {
    const result = Camion.fromDatabaseList([row, { ...row, id: "unidad-002" }]);

    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(Camion);
    expect(result[1].id).toBe("unidad-002");
  });

  test("debe usar valores por defecto", () => {
    const camion = new Camion({
      id: "unidad-003",
      placa: "DEF-456",
      marca: "Scania",
      modelo: "R500",
    });

    const json = camion.toJSON();

    expect(json.estado).toBe("DISPONIBLE");
    expect(json.gps_habilitado).toBe(false);
    expect(json.capacidad_ton).toBe(0);
    expect(json.kilometraje_actual).toBe(0);
    expect(json.horas_totales).toBe(0);
    expect(json.activo).toBe(true);
  });
});