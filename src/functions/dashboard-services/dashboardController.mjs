// Importa el servicio principal del dashboard.
// Este servicio se encarga de obtener toda la información necesaria.
import { getDashboardService } from "./dashboardService.mjs";

// Importa la función que valida el token y obtiene la sesión actual.
import { getCurrentSession } from "../auth-services/authService.mjs";

// Controlador principal del endpoint dashboard.
export const getDashboardController = async (event) => {

  // Bloque try/catch para manejar errores del flujo.
  try {

    // Obtiene el header Authorization enviado desde el frontend.
    // Se valida tanto "Authorization" como "authorization"
    // por compatibilidad.
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

    // Si no existe token se retorna error 401.
    if (!authorizationHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: "Token requerido",
        }),
      };
    }

    // Valida el token y obtiene los datos de sesión.
    const session = await getCurrentSession(authorizationHeader);

    // Verifica si el usuario tiene rol administrador.
    // Solo el admin puede acceder al dashboard.
    if (session.role !== "admin") {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: "Solo el Administrador puede acceder al dashboard",
        }),
      };
    }

    // Llama al servicio que obtiene toda la información
    // del dashboard.
    const data = await getDashboardService();

    // Retorna respuesta exitosa con status 200.
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };

  } catch (error) {

    // Muestra el error en consola para debugging.
    console.error("Error en controller:", error);

    // Retorna error interno del servidor.
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error interno del servidor",
      }),
    };
  }
};