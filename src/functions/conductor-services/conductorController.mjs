// conductorController.mjs

import { ConductorService } from "./conductorService.mjs";

// Servicio de autenticación
import { getCurrentSession } from "../auth-services/authService.mjs";

// Utilidades para respuestas HTTP
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";

// Mensajes constantes
import { SUCCESS_MESSAGES } from "../../shared/constants/successMessages.mjs";

import { LicenciaValidator } from "../../shared/utils/validators/licenciaValidator.mjs";

/**
 * Controller encargado de obtener todos los conductores activos.
 */
export const getAllConductoresController = async (event) => {
  try {
    /**
     * VALIDACIÓN JWT
     */
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

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

    return errorResponse(error.message, error.statusCode || 500);
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
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

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

    return errorResponse(error.message, error.statusCode || 500);
  }
};

/**
 * =====================================================
 * HU18
 * Actualizar licencia de conductor
 *
 * Acceso permitido:
 * - CHOFER: actualiza su propia licencia
 *           (conductorId tomado de session.user.id)
 * - ADMIN:  puede actualizar licencia de cualquier
 *           conductor (debe enviar conductorId en body)
 * =====================================================
 */
export const updateLicenciaController = async (event) => {
  try {
    /**
     * VALIDACIÓN JWT
     */
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

    const session = await getCurrentSession(authorizationHeader);

    /**
     * VALIDACIÓN DE ROLES
     *
     * Chofer: actualiza su propia licencia
     * Admin: puede actualizar la de cualquier conductor
     */
    if (session.role !== "chofer" && session.role !== "admin") {
      return errorResponse("Acceso denegado", 403);
    }

    /**
     * BODY REQUEST
     */
    const body = JSON.parse(event.body || "{}");

    /**
     * VALIDACIÓN HU18
     */
    const licenciaData = LicenciaValidator.validateUpdateLicencia(body);

    /**
     * DETERMINAR conductorId
     *
     * - Admin: debe enviar conductorId en el body
     * - Chofer: se obtiene desde session.user.id
     */
    const conductorId =
      session.role === "admin"
        ? body.conductorId
        : session.user?.id;

    if (!conductorId) {
      return errorResponse(
        session.role === "admin"
          ? "El campo conductorId es requerido para administradores"
          : "No se pudo obtener el ID del conductor desde la sesión",
        400
      );
    }

    /**
     * SERVICE
     */
    const conductorService = new ConductorService();

    const result = await conductorService.updateLicencia(conductorId, licenciaData);

    return successResponse(result, SUCCESS_MESSAGES.LICENCIA_UPDATED);
  } catch (error) {
    console.error("Error updateLicenciaController:", error);

    return errorResponse(error.message, error.statusCode || 400);
  }
};

/**
 * =========================================================
 * HU18
 * Obtiene detalle completo del conductor.
 *
 * Incluye:
 * - Datos personales
 * - Licencia activa
 * - Contacto de emergencia principal
 * =========================================================
 */
export const getConductorDetailController = async (event) => {
  try {
    /**
     * VALIDACIÓN JWT
     */
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

    const session = await getCurrentSession(authorizationHeader);

    /**
     * Solo ADMIN
     */
    if (session.role !== "admin") {
      return errorResponse("Acceso denegado", 403);
    }

    /**
     * HU18
     * Validación de UUID
     */
    const { id } = event.pathParameters;

    LicenciaValidator.validateConductorId(id);

    /**
     * Service
     */
    const conductorService = new ConductorService();

    const conductor = await conductorService.getConductorDetail(id);

    return successResponse(conductor, SUCCESS_MESSAGES.CONDUCTOR_DETAIL_RETRIEVED);
  } catch (error) {
    console.error("Error getConductorDetailController:", error);

    return errorResponse(error.message, error.statusCode || 500);
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
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

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
