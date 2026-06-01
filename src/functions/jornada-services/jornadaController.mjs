import { JornadaService } from "./jornadaService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";
import { getCurrentSession } from "../auth-services/authService.mjs";
console.log("IMPORTS OK");
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
 * Construye una respuesta de error estandarizada para el módulo de jornadas.
 * Infiere el statusCode desde el error o desde palabras clave del mensaje.
 *
 * @param {Error} error - Error capturado con propiedades opcionales statusCode y code
 * @returns {Object} Respuesta HTTP con formato { success, message, statusCode }
 */
function resolveErrorResponse(error) {
  const statusCode =
    error.statusCode || (/(requerido|inv[aá]lido|validaci[oó]n)/i.test(error.message) ? 400 : 500);

  return errorResponse(error.message, statusCode, {
    code: error.code || "JORNADA_ERROR",
  });
}

/**
 * Registra una nueva jornada en el sistema.
 * Verifica que ni el conductor ni la unidad tengan jornadas activas antes de crear.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {string} event.body - JSON con los datos de la jornada
 * @param {number} event.body.conductor_id - ID del conductor asignado
 * @param {number} event.body.unidad_id - ID de la unidad/camión asignada
 * @param {number} event.body.contrato_id - ID del contrato asociado
 * @param {string} [event.body.fecha_jornada] - Fecha de la jornada (default: hoy)
 * @param {string} [event.body.origen] - Punto de partida
 * @param {string} [event.body.destino] - Punto de llegada
 * @returns {Promise<Object>} Respuesta HTTP 200 con la jornada creada
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 400 UNIDAD_CON_JORNADA_ACTIVA si la unidad ya está en uso
 * @throws {Error} 400 CONDUCTOR_CON_JORNADA_ACTIVA si el conductor ya está en uso
 */
export const createJornadaController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const body = parseJsonBody(event);
    const jornadaService = new JornadaService();
    const jornada = await jornadaService.createJornada(body);

    return successResponse(jornada, "Jornada registrada exitosamente.");
  } catch (error) {
    console.error("Error en createJornadaController:", error);
    return resolveErrorResponse(error);
  }
};

/**
 * Obtiene la jornada activa más reciente de un conductor.
 * Solo considera estados REGISTRADA, PENDIENTE o EN_PROCESO.
 * Retorna null si el conductor no tiene jornada activa (el dashboard omite la sección).
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {Object} [event.pathParameters] - Parámetros de ruta
 * @param {string} [event.pathParameters.conductorId] - ID del conductor (desde la ruta)
 * @param {Object} [event.queryStringParameters] - Query parameters
 * @param {string} [event.queryStringParameters.conductor_id] - ID del conductor (alternativo por query)
 * @returns {Promise<Object>} Respuesta HTTP 200 con la jornada actual o null
 * @throws {Error} 401 si el token es inválido o está ausente
 */
export const getCurrentJornadaController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const jornadaService = new JornadaService();
    const conductorId =
      event.pathParameters?.conductorId || event.queryStringParameters?.conductor_id;

    const jornada = await jornadaService.getCurrentJornada(conductorId);
    return successResponse(jornada, "Jornada actual obtenida exitosamente.");
  } catch (error) {
    console.error("Error en getCurrentJornadaController:", error);
    return resolveErrorResponse(error);
  }
};

/**
 * Inicia el turno de una jornada, cambiando su estado a EN_PROCESO.
 * La hora de inicio la fija el servidor en el momento de la llamada.
 * Solo se puede iniciar desde los estados REGISTRADA o PENDIENTE.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {string} event.body - JSON con el ID de la jornada
 * @param {number} event.body.jornada_id - ID de la jornada a iniciar
 * @returns {Promise<Object>} Respuesta HTTP 200 con la jornada actualizada (estado EN_PROCESO)
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 404 JORNADA_NOT_FOUND si la jornada no existe
 * @throws {Error} 400 JORNADA_ALREADY_STARTED si la jornada ya está EN_PROCESO
 * @throws {Error} 400 JORNADA_INVALID_STATE si el estado actual no permite iniciar
 */
export const startTurnController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const body = parseJsonBody(event);
    const jornadaService = new JornadaService();
    const jornada = await jornadaService.startTurn(body);

    return successResponse(jornada, "Turno iniciado exitosamente.");
  } catch (error) {
    console.error("Error en startTurnController:", error);
    return resolveErrorResponse(error);
  }
};

/**
 * Finaliza el turno de una jornada EN_PROCESO, cambiando su estado a COMPLETADA.
 * El servidor fija la hora de fin y el repositorio calcula la duración total.
 * Solo se pueden cerrar jornadas que estén exactamente en estado EN_PROCESO.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {string} event.body - JSON con el ID de la jornada y observaciones opcionales
 * @param {number} event.body.jornada_id - ID de la jornada a finalizar
 * @param {string} [event.body.observaciones] - Observaciones finales del turno
 * @returns {Promise<Object>} Respuesta HTTP 200 con la jornada finalizada y duración calculada
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 404 JORNADA_NOT_FOUND si la jornada no existe
 * @throws {Error} 400 JORNADA_NOT_IN_PROGRESS si la jornada no está EN_PROCESO
 */
