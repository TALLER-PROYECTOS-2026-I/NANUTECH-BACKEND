import * as alertaController from "./alertaController.mjs";
import { errorResponse } from "../../shared/utils/response/response.mjs";

/**
 * Tabla de rutas del módulo de alertas.
 * Mapea cada combinación "METHOD /ruta" al controller correspondiente.
 * El orden es importante: rutas más específicas deben ir antes de las
 * genéricas para evitar colisiones en el ruteo del API Gateway.
 *
 * @type {Object.<string, Function>}
 */
const ROUTES = {
  "GET /alertas/indicadores": alertaController.getIndicadoresController,
  "GET /alertas/activas": alertaController.getAlertasActivasController,
  "PATCH /alertas/{id}/resolver": alertaController.resolverAlertaController,
  "PATCH /alertas/{id}/estado": alertaController.actualizarEstadoController,
};

/**
 * Handler principal de AWS Lambda para el módulo de alertas.
 * Construye la clave de ruta combinando método HTTP y recurso, busca el controller
 * en ROUTES y delega la ejecución. Retorna 404 si la combinación no está registrada.
 *
 * Soporta API Gateway v1 (httpMethod + resource) y v2 (requestContext.http.method + rawPath).
 *
 * @param {Object} event - Evento de AWS Lambda (API Gateway v1 o v2)
 * @param {Object} [event.requestContext] - Contexto de la solicitud
 * @param {Object} [event.requestContext.http] - Contexto HTTP (API Gateway v2)
 * @param {string} [event.requestContext.http.method] - Método HTTP en formato v2
 * @param {string} [event.httpMethod] - Método HTTP en formato v1 (GET, POST, etc.)
 * @param {string} [event.resource] - Recurso de la ruta en v1 (ej. /alertas/{id}/resolver)
 * @param {string} [event.rawPath] - Ruta cruda en v2 (ej. /alertas/indicadores)
 * @returns {Promise<Object>} Respuesta HTTP con formato { statusCode, headers, body }
 */
export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const resource = event.resource || event.rawPath;
  const routeKey = `${method} ${resource}`;

  const routeHandler = ROUTES[routeKey];

  if (!routeHandler) {
    return errorResponse("Ruta no encontrada", 404, {
      code: "ROUTE_NOT_FOUND",
    });
  }

  return routeHandler(event);
};
