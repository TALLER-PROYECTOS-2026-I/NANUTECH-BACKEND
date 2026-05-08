export class Contrato {
  constructor(
    id,
    codigo,
    cliente,
    descripcion,
    fecha_inicio,
    fecha_fin,
    tarifa,
    moneda,
    estado,
    activo,
    ruc = null,
    tipo_servicio = null,
    origen = null,
    destino = null,
    distancia_estimada_km = null,
    tarifa_por_km = null,
    tarifa_por_hora = null,
    tarifa_espera = null,
    total_referencial = null
  ) {
    this.id = id;
    this.codigo = codigo;
    this.cliente = cliente;
    this.descripcion = descripcion;
    this.fecha_inicio = fecha_inicio;
    this.fecha_fin = fecha_fin;
    this.tarifa = tarifa;
    this.moneda = moneda;
    this.estado = estado;
    this.activo = activo;

    this.ruc = ruc;
    this.tipo_servicio = tipo_servicio;

    this.ruta = {
      origen,
      destino,
      distancia_estimada_km,
    };

    this.tarifas = {
      tarifa_por_km,
      tarifa_por_hora,
      tarifa_espera,
      total_referencial,
    };
  }

  static fromDatabase(row) {
    return new Contrato(
      row.id,
      row.codigo,
      row.cliente,
      row.descripcion,
      row.fecha_inicio,
      row.fecha_fin,
      row.tarifa,
      row.moneda,
      row.estado,
      row.activo,
      row.ruc,
      row.tipo_servicio,
      row.origen,
      row.destino,
      row.distancia_estimada_km,
      row.tarifa_por_km,
      row.tarifa_por_hora,
      row.tarifa_espera,
      row.total_referencial
    );
  }

  static fromDatabaseList(rows) {
    return rows.map((row) => Contrato.fromDatabase(row));
  }
}