export class Conductor {
  constructor(id, cognito_sub, correo, nombres, apellidos, rol, telefono, dni, activo, estado) {
    this.id = id;
    this.cognito_sub = cognito_sub;
    this.correo = correo;
    this.nombres = nombres;
    this.apellidos = apellidos;
    this.rol = rol;
    this.telefono = telefono;
    this.dni = dni;
    this.activo = activo;
    this.estado = estado;
  }

  static fromDatabase(row) {
    return new Conductor(
      row.id,
      row.cognito_sub,
      row.correo,
      row.nombres,
      row.apellidos,
      row.rol,
      row.telefono,
      row.dni,
      row.activo,
      row.estado
    );
  }

  static fromDatabaseList(rows) {
    return rows.map((row) => Conductor.fromDatabase(row));
  }
}
