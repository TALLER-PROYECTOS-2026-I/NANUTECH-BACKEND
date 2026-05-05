import {
  getAllVigentesController,
  getIndicadoresController,
  getAllContratosController,
  getContratoByIdController,
  updateContratoController,
  assignUnidadesController,
} from "./contratoController.mjs";

const routes = {
  "GET /contratos/indicadores": getIndicadoresController,
  "GET /contratos/vigentes": getAllVigentesController,
  "GET /contratos": getAllContratosController,
  "GET /contratos/{id}": getContratoByIdController,

  // 🔥 HU07
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
