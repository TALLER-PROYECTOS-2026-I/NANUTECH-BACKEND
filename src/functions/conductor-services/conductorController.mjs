// conductorController.mjs

import { ConductorService } from "./conductorService.mjs";

// Utilidades para respuestas HTTP
import {
  successResponse,
  errorResponse
} from "../../shared/utils/response/response.mjs";

// Mensajes constantes
import {
  SUCCESS_MESSAGES
} from "../../shared/constants/successMessages.mjs";

/**
 * Controller encargado de obtener
 * todos los conductores activos.
 */
export const getAllConductoresController =
  async (event) => {

    try {

      /**
       * LÓGICA PRINCIPAL
       */

      // Instancia del service
      const conductorService =
        new ConductorService();

      // Obtiene lista de conductores
      const conductores =
        await conductorService
          .getAllActiveConductores();

      // Respuesta HTTP exitosa
      return successResponse(
        conductores,
        SUCCESS_MESSAGES
          .CONDUCTORES_RETRIEVED
      );

    } catch (error) {

      // Log de errores
      console.error(
        "Error en getAllConductoresController:",
        error
      );

      /**
       * IMPORTANTE:
       * No exponer errores internos
       */
      return errorResponse(
        "Error interno del servidor",
        500
      );
    }
  };

/**
 * Controller encargado de obtener
 * estadísticas del conductor.
 */
export const getConductorStatisticsController =
  async (event) => {

    try {

      /**
       * OBTENER ID
       * desde pathParameters
       */

      const { id } =
        event.pathParameters;

      /**
       * VALIDACIÓN UUID
       */

      const uuidRegex =
        /^[0-9a-fA-F-]{36}$/;

      // Valida formato UUID
      if (!uuidRegex.test(id)) {

        return errorResponse(
          "ID inválido",
          400
        );
      }

      /**
       * LÓGICA PRINCIPAL
       */

      // Instancia del service
      const conductorService =
        new ConductorService();

      // Obtiene estadísticas
      const statistics =
        await conductorService
          .getConductorStatistics(id);

      // Respuesta HTTP exitosa
      return successResponse(
        statistics,
        SUCCESS_MESSAGES
          .CONDUCTOR_STATISTICS_RETRIEVED
      );

    } catch (error) {

      // Log de errores
      console.error(
        "Error getConductorStatisticsController:",
        error
      );

      /**
       * IMPORTANTE:
       * No devolver detalles internos
       */
      return errorResponse(
        error.message,
        error.statusCode || 500
      );
    }
  };