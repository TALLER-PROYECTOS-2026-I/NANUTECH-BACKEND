export class Contrato {
  constructor(id, codigo, cliente, descripcion, fecha_inicio, fecha_fin, tarifa, moneda, estado, activo) {
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
      row.activo
    );
  }

  static fromDatabaseList(rows) {
    return rows.map((row) => Contrato.fromDatabase(row));
  }
}
