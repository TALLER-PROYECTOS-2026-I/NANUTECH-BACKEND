import {
  getAllConductoresController,
  getConductorStatisticsController,
  updateLicenciaController,
  getLicenciaController,
  getConductorDetailController,
  crearConductorController,
} from "./conductorController.mjs";
/**
 * Objeto que actúa como mapa de rutas.
 *
 * Relaciona:
 * "METHOD PATH" -> controller correspondiente
 *
 * Ejemplo:
 * GET /conductores
 * GET /conductores/{id}/estadisticas
 */
const routes = {
  // Endpoint para listar conductores activos
  "GET /conductores": getAllConductoresController,

  // Endpoint para obtener estadísticas
  // agregadas de un conductor
  "GET /conductores/{id}/estadisticas": getConductorStatisticsController,

  /************************************************
   * HU18 - Actualizar licencia del conductor
   ***********************************************/
  "PUT /conductores/licencia": updateLicenciaController,

  "GET /conductores/licencia": getLicenciaController,
  /**
   * =========================================================
   * HU18
   * Obtiene detalle completo del conductor.
   * =========================================================
   */
  "GET /conductores/{id}": getConductorDetailController,

  // Enpoint para crear nuevo conductor
  "POST /conductores": crearConductorController,
};

/**
 * Handler principal de la Lambda.
 *
 * Funcionalidad:
 * - Recibe el evento HTTP desde API Gateway
 * - Identifica la ruta solicitada
 * - Busca el controller correspondiente
 * - Ejecuta el controller
 * - Maneja errores globales
 */
export const handler = async (event) => {
  try {
    /**
     * Construye la clave de ruta.
     *
     * Ejemplo:
     * "GET /conductores"
     * "GET /conductores/{id}/estadisticas"
     */
    const routeKey = `${event.httpMethod} ${event.resource}`;

    // Busca el controller asociado a la ruta
    const controller = routes[routeKey];

    /**
     * Si no existe un controller para la ruta,
     * retorna error 404
     */
    if (!controller) {
      return {
        statusCode: 404,

        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },

        body: JSON.stringify({
          success: false,
          message: `Ruta ${routeKey} no encontrada`,
        }),
      };
    }

    // Ejecuta el controller encontrado
    return await controller(event);
  } catch (error) {
    // Log de errores globales del handler
    console.error("Error en handler:", error);

    // Respuesta HTTP 500
    return {
      statusCode: 500,

      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },

      body: JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        message: error.message,
      }),
    };
  }
};
