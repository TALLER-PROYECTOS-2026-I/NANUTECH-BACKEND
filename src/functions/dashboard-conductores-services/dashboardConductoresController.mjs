import { DashboardConductoresService } from "./dashboardConductoresService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";
import { getCurrentSession } from "../auth-services/authService.mjs";

// Valida que el usuario autenticado sea administrador
const validarAdmin = async (event) => {
  // Obtiene el token enviado desde Authorization header
  const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;

  // Valida la sesión mediante Cognito/AuthService
  const session = await getCurrentSession(authorizationHeader);

  // Solo ADMIN puede acceder al dashboard
  if (session.role !== "admin" && session.role !== "ADMIN") {
    const error = new Error("Acceso no autorizado");
    // Código HTTP
    error.statusCode = 403;
    throw error;
  }
  return session;
};

// GET /conductores/dashboard/resumen
// Endpoint encargado de retornar:
// - tarjetas resumen
// - indicadores principales
// - gráficos estadísticos
export const getDashboardConductoresResumenController = async (event) => {
  try {
    // Verifica que el usuario autenticado
    await validarAdmin(event);

    // Instancia la capa service
    const service = new DashboardConductoresService();

    // Obtiene información resumen del dashboard
    const data = await service.getResumenDashboard();

    // Retorna respuesta exitosa
    return successResponse(data, "Resumen del panel de conductores obtenido correctamente");
  } catch (error) {
    // Log interno del backend
    console.error("Error en getDashboardConductoresResumenController:", error);
    // Retorna error controlado
    return errorResponse(
      error.statusCode === 403 || error.statusCode === 401
        ? "Acceso no autorizado"
        : "No se pudo procesar la solicitud",
      error.statusCode || 500
    );
  }
};

// GET /conductores/dashboard/listado
// Endpoint encargado de retornar:
// - listado paginado de conductores
// - filtros
// - búsqueda
export const getDashboardConductoresListadoController = async (event) => {
  try {
    // Verifica que el usuario autenticado
    await validarAdmin(event);

    // Obtiene filtros enviados por query params
    const {
      busqueda,
      estado,
      disponibilidad,
      page = 1,
      limit = 20,
    } = event.queryStringParameters || {};

    // Instancia la capa service
    const service = new DashboardConductoresService();

    // Obtiene listado paginado
    const data = await service.getListadoConductores({
      busqueda,
      estado,
      disponibilidad,
      page,
      limit,
    });

    // Retorna respuesta exitosa
    return successResponse(data, "Listado de conductores obtenido correctamente");
  } catch (error) {
    // Log interno del backend
    console.error("Error en getDashboardConductoresListadoController:", error);

    // Retorna error controlado
    return errorResponse(
      error.statusCode === 403 || error.statusCode === 401
        ? "Acceso no autorizado"
        : "No se pudo procesar la solicitud",
      error.statusCode || 500
    );
  }
};
