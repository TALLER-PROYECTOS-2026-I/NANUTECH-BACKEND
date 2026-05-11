// Importa servicio principal dashboard.
import { getDashboardService }
from "./dashboardService.mjs";

// Importa helpers response.
import {

  successResponse,

  errorResponse

} from "../../shared/utils/response/response.mjs";


// CONTROLADOR DASHBOARD

export const getDashboardController =
async (event) => {

  try {
    // Obtiene el token enviado en el header Authorization.
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;

    // Valida el token y obtiene la sesión actual del usuario.
    const session = await getCurrentSession(authorizationHeader);

    // Regla de seguridad: solo el Administrador de Operaciones puede registrar contratos.
    if (session.role !== "admin") {
      return errorResponse("Solo el Administrador puede acceder al Dashboard", 403, {
        code: "FORBIDDEN_ROLE",
      });
    }

    // OBTIENE DATA DEL DASHBOARD

    const data =
      await getDashboardService();

    // RESPUESTA EXITOSA

    return successResponse(

      data,

      "Dashboard obtenido correctamente",

      200
    );

  } catch (error) {

    // LOG ERROR

    console.error(

      "Error en dashboard controller:",

      error
    );

    // RESPUESTA ERROR

    return errorResponse(

      "Error interno del servidor",

      500
    );
  }
};