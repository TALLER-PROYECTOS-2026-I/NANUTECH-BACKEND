// Endpoints expuestos por la Lambda de auth.
// El contrato de request/response para frontend y QA está documentado
// en src/functions/auth-services/AUTH_CONTRACT.md.
import { errorResponse } from "../../shared/utils/response/response.mjs";
import {
  forgotPassword,
  getCurrentSessionController,
  loginAttempt,
} from "./authController.mjs";

const routes = {
  "POST /auth/forgot-password": forgotPassword,
  "POST /auth/login": loginAttempt,
  "GET /auth/me": getCurrentSessionController,
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
