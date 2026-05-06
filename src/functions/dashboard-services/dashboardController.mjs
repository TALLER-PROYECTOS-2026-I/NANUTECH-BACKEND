import { getDashboardService } from "./dashboardService.mjs";
import { getCurrentSession } from "../auth-services/authService.mjs";

export const getDashboardController = async (event) => {
  try {
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

    if (!authorizationHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: "Token requerido",
        }),
      };
    }

    const session = await getCurrentSession(authorizationHeader);

    if (session.role !== "admin") {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: "Solo el Administrador puede acceder al dashboard",
        }),
      };
    }

    const data = await getDashboardService();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error("Error en controller:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error interno del servidor",
      }),
    };
  }
};