import { DashboardConductoresService } from "./dashboardConductoresService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";
import { getCurrentSession } from "../auth-services/authService.mjs";

// Controlador del endpoint GET /conductores/dashboard
export const getDashboardConductoresController = async (event) => {
  try {
    // Obtiene el token enviado en el header Authorization
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

    // Valida la sesión del usuario autenticado
    const session = await getCurrentSession(authorizationHeader);

    // Solo el administrador puede ver el panel
    if (session.role !== "admin" && session.role !== "ADMIN") {
      return errorResponse(
        "Solo el Administrador General puede acceder al panel de conductores",
        403
      );
    }

    // Lee los filtros enviados por query params
    const { busqueda, estado, disponibilidad } =
      event.queryStringParameters || {};

    // Llama a la capa service
    const service = new DashboardConductoresService();

    // Obtiene la información completa del dashboard
    const data = await service.getDashboardConductores({
      busqueda,
      estado,
      disponibilidad,
    });

    // Retorna respuesta exitosa
    return successResponse(data, "Panel de conductores obtenido correctamente");
  } catch (error) {
    console.error("Error en getDashboardConductoresController:", error);
    // Retorna error controlado
    return errorResponse(error.message, error.statusCode || 500);
  }
};