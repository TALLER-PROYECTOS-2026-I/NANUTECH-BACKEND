// Función que construye la respuesta final del dashboard.
export const buildDashboardResponse = ({

  // KPIs principales del dashboard.
  kpis,

  // Información de alertas activas.
  alertas,

  // Datos utilizados para gráficas.
  graficas,

  // Ranking de camiones.
  topCamiones,

  // Lista de contratos.
  contratos,
}) => {

  // Retorna la estructura consolidada.
  return {

    // KPIs generales.
    // Si no existen datos, asigna valores por defecto.
    kpis: kpis ?? {
      totalCamiones: 0,
      contratosActivos: 0,
      alertasActivas: 0,
      ingresos: 0
    },

    // Alertas del sistema.
    alertas: alertas ?? {
      alertasActivas: [],
      contratosPorExpirar: []
    },

    // Información de gráficas.
    graficas: graficas ?? {
      gps: [],
      camiones: []
    },

    // Top de camiones con mayor recorrido.
    topCamiones: topCamiones ?? [],

    // Contratos activos.
    contratos: contratos ?? [],
  };
};