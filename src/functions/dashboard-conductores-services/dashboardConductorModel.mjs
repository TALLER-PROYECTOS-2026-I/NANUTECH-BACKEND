// Modelo de respuesta para cada conductor del dashboard
export class DashboardConductor {
  constructor(
    id,
    nombre,
    email,
    dni,
    licencia,
    contacto,
    estadoOperacional,
    camionAsignado,
    estado
  ) {
    this.id = id;
    this.nombre = nombre;
    this.email = email;
    this.dni = dni;
    this.licencia = licencia;
    this.contacto = contacto;
    this.estadoOperacional = estadoOperacional;
    this.camionAsignado = camionAsignado;
    this.estado = estado;
  }


  // Convierte una fila de la base de datos al modelo usado por el frontend
  static fromDatabase(row) {
    return new DashboardConductor(
      row.id,
      row.nombre,
      row.email,
      row.dni,
      row.licencia,
      row.contacto,
      row.estado_operacional,
      row.camion_asignado,
      row.estado
    );
  }

  // Convierte una lista de filas de BD a una lista de conductores
  static fromDatabaseList(rows) {
    return rows.map((row) => DashboardConductor.fromDatabase(row));
  }
}