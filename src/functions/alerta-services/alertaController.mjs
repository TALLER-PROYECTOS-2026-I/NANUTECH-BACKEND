import { AlertaService } from "./alertaService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";
import { getCurrentSession } from "../auth-services/authService.mjs";

/**
 * Parsea el body del evento Lambda como JSON.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @returns {Object} Objeto parseado o vacío si no hay body
 * @throws {Error} Con statusCode 400 si el body no es JSON válido
 */
function parseJsonBody(event) {
  if (!event.body) return {};

  try {
    return JSON.parse(event.body);
  } catch {
    const error = new Error("El cuerpo de la solicitud no es un JSON válido.");
    error.statusCode = 400;
    error.code = "INVALID_REQUEST_BODY";
    throw error;
  }
}

/**
 * Construye una respuesta de error estandarizada para el módulo de alertas.
 * Infiere el statusCode desde el error o desde palabras clave del mensaje.
 *
 * @param {Error} error - Error capturado con propiedades opcionales statusCode y code
 * @returns {Object} Respuesta HTTP con formato { success, message, statusCode }
 */
function resolveErrorResponse(error) {
  const statusCode =
    error.statusCode ||
    (/(requerido|inv[aá]lido|validaci[oó]n|uuid|latitud|longitud)/i.test(
      error.message
    )
      ? 400
      : 500);

  return errorResponse(error.message, statusCode, {
    code: error.code || "ALERTA_ERROR",
  });
}

/**
 * Obtiene los indicadores agregados del panel de alertas.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @returns {Promise<Object>} Respuesta HTTP 200 con los 4 indicadores
 * @throws {Error} 401 si el token es inválido o está ausente
 */
export const getIndicadoresController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const alertaService = new AlertaService();
    const indicadores = await alertaService.getIndicadores();

    return successResponse(indicadores, "Indicadores de alertas obtenidos exitosamente.");
  } catch (error) {
    console.error("Error en getIndicadoresController:", error);
    return resolveErrorResponse(error);
  }
};

/**
 * Obtiene todas las alertas activas (no resueltas) con sus relaciones
 * de conductor y unidad. Permite filtrar por tipo y estado via query params.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {Object} [event.queryStringParameters] - Query parameters opcionales
 * @param {string} [event.queryStringParameters.tipo] - PANICO | AUXILIO_MECANICO | OBSERVACION
 * @param {string} [event.queryStringParameters.estado] - ACTIVA | EN_PROCESO
 * @returns {Promise<Object>} Respuesta HTTP 200 con lista de alertas
 * @throws {Error} 401 si el token es inválido o está ausente
 */
export const getAlertasActivasController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const { tipo, estado } = event.queryStringParameters || {};
    const alertaService = new AlertaService();
    const alertas = await alertaService.getAlertasActivas({ tipo, estado });

    return successResponse(alertas, "Alertas activas obtenidas exitosamente.");
  } catch (error) {
    console.error("Error en getAlertasActivasController:", error);
    return resolveErrorResponse(error);
  }
};

/**
 * Resuelve una alerta de emergencia, cambiando su estado a RESUELTA.
 * Opcionalmente persiste detalle de resolución y servicio técnico.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {Object} event.pathParameters - Parámetros de ruta
 * @param {string} event.pathParameters.id - UUID de la alerta a resolver
 * @param {string} event.body - JSON con datos opcionales de resolución
 * @param {string} [event.body.detalle_resolucion] - Descripción de la resolución
 * @param {string} [event.body.servicio_tecnico_realizado] - Servicio técnico aplicado
 * @returns {Promise<Object>} Respuesta HTTP 200 con la alerta actualizada
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 404 ALERTA_NOT_FOUND si la alerta no existe
 * @throws {Error} 400 ALERTA_YA_RESUELTA si la alerta ya está resuelta
 */


/**
 * HU21 - Controller para registrar SOS PÁNICO desde la app móvil.
 *
 * Este endpoint será consumido por la app cuando el chofer mantenga
 * presionado el botón SOS por 3 segundos. Si la jornada está EN_PROCESO,
 * registra la alerta y retorna el mensaje de bloqueo de seguridad.
 */
