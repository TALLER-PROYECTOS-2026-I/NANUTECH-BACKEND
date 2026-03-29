export class Camion {
  constructor(id, placa, marca, modelo, estado = "activo") {
    this.id = id;
    this.placa = placa;
    this.marca = marca;
    this.modelo = modelo;
    this.estado = estado;
  }

  toJSON() {
    return {
      id: this.id,
      placa: this.placa,
      marca: this.marca,
      modelo: this.modelo,
      estado: this.estado,
    };
  }

  static fromDatabase(item) {
    if (!item) return null;
    return new Camion(
      item.id,
      item.placa,
      item.marca,
      item.modelo,
      item.estado,
    );
  }

  static fromDatabaseList(items) {
    return items.map((item) => this.fromDatabase(item));
  }
}
