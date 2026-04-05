export class Unidad {
  constructor(id, placa, marca, modelo, estado) {
    this.id = id;
    this.placa = placa;
    this.marca = marca;
    this.modelo = modelo;
    this.estado = estado;
  }

  static fromDatabase(row) {
    return new Unidad(
      row.id,
      row.placa,
      row.marca,
      row.modelo,
      row.estado
    );
  }

  static fromDatabaseList(rows) {
    return rows.map((row) => Unidad.fromDatabase(row));
  }
}
