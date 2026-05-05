export const buildDashboardResponse = ({
  kpis,
  alertas,
  graficas,
  topCamiones,
  contratos,
}) => {
  return {
    kpis: kpis ?? {
      totalCamiones: 0,
      contratosActivos: 0,
      alertasActivas: 0,
      ingresos: 0
    },
    alertas: alertas ?? {
      alertasActivas: [],
      contratosPorExpirar: []
    },
    graficas: graficas ?? {
      gps: [],
      camiones: []
    },
    topCamiones: topCamiones ?? [],
    contratos: contratos ?? [],
  };
};