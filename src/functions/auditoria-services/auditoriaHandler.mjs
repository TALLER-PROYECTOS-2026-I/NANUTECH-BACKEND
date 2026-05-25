import { 
  getAuditoriaResumenController, 
  getAuditoriaRegistrosController, 
  exportAuditoriaCsvController 
} from "./auditoriaController.mjs";

/**
 * Mapeo de las rutas HTTP a sus respectivos controladores.
 * En API Gateway usamos Lambda Proxy Integration.
 */
const routes = {
  "GET /auditoria/resumen": getAuditoriaResumenController,
  "GET /auditoria/registros": getAuditoriaRegistrosController,
  "GET /auditoria/exportar/csv": exportAuditoriaCsvController,
};

/**
 * Handler principal para la función Lambda `AuditoriaFunction`.
 * Actúa como un enrutador (Router) inicial para derivar las peticiones
 * a los controladores según el método HTTP y la ruta del recurso.
 *
 * @param {Object} event - Evento entrante desde API Gateway.
 * @returns {Object} Respuesta compatible con API Gateway (statusCode, headers, body).
 */
export const handler = async (event) => {
  try {
    // Generar la llave de ruta (ej. "GET /auditoria/resumen")
    const routeKey = `${event.httpMethod} ${event.resource}`;
    
    // Obtener el controlador asociado a la ruta
    const controller = routes[routeKey];

    // Si la ruta no existe en nuestro mapeo, devolvemos 404
    if (!controller) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: false, message: `Ruta ${routeKey} no encontrada` }),
      };
    }

    // Ejecutar el controlador correspondiente enviado el evento completo
    return await controller(event);
  } catch (error) {
    console.error("Error crítico en auditoriaHandler:", error);
    
    // Respuesta de falla de todo el servicio para que la app no colapse globalmente
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: false, message: "Internal Server Error" }),
    };
  }
};
