/**
 * Modelo de entidad Conductor.
 *
 * Representa la estructura de datos utilizada para manejar conductores dentro de la aplicación.
 */
export class Conductor {

  /**
   * Constructor principal de la entidad.
   *
   * Inicializa las propiedades del conductor.
   */
  constructor(
    id,
    cognito_sub,
    correo,
    nombres,
    apellidos,
    rol,
    telefono,
    dni,
    activo,
    estado
  ) {

    this.id = id;

    // ID de usuario en AWS Cognito
    this.cognito_sub = cognito_sub;

    this.correo = correo;

    this.nombres = nombres;

    this.apellidos = apellidos;

    this.rol = rol;

    this.telefono = telefono;

    this.dni = dni;

    // Indica si el conductor está activo
    this.activo = activo;

    // Estado actual del conductor
    this.estado = estado;
  }

  /**
   * Convierte una fila obtenida desde la BD en una instancia de la clase Conductor.
   */
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

  /**
   * Convierte una lista de filas provenientes de la BD en una lista de objetos Conductor.
   */
  static fromDatabaseList(rows) {

    return rows.map(
      (row) => Conductor.fromDatabase(row)
    );
  }

  /**
   * Convierte el resultado de la query
   * de estadísticas del conductor
   * en un objeto estructurado para la API.
   *
   * Funcionalidades:
   * - Total de jornadas
   * - Jornadas completadas
   * - Jornadas activas
   * - Horas trabajadas
   * - Promedio de horas
   * - Estado actual
   */
  static statisticsFromDatabase(row) {

    return {

      // UUID del conductor
      conductor_id: row.id,

      // Nombre completo del conductor
      conductor_nombre:
        `${row.nombres} ${row.apellidos}`,

      // Cantidad total de jornadas
      total_jornadas:
        Number(row.total_jornadas),

      // Jornadas finalizadas correctamente
      jornadas_completadas:
        Number(row.jornadas_completadas),

      // Jornadas actualmente en proceso
      jornadas_activas:
        Number(row.jornadas_activas),

      // Horas totales trabajadas
      horas_totales_trabajadas:
        Number(row.horas_totales),

      // Promedio de horas por jornada
      promedio_horas_por_jornada:
        Number(row.promedio_horas),

      // Estado actual calculado del conductor
      estado_actual:
        row.estado_actual,
    };
  }
}