export const finishTurnController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const body = parseJsonBody(event);
    const jornadaService = new JornadaService();
    const jornada = await jornadaService.finishTurn(body);

    return successResponse(jornada, "Turno finalizado exitosamente.");
  } catch (error) {
    console.error("Error en finishTurnController:", error);
    return resolveErrorResponse(error);
  }
};

/**
 * Obtiene todas las jornadas con filtros opcionales.
 * Valida que fecha_desde no sea posterior a fecha_hasta antes de consultar.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {Object} [event.queryStringParameters] - Filtros de búsqueda
 * @param {string} [event.queryStringParameters.q] - Texto libre para buscar por placa o nombre del conductor
 * @param {string} [event.queryStringParameters.conductor_id] - Filtrar por ID exacto de conductor
 * @param {string} [event.queryStringParameters.fecha_desde] - Límite inferior de fecha_jornada (YYYY-MM-DD)
 * @param {string} [event.queryStringParameters.fecha_hasta] - Límite superior de fecha_jornada (YYYY-MM-DD)
 * @returns {Promise<Object>} Respuesta HTTP 200 con lista de jornadas enriquecidas
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 400 INVALID_DATE_RANGE si fecha_desde es posterior a fecha_hasta
 */
export const getAllJornadasController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const jornadaService = new JornadaService();
    const { q, conductor_id, fecha_desde, fecha_hasta } = event.queryStringParameters || {};

    // Validación de rango de fechas
    if (fecha_desde && fecha_hasta && fecha_desde > fecha_hasta) {
      return errorResponse("La fecha de inicio no puede ser posterior a la fecha de fin.", 400, {
        code: "INVALID_DATE_RANGE",
      });
    }

    const data = await jornadaService.getAllJornadas({
      q,
      conductor_id,
      fecha_desde,
      fecha_hasta,
    });
    return successResponse(data, "Jornadas obtenidas exitosamente.");
  } catch (error) {
    console.error("Error en getAllJornadasController:", error);
    return resolveErrorResponse(error);
  }
};
/**
 * Obtiene el historial gerencial de jornadas con métricas operativas,
 * alertas de emergencia y observaciones para auditoría.
 * Permite aplicar filtros por conductor, estado de alerta,
 * rango de fechas y observaciones.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {Object} [event.queryStringParameters] - Filtros de búsqueda
 * @param {string} [event.queryStringParameters.conductor] - Nombre del conductor
 * @param {string} [event.queryStringParameters.estado_alerta] - Tipo de alerta (PANICO | AUXILIO)
 * @param {string} [event.queryStringParameters.fecha_desde] - Fecha inicio del rango
 * @param {string} [event.queryStringParameters.fecha_hasta] - Fecha fin del rango
 * @param {string} [event.queryStringParameters.observaciones] - Texto de observaciones
 * @returns {Promise<Object>} Respuesta HTTP 200 con métricas y registros detallados
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 400 INVALID_DATE_RANGE si fecha_desde es posterior a fecha_hasta
 */
export const getManagerHistoryController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;

    await getCurrentSession(authorizationHeader);

    const jornadaService = new JornadaService();

    const { q, conductor_id, estado, estado_alerta, fecha_desde, fecha_hasta, observaciones, conductor } =
      event.queryStringParameters || {};

    // ValidaciÃ³n de rango de fechas
    if (fecha_desde && fecha_hasta && fecha_desde > fecha_hasta) {
      return errorResponse("La fecha de inicio no puede ser posterior a la fecha de fin.", 400, {
        code: "INVALID_DATE_RANGE",
      });
    }

    const data = await jornadaService.getManagerHistory({
      q: q || conductor,
      conductor_id,
      estado,
      estado_alerta,
      fecha_desde,
      fecha_hasta,
      observaciones,
    });

    return successResponse(data, "Historial gerencial obtenido exitosamente.");
  } catch (error) {
    console.error("Error en getManagerHistoryController:", error);
    return resolveErrorResponse(error);
  }
};
/**
 * Obtiene el historial de jornadas completadas del conductor autenticado.
 * El conductor_id se extrae del token JWT para evitar que un chofer
 * pueda ver las jornadas de otro.
 * Filtros: periodo (semana|mes|todas) y observaciones (todas|con|sin).
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {Object} [event.queryStringParameters] - Filtros de búsqueda
 * @param {string} [event.queryStringParameters.periodo] - 'semana' | 'mes' | 'todas'
 * @param {string} [event.queryStringParameters.observaciones] - 'todas' | 'con' | 'sin'
 * @returns {Promise<Object>} Respuesta HTTP 200 con lista de jornadas del conductor
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 400 INVALID_PERIOD si el período no es válido
 */
