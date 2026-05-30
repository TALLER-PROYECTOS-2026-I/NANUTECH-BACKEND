import * as combustibleController from "./combustibleController.mjs";
import { errorResponse } from "../../shared/utils/response/response.mjs";


/**
 * Tabla de rutas del módulo HU15 - Combustible.
 *
 * Cada clave combina método HTTP + path definido en API Gateway.
 * El handler usa esta tabla para delegar cada solicitud al controller correcto.
 */

const ROUTES = {
  "POST /combustible": combustibleController.registrarCombustibleController,
  "GET /combustible/ultimo-km/{unidadId}":
    combustibleController.getUltimoKmController,
  "GET /combustible/jornada/{jornadaId}":
    combustibleController.getCombustibleByJornadaController,
};


/**
 * Normaliza la ruta recibida desde API Gateway.
 *
 * Soporta:
 * - API Gateway REST v1: event.httpMethod + event.resource
 * - API Gateway HTTP v2: event.requestContext.http.method + event.rawPath
 *
 * Esto permite ejecutar el mismo handler tanto en SAM Local como en AWS.
 *
 *  Método HTTP.
 * Recurso API Gateway v1.
 *  Ruta cruda API Gateway v2.
 * Clave normalizada para buscar en ROUTES.
 */

function normalizeRoute(method, resource, rawPath) {
  if (resource) return `${method} ${resource}`;

  if (method === "POST" && rawPath === "/combustible") {
    return "POST /combustible";
  }

  if (method === "GET" && rawPath?.startsWith("/combustible/ultimo-km/")) {
    return "GET /combustible/ultimo-km/{unidadId}";
  }

  if (method === "GET" && rawPath?.startsWith("/combustible/jornada/")) {
    return "GET /combustible/jornada/{jornadaId}";
  }

  return `${method} ${rawPath}`;
}

/**
 * Handler principal de AWS Lambda para HU15.
 *
 * Recibe el evento de API Gateway, identifica la ruta solicitada
 * y delega al controller correspondiente.
 *
 */

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const routeKey = normalizeRoute(method, event.resource, event.rawPath);

  const routeHandler = ROUTES[routeKey];

  if (!routeHandler) {
    return errorResponse("Ruta no encontrada", 404, {
      code: "ROUTE_NOT_FOUND",
    });
  }

  return routeHandler(event);
};