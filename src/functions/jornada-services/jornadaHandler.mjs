import { errorResponse } from "../../shared/utils/response/response.mjs";
import {
  createJornadaController,
  finishTurnController,
  getCurrentJornadaController,
  startTurnController,
} from "./jornadaController.mjs";

const routes = {
  "POST /jornadas": createJornadaController,
  "GET /jornadas/actual/{conductorId}": getCurrentJornadaController,
  "POST /jornadas/iniciar": startTurnController,
  "POST /jornadas/finalizar": finishTurnController,
};

export const handler = async (event) => {
  const routeKey = `${event.httpMethod} ${event.resource}`;
  const controller = routes[routeKey];

  if (!controller) {
    return errorResponse("Ruta no encontrada", 404, {
      code: "ROUTE_NOT_FOUND",
    });
  }

  return await controller(event);
};
