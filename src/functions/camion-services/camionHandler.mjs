// src/handlers/camion.mjs
import {
  getAllCamionesController,
  getCamionByIdController,
  createCamionController,
  getPanelCamionesController,
  exportCamionesCsvController,
} from "./camionController.mjs";

const routes = {
  "GET /camiones": getAllCamionesController,
  "GET /camiones/{id}": getCamionByIdController,
  "POST /camiones": createCamionController,
  "GET /camiones/panel": getPanelCamionesController,
  "GET /camiones/exportar/csv": exportCamionesCsvController,
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
