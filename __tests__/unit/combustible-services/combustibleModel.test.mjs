const { CombustibleRegistro } = await import(
  "../../../src/functions/combustible-services/combustibleModel.mjs"
);

describe("CombustibleRegistro Model", () => {
  const baseRow = {
    id: "fuel-1",
    jornada_id: "cccc0003-0000-0000-0000-000000000003",
    unidad_id: "aaaa0001-0000-0000-0000-000000000001",
    conductor_id: "22222222-2222-2222-2222-222222222222",
    contrato_id: "bbbb0001-0000-0000-0000-000000000001",
    tipo_comprobante: "TICKET",
    numero_comprobante: "TK-001",
    galones: "10.50",
    costo_total: "180.00",
    kilometraje_actual: "1350.00",
    kilometraje_anterior: "1000.00",
    rendimiento_km_galon: "33.33",
    foto_comprobante_url: "https://demo.com/foto.jpg",
    observaciones: "Registro de prueba",
    latitud: "-16.4014000",
    longitud: "-71.5343000",
    estado: "SINCRONIZADO",
    sincronizado: true,
    registrado_at: "2026-05-29T10:00:00.000Z",
    created_at: "2026-05-29T10:00:00.000Z",
  };

  test("fromDatabase mapea fila correctamente", () => {
    const model = CombustibleRegistro.fromDatabase(baseRow);

    expect(model.id).toBe("fuel-1");
    expect(model.galones).toBe(10.5);
    expect(model.costo_total).toBe(180);
    expect(model.kilometraje_actual).toBe(1350);
    expect(model.kilometraje_anterior).toBe(1000);
    expect(model.rendimiento_km_galon).toBe(33.33);
    expect(model.latitud).toBe(-16.4014);
    expect(model.longitud).toBe(-71.5343);
  });

  test("fromDatabase soporta rendimiento, latitud y longitud null", () => {
    const model = CombustibleRegistro.fromDatabase({
      ...baseRow,
      rendimiento_km_galon: null,
      latitud: null,
      longitud: null,
    });

    expect(model.rendimiento_km_galon).toBeNull();
    expect(model.latitud).toBeNull();
    expect(model.longitud).toBeNull();
  });

  test("fromDatabase retorna null si row es null", () => {
    expect(CombustibleRegistro.fromDatabase(null)).toBeNull();
  });

  test("fromDatabaseList retorna lista de modelos", () => {
    const result = CombustibleRegistro.fromDatabaseList([baseRow]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("fuel-1");
  });

  test("fromDatabaseList retorna lista vacía si no recibe array", () => {
    expect(CombustibleRegistro.fromDatabaseList(null)).toEqual([]);
  });

  test("toJSON retorna objeto plano", () => {
    const model = new CombustibleRegistro(baseRow);

    expect(model.toJSON()).toEqual(
      expect.objectContaining({
        id: "fuel-1",
        galones: 10.5,
        rendimiento_km_galon: 33.33,
      })
    );
  });
});