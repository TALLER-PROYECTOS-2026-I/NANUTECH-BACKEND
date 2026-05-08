import { getDashboardGerencialService } from "./dashboardGerencialService.mjs";
import { getCurrentSession } from "../auth-services/authService.mjs";

export const getDashboardGerencialController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;

    if (!authorizationHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Token requerido" }),
      };
    }

    const session = await getCurrentSession(authorizationHeader);

    // Solo Gerente puede acceder
    if (!["gerente", "admin"].includes(session.role.toLowerCase())) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: "Solo Gerencia o Administrador puede acceder a este dashboard",
        }),
      };
    }

    // Extraer filtros (tiempo = 'hoy', 'semana', 'mes', 'todas')
    const tiempo = event.queryStringParameters?.tiempo || "todas";
    const search = event.queryStringParameters?.search || "";

    const data = await getDashboardGerencialService(tiempo, search);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error en controller (Dashboard Gerencial):", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Error interno del servidor", error: error.message }),
    };
  }
};
