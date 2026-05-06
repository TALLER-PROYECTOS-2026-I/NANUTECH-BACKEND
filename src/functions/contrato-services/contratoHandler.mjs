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
  "GET /contratos/{id}": getContratoByIdController,

  "GET /contratos": getAllContratosController,

  // ✅ HU07
  "PUT /contratos/{id}": updateContratoController,
  "PUT /contratos/{id}/unidades": assignUnidadesController,
};

export const handler = async (event) => {
  try {
    const routeKey = `${event.httpMethod} ${event.resource}`;
    const controller = routes[routeKey];

    if (!controller) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Ruta ${routeKey} no encontrada` }),
      };
    }

    return await controller(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
