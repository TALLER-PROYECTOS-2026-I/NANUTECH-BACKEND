// Importa el controlador principal del dashboard.
import { getDashboardController } from "./dashboardController.mjs";

// Handler principal que recibe el evento HTTP.
// AWS Lambda ejecuta esta función automáticamente.
export const handler = async (event) => {

  // Envía el request al controlador.
  return await getDashboardController(event);
};