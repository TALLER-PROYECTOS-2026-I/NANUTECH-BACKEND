// conductorController.mjs

import { ConductorService } from "./conductorService.mjs";

// Servicio de autenticación
import { getCurrentSession } from "../auth-services/authService.mjs";

// Utilidades para respuestas HTTP
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";

// Mensajes constantes
import { SUCCESS_MESSAGES } from "../../shared/constants/successMessages.mjs";

/**
 * Controller encargado de obtener todos los conductores activos.
 */
export const getAllConductoresController = async (event) => {
  try {
    /**
     * VALIDACIÓN JWT
     */

    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;

    // Valida token y obtiene sesión
    const session = await getCurrentSession(authorizationHeader);

    /**
     * VALIDACIÓN DE ROLES
     *
     * Solo ADMIN puede acceder
     */
    if (session.role !== "admin") {
      return errorResponse("Acceso denegado", 403);
    }

    /**
     * LÓGICA PRINCIPAL
     */

    const conductorService = new ConductorService();

    const conductores = await conductorService.getAllActiveConductores();

    return successResponse(conductores, SUCCESS_MESSAGES.CONDUCTORES_RETRIEVED);
  } catch (error) {
    console.error("Error en getAllConductoresController:", error);

    return errorResponse("Error interno del servidor", 500);
  }
};

/**
 * Controller encargado de obtener estadísticas del conductor.
 */
export const getConductorStatisticsController = async (event) => {
  try {
    /**
     * VALIDACIÓN JWT
     */

    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;

    // Valida token y obtiene sesión
    const session = await getCurrentSession(authorizationHeader);

    /**
     * VALIDACIÓN DE ROLES
     *
     * Solo ADMIN puede acceder
     */
    if (session.role !== "admin") {
      return errorResponse("Acceso denegado", 403);
    }

    /**
     * OBTENER ID
     */

    const { id } = event.pathParameters;

    /**
     * VALIDACIÓN UUID
     */

    const uuidRegex = /^[0-9a-fA-F-]{36}$/;

    if (!uuidRegex.test(id)) {
      return errorResponse("ID inválido", 400);
    }

    /**
     * LÓGICA PRINCIPAL
     */

    const conductorService = new ConductorService();

    const statistics = await conductorService.getConductorStatistics(id);

    return successResponse(statistics, SUCCESS_MESSAGES.CONDUCTOR_STATISTICS_RETRIEVED);
  } catch (error) {
    console.error("Error getConductorStatisticsController:", error);

    return errorResponse("Error interno del servidor", 500);
  }
};

/**
 * Controller encargado de registrar un nuevo conductor.
 * HU22 - Registro de Nuevo Conductor
 */
export const crearConductorController = async (event) => {
  try {
    /**
     * Obtiene token enviado
     * en el header Authorization.
     */
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;

    /**
     * Valida sesión del usuario
     * autenticado mediante Cognito.
     */
    const session = await getCurrentSession(authorizationHeader);

    /**
     * Solo Administradores Generales
     * pueden registrar conductores.
     */
    if (session.role !== "admin" && session.role !== "ADMIN") {
      return errorResponse("Acceso denegado", 403);
    }

    /**
     * Obtiene información enviada
     * desde el formulario de registro.
     */
    const body = JSON.parse(event.body || "{}");

    /**
     * Instancia la capa de servicio
     * encargada de la lógica de negocio.
     */
    const conductorService = new ConductorService();

    /**
     * Registra conductor.
     *
     * Flujo:
     * - Validaciones
     * - Verificación de duplicados
     * - Registro en PostgreSQL
     * - Creación de credenciales Cognito
     * - Rollback automático si ocurre error
     */
    const conductor = await conductorService.registrarNuevoConductor(body);

    /**
     * Retorna respuesta exitosa.
     */
    return successResponse(conductor, "¡Conductor registrado exitosamente!", 201);
  } catch (error) {
    console.error("Error en crearConductorController:", error);

    /**
     * Retorna mensaje controlado
     */
    return errorResponse(
      error.statusCode
        ? error.message
        : "Error en la creación de credenciales. Registro no guardado. Intente nuevamente",
      error.statusCode || 500
    );
  }
};
