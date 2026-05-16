// Repository encargado de consultas a BD
import { ConductorRepository } from "./conductorRepository.mjs";

// Modelo de entidad Conductor
import { Conductor } from "./conductorModel.mjs";

/**
 * Service encargado de manejar la lógica de negocio relacionada a conductores.
 *
 * Flujo:
 * Controller -> Service -> Repository
 */
export class ConductorService {

  /**
   * Constructor del service.
   *
   * Inicializa el repository utilizado para consultas a base de datos.
   */
  constructor() {

    this.conductorRepository =
      new ConductorRepository();
  }


  /**
   * Obtiene todos los conductores activos.
   *
   * Flujo:
   * - Consulta datos desde repository
   * - Convierte resultados usando el modelo
   * - Retorna lista estructurada
   */
  async getAllActiveConductores() {

    // Obtiene filas desde BD
    const rows =
      await this.conductorRepository
        .getAllActive();

    // Convierte filas en objetos Conductor
    return Conductor.fromDatabaseList(rows);
  }


  /**
   * Realiza redondeo aritmético simple a un decimal.
   *
   * Ejemplos:
   * 12.44 -> 12.4
   * 12.45 -> 12.5
   * 12.46 -> 12.5
   *
   * Utilizado para:
   * - horas totales
   * - promedios de jornada
   */
  roundToOneDecimal(value) {

    return Number(
      Number(value).toFixed(1)
    );
  }

  /**
   * Obtiene estadísticas agregadas de un conductor específico.
   *
   * Funcionalidades:
   * - Total de jornadas
   * - Jornadas completadas
   * - Jornadas activas
   * - Horas totales trabajadas
   * - Promedio de horas por jornada
   * - Estado actual
   */
  async getConductorStatistics(conductorId) {

    // Obtiene estadísticas desde repository
    const statistics =
      await this.conductorRepository
        .getConductorStatistics(conductorId);

    /**
     * Validación:
     * si no existe el conductor se lanza excepción
     */
    if (!statistics) {

      throw new Error(
        "Conductor no encontrado"
      );
    }

    /**
     * Retorna objeto formateado para respuesta de API
     */
    return {

      // UUID del conductor
      conductor_id: statistics.id,

      // Nombre completo
      conductor_nombre:
        `${statistics.nombres} ${statistics.apellidos}`,

      // Total de jornadas registradas
      total_jornadas:
        Number(statistics.total_jornadas),

      // Jornadas finalizadas
      jornadas_completadas:
        Number(statistics.jornadas_completadas),

      // Jornadas actualmente activas
      jornadas_activas:
        Number(statistics.jornadas_activas),

      /**
       * Horas totales trabajadas redondeadas a 1 decimal
       */
      horas_totales_trabajadas:
        this.roundToOneDecimal(
          statistics.horas_totales
        ),

      /**
       * Promedio de horas por jornada completada redondeado a 1 decimal
       */
      promedio_horas_por_jornada:
        this.roundToOneDecimal(
          statistics.promedio_horas
        ),

      // Estado operativo actual
      estado_actual:
        statistics.estado_actual,
    };
  }
}