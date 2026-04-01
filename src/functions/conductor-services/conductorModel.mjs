export class Conductor {
  constructor(id, nombre, dni, licencia, telefono, estado) {
    this.id = id;
    this.nombre = nombre;
    this.dni = dni;
    this.licencia = licencia;
    this.telefono = telefono;
    this.estado = estado;
  }

  static fromDatabase(row) {
    return new Conductor(
      row.id,
      row.nombre,
      row.dni,
      row.licencia,
      row.telefono,
      row.estado
    );
  }

  static fromDatabaseList(rows) {
    return rows.map((row) => Conductor.fromDatabase(row));
  }
}
