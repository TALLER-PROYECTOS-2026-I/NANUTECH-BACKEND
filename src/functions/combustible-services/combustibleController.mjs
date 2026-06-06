import { CombustibleService } from "./combustibleService.mjs";
import { getCurrentSession } from "../auth-services/authService.mjs";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/response/response.mjs";


/**
 * Obtiene el header Authorization desde API Gateway.
 *
 * Se consideran distintas variantes porque API Gateway y algunos clientes
 * pueden enviar el header con diferente capitalización.

 */

function getAuthorizationHeader(event) {
  return (
    event.headers?.Authorization ||
    event.headers?.authorization ||
    event.headers?.AUTHORIZATION
  );
}


/**
 * Convierte el body HTTP en objeto JSON.
 *
 * Si el body está vacío retorna objeto vacío.
 * Si el JSON está mal formado, lanza un error controlado para evitar
 * que el sistema exponga detalles internos.
 */

function parseJsonBody(event) {
  if (!event.body) return {};

  try {
    return JSON.parse(event.body);
  } catch (_) {
    const error = new Error("JSON inválido.");
    error.statusCode = 400;
    error.code = "INVALID_JSON";
    throw error;
  }
}

/**
 * Convierte errores del módulo en una respuesta HTTP estándar.
 *
 * Esto evita exponer stack traces o errores SQL directamente al cliente,
 * ayudando a cumplir buenas prácticas de seguridad y OWASP.
 */

function resolveErrorResponse(error) {
  return errorResponse(error.message || "Error interno del servidor", error.statusCode || 500, {
    code: error.code || "INTERNAL_ERROR",
  });
}


/**
 * Controller para registrar abastecimiento de combustible.
 *
 * Flujo:
 * 1. Valida sesión mediante token Bearer.
 * 2. Parsea el body JSON.
 * 3. Delega reglas de negocio al servicio.
 * 4. Retorna mensaje de éxito con rendimiento calculado.
 */

export const registrarCombustibleController = async (event) => {
  try {
    const authorization = getAuthorizationHeader(event);
    await getCurrentSession(authorization);

    const body = parseJsonBody(event);

    const service = new CombustibleService();
    const result = await service.registrarCombustible(body);

    return successResponse(
      result,
      "¡Combustible registrado exitosamente! Rendimiento calculado: " +
        `${Number(result.rendimiento_km_galon).toFixed(1)} km/gal`
    );
  } catch (error) {
    console.error("Error en registrarCombustibleController:", error);
    return resolveErrorResponse(error);
  }
};


/**
 * Controller para obtener el último kilometraje registrado de una unidad.
 *
 * Este endpoint sirve para que la app valide que el nuevo odómetro sea
 * estrictamente mayor al último registro del camión.
 */

export const getUltimoKmController = async (event) => {
  try {
    const authorization = getAuthorizationHeader(event);
    await getCurrentSession(authorization);

    const unidadId = event.pathParameters?.unidadId;

    const service = new CombustibleService();
    const result = await service.getUltimoKilometraje(unidadId);

    return successResponse(
      result,
      "Último kilometraje obtenido exitosamente."
    );
  } catch (error) {
    console.error("Error en getUltimoKmController:", error);
    return resolveErrorResponse(error);
  }
};


/**
 * Controller para listar registros de combustible por jornada.
 *
 * Permite consultar todos los abastecimientos asociados a una jornada
 * específica del chofer.
 */

export const getCombustibleByJornadaController = async (event) => {
  try {
    const authorization = getAuthorizationHeader(event);
    await getCurrentSession(authorization);

    const jornadaId = event.pathParameters?.jornadaId;

    const service = new CombustibleService();
    const result = await service.getRegistrosPorJornada(jornadaId);

    return successResponse(
      result,
      "Registros de combustible obtenidos exitosamente."
    );
  } catch (error) {
    console.error("Error en getCombustibleByJornadaController:", error);
    return resolveErrorResponse(error);
  }
};
