// Importa el modelo que construye la respuesta final.
import { buildDashboardResponse } from "./dashboardModel.mjs";

// Importa todas las funciones del repositorio.
import {
  getKPIs,
  getAlertas,
  getGraficas,
  getTopCamiones,
  getContratos
} from "./dashboardRepository.mjs";


// Servicio principal del dashboard.
export const getDashboardService = async () => {

  // Ejecuta todas las consultas en paralelo
  // para optimizar el rendimiento.
  const [
    kpis,
    alertas,
    graficas,
    topCamiones,
    contratos
  ] = await Promise.all([

    // Obtiene KPIs.
    getKPIs(),

    // Obtiene alertas.
    getAlertas(),

    // Obtiene gráficas.
    getGraficas(),

    // Obtiene ranking de camiones.
    getTopCamiones(),

    // Obtiene contratos activos.
    getContratos()
  ]);

  // Construye y retorna la respuesta final.
  return buildDashboardResponse({
    kpis,
    alertas,
    graficas,
    topCamiones,
    contratos
  });
};