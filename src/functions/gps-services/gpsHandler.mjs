
/**
 * Punto de entrada principal del módulo GPS.
 * * Redirecciona solicitudes HTTP hacia
 * los controllers correspondientes.
 */

// Controladores del módulo GPS
import {
  getProvidersController,
  getTemplateController,
  validateCsvController,
  importCsvController,
  getSummaryController,
  getTrackingSummaryController,
  exportTrackingCsvController,
  listRegistrosController,
} from "./gpsController.mjs";

// Utilidades para respuestas HTTP
import { errorResponse } from "../../shared/utils/response/response.mjs";

/**
 * ENRUTADOR DE SOLICITUDES HTTP
 * * Mapeo de rutas (Método + Recurso) hacia sus respectivos controladores.
 */
const routes = {
  "GET /gps/proveedores": getProvidersController,
  "GET /gps/plantilla": getTemplateController,
  "GET /gps/plantilla/{proveedor}": getTemplateController,
  "POST /gps/validar": validateCsvController,
  "POST /gps/importar": importCsvController,
  "GET /gps/resumen": getSummaryController,
  "GET /gps/registros": listRegistrosController,
  "GET /gps/tracking/resumen": getTrackingSummaryController,
  "GET /gps/tracking/export": exportTrackingCsvController,
};

/**
 * Handler principal de AWS Lambda encargado de despachar las peticiones del API Gateway.
 */
export const handler = async (event) => {
  try {
    /**
     * EXTRACCIÓN DE MÉTODO Y RECURSO HTTP
     */
    const method =
      event.httpMethod ||
      event.requestContext?.http?.method;

    const resource =
      event.resource ||
      event.routeKey?.replace(`${method} `, "") ||
      event.rawPath;

    // Construcción de la llave única de enrutamiento
    const routeKey = `${method} ${resource}`;

    /**
     * VALIDACIÓN CORS (MÉTODO OPTIONS)
     */
    if (method === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
          "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key",
        },
        body: "",
      };
    }

    /**
     * DESPACHO AL CONTROLADOR CORRESPONDIENTE
     */
    const controller = routes[routeKey];

    // Valida si la ruta solicitada existe en el diccionario
    if (!controller) {
      return errorResponse(`Ruta ${routeKey} no encontrada`, 404);
    }

    /**
     * LÓGICA PRINCIPAL
     */
    return await controller(event);
  } catch (error) {
    console.error("Error en gpsHandler:", error);
    return errorResponse(error.message, 500);
  }
};