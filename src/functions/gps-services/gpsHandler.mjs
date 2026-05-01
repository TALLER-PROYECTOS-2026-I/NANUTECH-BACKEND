import {
  getProvidersController,
  getTemplateController,
  validateCsvController,
  importCsvController,
  getSummaryController,
  listRegistrosController,
} from "./gpsController.mjs";

import { errorResponse } from "../../shared/utils/response/response.mjs";

const routes = {
  "GET /gps/proveedores": getProvidersController,
  "GET /gps/plantilla": getTemplateController,
  "GET /gps/plantilla/{proveedor}": getTemplateController,
  "POST /gps/validar": validateCsvController,
  "POST /gps/importar": importCsvController,
  "GET /gps/resumen": getSummaryController,
  "GET /gps/registros": listRegistrosController,
};

export const handler = async (event) => {
  try {
    const method =
      event.httpMethod ||
      event.requestContext?.http?.method;

    const resource =
      event.resource ||
      event.routeKey?.replace(`${method} `, "") ||
      event.rawPath;

    const routeKey = `${method} ${resource}`;

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

    const controller = routes[routeKey];

    if (!controller) {
      return errorResponse(`Ruta ${routeKey} no encontrada`, 404);
    }

    return await controller(event);
  } catch (error) {
    console.error("Error en gpsHandler:", error);
    return errorResponse(error.message, 500);
  }
};