export const registrarSosController = async (event) => {
  try {
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

    await getCurrentSession(authorizationHeader);

    const body = parseJsonBody(event);
    const alertaService = new AlertaService();

    const alerta = await alertaService.registrarSos({
      jornada_id: body.jornada_id || body.jornadaId,
      conductor_id: body.conductor_id || body.conductorId,
      latitud: body.latitud ?? body.lat,
      longitud: body.longitud ?? body.lng,
      direccion: body.direccion,
      detalle: body.detalle,
      timestamp_local: body.timestamp_local || body.timestampLocal,
      created_offline: body.created_offline || body.createdOffline || false,
      event_id_cliente: body.event_id_cliente || body.eventIdCliente,
    });

    return successResponse(
      alerta,
      "Alerta SOS registrada exitosamente.",
      200
    );
  } catch (error) {
    console.error("Error en registrarSosController:", error);
    return resolveErrorResponse(error);
  }
};

/**
 * HU21 - Controller para registrar Auxilio Mecánico desde la app móvil.
 *
 * Este endpoint será consumido cuando el chofer seleccione una falla
 * en el modal de Auxilio Mecánico y confirme la solicitud.
 */
export const registrarAuxilioController = async (event) => {
  try {
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

    await getCurrentSession(authorizationHeader);

    const body = parseJsonBody(event);
    const alertaService = new AlertaService();

    const alerta = await alertaService.registrarAuxilio({
      jornada_id: body.jornada_id || body.jornadaId,
      conductor_id: body.conductor_id || body.conductorId,
      tipo_falla_mecanica:
        body.tipo_falla_mecanica || body.tipoFalla || body.tipoFallaMecanica,
      detalle: body.detalle,
      latitud: body.latitud ?? body.lat,
      longitud: body.longitud ?? body.lng,
      direccion: body.direccion,
      timestamp_local: body.timestamp_local || body.timestampLocal,
      created_offline: body.created_offline || body.createdOffline || false,
      event_id_cliente: body.event_id_cliente || body.eventIdCliente,
    });

    return successResponse(
      alerta,
      "Auxilio Mecánico Solicitado. Tu solicitud ha sido enviada.",
      200
    );
  } catch (error) {
    console.error("Error en registrarAuxilioController:", error);
    return resolveErrorResponse(error);
  }
};





export const resolverAlertaController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const id = event.pathParameters?.id;
    const body = parseJsonBody(event);
    const alertaService = new AlertaService();
    const alerta = await alertaService.resolverAlerta(id, {
      detalle_resolucion: body.detalle_resolucion,
      servicio_tecnico_realizado: body.servicio_tecnico_realizado,
    });

    return successResponse(alerta, "Alerta resuelta exitosamente.");
  } catch (error) {
    console.error("Error en resolverAlertaController:", error);
    return resolveErrorResponse(error);
  }
};

/**
 * Actualiza el estado operativo de una alerta de auxilio mecánico.
 * Solo aplica para alertas de tipo AUXILIO_MECANICO.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {Object} event.pathParameters - Parámetros de ruta
 * @param {string} event.pathParameters.id - UUID de la alerta
 * @param {string} event.body - JSON con el nuevo estado
 * @param {string} event.body.estado - EN_PROCESO | RESUELTA
 * @returns {Promise<Object>} Respuesta HTTP 200 con la alerta actualizada
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 404 ALERTA_NOT_FOUND si la alerta no existe
 * @throws {Error} 400 SOLO_AUXILIO_MECANICO si el tipo no es AUXILIO_MECANICO
 * @throws {Error} 400 ESTADO_INVALIDO si el estado no es permitido
 */
export const actualizarEstadoController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const id = event.pathParameters?.id;
    const body = parseJsonBody(event);
    const alertaService = new AlertaService();
    const alerta = await alertaService.actualizarEstado(id, body.estado);

    return successResponse(alerta, "Estado actualizado exitosamente.");
  } catch (error) {
    console.error("Error en actualizarEstadoController:", error);
    return resolveErrorResponse(error);
  }
};
