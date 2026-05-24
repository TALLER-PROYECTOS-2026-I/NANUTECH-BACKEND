// conductorController.mjs

import { ConductorService } from "./conductorService.mjs";

// Servicio de autenticación
import {
  getCurrentSession
} from "../auth-services/authService.mjs";

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
 * Controller encargado de obtener todos los conductores activos.
 */
export const getAllConductoresController =
  async (event) => {

    try {

      /**
       * VALIDACIÓN JWT
       */

      const authorizationHeader =
        event.headers?.Authorization ||
        event.headers?.authorization;

      // Valida token y obtiene sesión
      const session =
        await getCurrentSession(
          authorizationHeader
        );

      /**
       * VALIDACIÓN DE ROLES
       *
       * Solo ADMIN puede acceder
       */
      if (session.role !== "admin") {

        return errorResponse(
          "Acceso denegado",
          403
        );
      }

      /**
       * LÓGICA PRINCIPAL
       */

      const conductorService =
        new ConductorService();

      const conductores =
        await conductorService
          .getAllActiveConductores();

      return successResponse(
        conductores,
        SUCCESS_MESSAGES
          .CONDUCTORES_RETRIEVED
      );

    } catch (error) {

      console.error(
        "Error en getAllConductoresController:",
        error
      );

      return errorResponse(
        "Error interno del servidor",
        500
      );
    }
  };

/**
 * Controller encargado de obtener estadísticas del conductor.
 */
export const getConductorStatisticsController =
  async (event) => {

    try {

      /**
       * VALIDACIÓN JWT
       */

      const authorizationHeader =
        event.headers?.Authorization ||
        event.headers?.authorization;

      // Valida token y obtiene sesión
      const session =
        await getCurrentSession(
          authorizationHeader
        );

      /**
       * VALIDACIÓN DE ROLES
       *
       * Solo ADMIN puede acceder
       */
      if (session.role !== "admin") {

        return errorResponse(
          "Acceso denegado",
          403
        );
      }

      /**
       * OBTENER ID
       */

      const { id } =
        event.pathParameters;

      /**
       * VALIDACIÓN UUID
       */

      const uuidRegex =
        /^[0-9a-fA-F-]{36}$/;

      if (!uuidRegex.test(id)) {

        return errorResponse(
          "ID inválido",
          400
        );
      }

      /**
       * LÓGICA PRINCIPAL
       */

      const conductorService =
        new ConductorService();

      const statistics =
        await conductorService
          .getConductorStatistics(id);

      return successResponse(
        statistics,
        SUCCESS_MESSAGES
          .CONDUCTOR_STATISTICS_RETRIEVED
      );

    } catch (error) {

      console.error(
        "Error getConductorStatisticsController:",
        error
      );

      return errorResponse(
        "Error interno del servidor",
        500
      );
    }
  };