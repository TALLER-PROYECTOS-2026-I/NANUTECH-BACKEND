export class Contrato {
  constructor(id, codigo, empresa, tipo_servicio, tarifa, moneda, fecha_inicio, fecha_fin, estado, descripcion) {
    this.id = id;
    this.codigo = codigo;
    this.empresa = empresa;
    this.tipo_servicio = tipo_servicio;
    this.tarifa = tarifa;
    this.moneda = moneda;
    this.fecha_inicio = fecha_inicio;
    this.fecha_fin = fecha_fin;
    this.estado = estado;
    this.descripcion = descripcion;
  }

  static fromDatabase(row) {
    return new Contrato(
      row.id,
      row.codigo,
      row.empresa,
      row.tipo_servicio,
      row.tarifa,
      row.moneda,
      row.fecha_inicio,
      row.fecha_fin,
      row.estado,
      row.descripcion
    );
  }

  static fromDatabaseList(rows) {
    return rows.map((row) => Contrato.fromDatabase(row));
  }
}
