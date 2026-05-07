import {
  getAllVigentesController,
  createContratoController,
  getIndicadoresController,
  getAllContratosController,
  getContratoByIdController,
  updateContratoController,
  assignUnidadesController,
} from "./contratoController.mjs";

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
