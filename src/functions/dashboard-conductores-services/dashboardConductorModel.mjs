// Modelo de respuesta para cada conductor del dashboard
export class DashboardConductor {
  constructor(
    id,
    nombre,
    licencia,
    estadoOperacional,
    camionAsignado,
    estado
  ) {
    this.id = id;
    this.nombre = nombre;
    this.licencia = licencia;
    this.estadoOperacional = estadoOperacional;
    this.camionAsignado = camionAsignado;
    this.estado = estado;
  }


  // Convierte una fila de la base de datos al modelo usado por el frontend
  static fromDatabase(row) {
    return new DashboardConductor(
      row.id,
      row.nombre,
      row.licencia,
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