export const getDriverHistoryController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    const session = await getCurrentSession(authorizationHeader);

    const conductorId = session.user.id;
    const { periodo, observaciones } = event.queryStringParameters || {};

    const jornadaService = new JornadaService();
    const historial = await jornadaService.getDriverHistory({
      conductor_id: conductorId,
      periodo,
      observaciones,
    });

    return successResponse(historial, "Historial obtenido exitosamente.");
  } catch (error) {
    console.error("Error en getDriverHistoryController:", error);
    return resolveErrorResponse(error);
  }
};

/**
 * Obtiene las métricas de resumen del conductor autenticado para las
 * 4 tarjetas del dashboard del chofer: total_jornadas, horas_trabajadas,
 * km_recorridos y con_observaciones.
 * El conductor_id se extrae del token JWT.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {Object} [event.queryStringParameters] - Filtros de búsqueda
 * @param {string} [event.queryStringParameters.periodo] - 'semana' | 'mes' | 'todas'
 * @returns {Promise<Object>} Respuesta HTTP 200 con métricas del conductor
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 400 INVALID_PERIOD si el período no es válido
 */
export const getDriverMetricsController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    const session = await getCurrentSession(authorizationHeader);

    const conductorId = session.user.id;
    const { periodo } = event.queryStringParameters || {};

    const jornadaService = new JornadaService();
    const metricas = await jornadaService.getDriverMetrics({
      conductor_id: conductorId,
      periodo,
    });

    return successResponse(metricas, "Métricas obtenidas exitosamente.");
  } catch (error) {
    console.error("Error en getDriverMetricsController:", error);
    return resolveErrorResponse(error);
  }
};
console.log("ANTES DE ALERT DETAIL");
/**
 * Obtiene las métricas operativas del historial gerencial.
 * Retorna indicadores para las tarjetas del dashboard:
 * Total Journas, Alertas Pánico, Auxilio Mecánico,
 * Journas con Observaciones y KM Promedio.
 *
 * @param {Object} event - Evento AWS Lambda
 * @returns {Promise<Object>} Métricas operativas
 */
export const getHistorialMetricsController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;

    await getCurrentSession(authorizationHeader);

    const jornadaService = new JornadaService();

    const filtros = event.queryStringParameters || {};

    const metrics = await jornadaService.getHistorialMetrics(filtros);

    return successResponse(metrics, "Métricas gerenciales obtenidas exitosamente.");
  } catch (error) {
    console.error("Error en getHistorialMetricsController:", error);
    return resolveErrorResponse(error);
  }
};
console.log("ANTES DE ALERT DETAIL");
/**
 * Obtiene el detalle completo de una alerta de emergencia
 * asociada a una jornada específica.
 *
 * Incluye:
 * - conductor
 * - placa
 * - ubicación
 * - tipo alerta
 * - descripción
 * - resolución
 *
 * @param {Object} event - Evento AWS Lambda
 * @returns {Promise<Object>} Detalle completo de alerta
 */
export const getAlertDetailController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;

    await getCurrentSession(authorizationHeader);

    const jornadaService = new JornadaService();

    const jornadaId = event.pathParameters?.jornadaId;

    const detail = await jornadaService.getAlertDetail(jornadaId);

    return successResponse(detail, "Detalle de alerta obtenido exitosamente.");
  } catch (error) {
    console.error("Error en getAlertDetailController:", error);
    return resolveErrorResponse(error);
  }
};
/**
 * Exporta las jornadas filtradas en formato CSV para descarga directa.
 * Retorna la respuesta con Content-Type text/csv y Content-Disposition para forzar descarga.
 * Los campos se escapan según RFC 4180 para manejar comas, comillas y saltos de línea.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {Object} [event.queryStringParameters] - Filtros de exportación
 * @param {string} [event.queryStringParameters.q] - Texto libre para buscar por placa o conductor
 * @param {string} [event.queryStringParameters.conductor_id] - Filtrar por ID de conductor
 * @param {string} [event.queryStringParameters.fecha_desde] - Fecha inicio del rango (YYYY-MM-DD)
 * @param {string} [event.queryStringParameters.fecha_hasta] - Fecha fin del rango (YYYY-MM-DD)
 * @returns {Promise<Object>} Respuesta HTTP 200 con body CSV y header Content-Disposition
 * @throws {Error} 401 si el token es inválido o está ausente
 */
export const exportCsvController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const jornadaService = new JornadaService();
    const { q, conductor_id, fecha_desde, fecha_hasta } = event.queryStringParameters || {};
    const csv = await jornadaService.generateCsv({
      q,
      conductor_id,
      fecha_desde,
      fecha_hasta,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="jornadas.csv"',
        "Access-Control-Allow-Origin": "*",
      },
      body: csv,
    };
  } catch (error) {
    console.error("Error en exportCsvController:", error);
    return resolveErrorResponse(error);
  }
};
console.log("FIN DEL ARCHIVO");
