import {
  getAllVigentesController,
  createContratoController,
  getIndicadoresController,
  getAllContratosController,
  getContratoByIdController,
  updateContratoController,
  assignUnidadesController,
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

  // ✅ HU14
  "POST /contratos": createContratoController,

  // 🔥 HU07 - Obtención del detalle de contrato
  // Permite visualizar información completa del contrato seleccionado.
  "GET /contratos/{id}": getContratoByIdController,

  "GET /contratos": getAllContratosController,

  // 🔥 HU07 - Actualización de contrato
  // Endpoint encargado de editar datos configurables del contrato
  // como tarifas, fechas, estado y demás información asociada.
  "PUT /contratos/{id}": updateContratoController,

  // 🔥 HU07 - Asignación de múltiples unidades
  // Permite vincular varios camiones al contrato seleccionado.
  "PUT /contratos/{id}/unidades": assignUnidadesController,
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
    // Construcción dinámica de la ruta solicitada
    const routeKey = `${event.httpMethod} ${event.resource}`;

    // Obtención del controlador correspondiente
    const controller = routes[routeKey];

    // Validación de existencia de la ruta
    if (!controller) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Ruta ${routeKey} no encontrada` }),
      };
    }

    // Ejecución del controlador asociado a la ruta
    return await controller(event);
  } catch (error) {
    // Manejo general de errores del handler
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
