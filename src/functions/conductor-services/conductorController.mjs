import { ConductorService } from "./conductorService.mjs";

// Utilidades para construir respuestas HTTP estandarizadas
import {
  successResponse,
  errorResponse
} from "../../shared/utils/response/response.mjs";

// Mensajes constantes de éxito utilizados en las respuestas
import {
  SUCCESS_MESSAGES
} from "../../shared/constants/successMessages.mjs";

/**
 * Controller encargado de obtener todos los conductores activos.
 *
 * Flujo:
 * Handler -> Controller -> Service -> Repository -> Base de datos
 */
export const getAllConductoresController = async (event) => {

  try {

    // Se instancia el servicio de conductores
    const conductorService = new ConductorService();

    // Obtiene la lista de conductores activos desde la capa service
    const conductores =
      await conductorService.getAllActiveConductores();

    // Retorna respuesta exitosa HTTP 200
    return successResponse(
      conductores,
      SUCCESS_MESSAGES.CONDUCTORES_RETRIEVED
    );

  } catch (error) {

    // Log de errores para debugging
    console.error(
      "Error en getAllConductoresController:",
      error
    );

    // Retorna respuesta HTTP de error
    return errorResponse(
      error.message,
      500
    );
  }
};

/**
 * Controller encargado de obtener las estadísticas
 * agregadas de un conductor específico.
 *
 * Endpoint:
 * GET /conductores/{id}/estadisticas
 *
 * Funcionalidades:
 * - Total de jornadas
 * - Jornadas completadas
 * - Jornadas activas
 * - Horas totales trabajadas
 * - Promedio de horas por jornada
 * - Estado actual del conductor
 */
export const getConductorStatisticsController =
  async (event) => {

    try {

      // Obtiene el parámetro dinámico "id"
      // desde la URL del endpoint
      const { id } = event.pathParameters;

      // Instancia del servicio
      const conductorService =
        new ConductorService();

      // Obtiene estadísticas del conductor
      // desde la capa service
      const statistics =
        await conductorService
          .getConductorStatistics(id);

      // Retorna respuesta exitosa HTTP 200
      return successResponse(
        statistics,
        SUCCESS_MESSAGES
          .CONDUCTOR_STATISTICS_RETRIEVED
      );

    } catch (error) {

      // Log del error para debugging
      console.error(
        "Error getConductorStatisticsController:",
        error
      );

      // Retorna respuesta HTTP de error
      return errorResponse(
        error.message,
        500
      );
    }
  };