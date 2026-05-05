import { buildDashboardResponse } from "./dashboardModel.mjs";

import {
  getKPIs,
  getAlertas,
  getGraficas,
  getTopCamiones,
  getContratos
} from "./dashboardRepository.mjs";

export const getDashboardService = async () => {
  const [
    kpis,
    alertas,
    graficas,
    topCamiones,
    contratos
  ] = await Promise.all([
    getKPIs(),
    getAlertas(),
    getGraficas(),
    getTopCamiones(),
    getContratos()
  ]);

  return buildDashboardResponse({
    kpis,
    alertas,
    graficas,
    topCamiones,
    contratos
  });
};