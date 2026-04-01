import { getAllConductoresController } from "./conductorController.mjs";

const routes = {
  "GET /conductores": getAllConductoresController,
};

export const handler = async (event) => {
  try {
    const routeKey = `${event.httpMethod} ${event.resource}`;
    const controller = routes[routeKey];
    if (!controller) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: false, message: `Ruta ${routeKey} no encontrada` }),
      };
    }
    return await controller(event);
  } catch (error) {
    console.error("Error en handler:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: false, error: "Error interno del servidor", message: error.message }),
    };
  }
};
