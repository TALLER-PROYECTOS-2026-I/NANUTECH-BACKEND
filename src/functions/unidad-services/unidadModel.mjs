export class Unidad {
  constructor(id, placa, marca, modelo, anio, capacidad_ton, estado, activo) {
    this.id = id;
    this.placa = placa;
    this.marca = marca;
    this.modelo = modelo;
    this.anio = anio;
    this.capacidad_ton = capacidad_ton;
    this.estado = estado;
    this.activo = activo;
  }

  static fromDatabase(row) {
    return new Unidad(
      row.id,
      row.placa,
      row.marca,
      row.modelo,
      row.anio,
      row.capacidad_ton,
      row.estado,
      row.activo
    );
  }

  static fromDatabaseList(rows) {
    return rows.map((row) => Unidad.fromDatabase(row));
  }
}
