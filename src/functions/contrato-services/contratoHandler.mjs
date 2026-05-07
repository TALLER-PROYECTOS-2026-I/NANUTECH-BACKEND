import {
  getAllVigentesController,
  createContratoController,
  getIndicadoresController,
  getAllContratosController,
  getContratoByIdController,
} from "./contratoController.mjs";

/**
 * Tabla de rutas del módulo de contratos.
 * Mapea cada combinación "METHOD /ruta" al controller correspondiente.
 * El orden importa: rutas específicas (indicadores, vigentes) deben aparecer
 * antes que la ruta con parámetro ({id}) para evitar que una ruta genérica
 * capture una ruta específica cuando el API Gateway resuelve por coincidencia literal.
 *
 * @type {Object.<string, Function>}
 */
const routes = {
  "GET /contratos/indicadores": getIndicadoresController,
  "GET /contratos/vigentes": getAllVigentesController,
  "POST /contratos": createContratoController,
  "GET /contratos/{id}": getContratoByIdController,
  "GET /contratos": getAllContratosController,
};

/**
 * Handler principal de AWS Lambda para el módulo de contratos.
 * Construye la clave de ruta a partir de httpMethod y resource (API Gateway v1),
 * busca el controller en la tabla de rutas y delega la ejecución.
 * Retorna 404 si la combinación no está registrada, o 500 si el handler lanza
 * un error inesperado no capturado por el controller.
 *
 * @param {Object} event - Evento de AWS Lambda (API Gateway v1)
 * @param {string} event.httpMethod - Método HTTP (GET, POST, PUT, DELETE, etc.)
 * @param {string} event.resource - Recurso de la ruta registrado en API Gateway (ej. /contratos/{id})
 * @returns {Promise<Object>} Respuesta HTTP con formato { statusCode, headers, body }
 */
export const handler = async (event) => {
  try {
    const routeKey = `${event.httpMethod} ${event.resource}`;
    const controller = routes[routeKey];
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
    return await controller(event);
  } catch (error) {
    console.error("Error en handler:", error);
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
