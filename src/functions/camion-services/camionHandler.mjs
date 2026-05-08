import {
  getAllCamionesController,
  getCamionByIdController,
  createCamionController,
  getPanelCamionesController,
  exportCamionesCsvController,
} from "./camionController.mjs";

/**
 * Mapeo principal de rutas HTTP del módulo de camiones.
 * 
 * Cada endpoint se asocia a un controller específico
 * encargado de ejecutar la lógica correspondiente.
 */

const routes = {
  "GET /camiones": getAllCamionesController,
  "GET /camiones/{id}": getCamionByIdController,
  "POST /camiones": createCamionController,
  "GET /camiones/panel": getPanelCamionesController,
  "GET /camiones/exportar/csv": exportCamionesCsvController,
};

/**
 * Punto de entrada principal del módulo de camiones.
 * 
 * Este handler identifica la ruta HTTP solicitada
 * y delega el procesamiento al controller correspondiente.
 * 
 * También centraliza el manejo de errores HTTP.
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
    console.error("Error en camionHandler:", error);

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