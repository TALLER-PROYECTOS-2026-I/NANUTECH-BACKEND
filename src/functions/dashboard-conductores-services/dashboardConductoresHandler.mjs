import {
  getDashboardConductoresResumenController,
  getDashboardConductoresListadoController,
} from "./dashboardConductoresController.mjs";

// Rutas disponibles para este módulo
const routes = {
   "GET /conductores/dashboard/resumen":
    getDashboardConductoresResumenController,

  "GET /conductores/dashboard/listado":
    getDashboardConductoresListadoController,
};

// Handler principal de Lambda
export const handler = async (event) => {
  try {
    // Arma la ruta recibida desde API Gateway
    const routeKey = `${event.httpMethod} ${event.resource}`;
    // Busca el controlador que corresponde a la ruta
    const controller = routes[routeKey];

    // Si la ruta no existe, retorna 404
    if (!controller) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: `Ruta ${routeKey} no encontrada`,
        }),
      };
    }

    // Ejecuta el controlador encontrado
    return await controller(event);
  } catch (error) {
    console.error("Error inesperado en handler:", error);
    // Error inesperado del handler
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }
};
