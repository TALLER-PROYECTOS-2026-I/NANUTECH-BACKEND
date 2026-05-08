export const buildDashboardGerencialResponse = (
  resumen,
  graficas,
  operaciones,
  rendimiento,
  historial
) => {
  return {
    success: true,
    data: {
      ultimo_actualizacion: new Date().toISOString(),
      estado_sistema: "Sistema activo",
      resumen_general: resumen,
      graficas: graficas,
      operaciones: operaciones,
      rendimiento: rendimiento,
      historial: historial,
    },
  };
};
