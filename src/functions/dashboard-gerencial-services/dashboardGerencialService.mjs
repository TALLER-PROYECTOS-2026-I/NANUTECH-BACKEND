import { dashboardGerencialRepository } from "./dashboardGerencialRepository.mjs";
import { buildDashboardGerencialResponse } from "./dashboardGerencialModel.mjs";

export const getDashboardGerencialService = async (tiempo, search) => {
  const [resumen, graficas, operaciones, rendimiento, historial] = await Promise.all([
    dashboardGerencialRepository.getResumen(tiempo),
    dashboardGerencialRepository.getGraficas(tiempo),
    dashboardGerencialRepository.getOperaciones(),
    dashboardGerencialRepository.getRendimiento(tiempo),
    dashboardGerencialRepository.getHistorial(tiempo, search),
  ]);

  return buildDashboardGerencialResponse(resumen, graficas, operaciones, rendimiento, historial);
};
