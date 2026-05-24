// Modelo de respuesta para cada conductor del dashboard
export class DashboardConductor {
  constructor(
    id,
    nombre,
    licencia,
    estadoOperacional,
    camionAsignado,
    estado,
    datosSensibles = null
  ) {
    this.id = id;
    this.nombre = nombre;
    this.licencia = licencia;
    this.estadoOperacional = estadoOperacional;
    this.camionAsignado = camionAsignado;
    this.estado = estado;

    // SOLO ADMIN VE DATOS SENSIBLES
    if (datosSensibles) {
      this.email = datosSensibles.email;
      this.dni = datosSensibles.dni;
      this.contacto = datosSensibles.contacto;
    }
  }

  // Convierte una fila de la base de datos al modelo usado por el frontend
  static fromDatabase(row, incluirDatosSensibles = false) {
    return new DashboardConductor(
      row.id,
      row.nombre,
      row.licencia,
      row.estado_operacional,
      row.camion_asignado,
      row.estado,

      incluirDatosSensibles
        ? {
            email: row.email,
            dni: row.dni,
            contacto: row.contacto,
          }
        : null
    );
  }

  // Convierte una lista de filas de BD a una lista de conductores
  static fromDatabaseList(rows, incluirDatosSensibles = false) {
    return rows.map((row) => DashboardConductor.fromDatabase(row, incluirDatosSensibles));
  }
}
