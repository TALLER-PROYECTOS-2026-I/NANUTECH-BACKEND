import {
  createJornadaController,
  getAllJornadasController,
  getCurrentJornadaController,
  startTurnController,
  finishTurnController,
} from "./jornadaController.mjs";
import { errorResponse } from "../../shared/utils/response/response.mjs";

const ROUTES = {
  "POST /jornadas": createJornadaController,
  "GET /jornadas/actual/{conductorId}": getCurrentJornadaController,
  "GET /jornadas": getAllJornadasController,
  "POST /jornadas/iniciar": startTurnController,
  "POST /jornadas/finalizar": finishTurnController,
};

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

