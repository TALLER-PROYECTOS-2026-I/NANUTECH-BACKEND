import { query } from "../../shared/config/database.mjs";

// KPIs
export const getKPIs = async () => {
  try {
    const totalCamiones = await query(`SELECT COUNT(*) FROM unidades`);

    const contratosActivos = await query(`
      SELECT COUNT(*) 
      FROM contratos 
      WHERE fecha_fin >= CURRENT_DATE
    `);

    const alertasActivas = await query(`
      SELECT COUNT(*) 
      FROM alertas_jornada
      WHERE estado = 'ACTIVA'
    `);

    const ingresos = await query(`
      SELECT COALESCE(SUM(tarifa), 0) AS total
      FROM contratos 
      WHERE activo = true
    `);

    return {
      totalCamiones: Number(totalCamiones.rows[0]?.count || 0),
      contratosActivos: Number(contratosActivos.rows[0]?.count || 0),
      alertasActivas: Number(alertasActivas.rows[0]?.count || 0),
      ingresos: Number(ingresos.rows[0]?.total || 0),
    };

  } catch (error) {
    console.error("Error en getKPIs:", error);
    throw error;
  }
};

// ALERTAS
export const getAlertas = async () => {
  try {
    const alertasActivas = await query(`
      SELECT 
        id,
        tipo,
        estado,
        severidad
      FROM alertas_jornada
      WHERE estado = 'ACTIVA'
      ORDER BY severidad DESC
      LIMIT 10
    `);

    const contratosPorExpirar = await query(`
      SELECT id, cliente, tarifa, fecha_fin
      FROM contratos
      WHERE fecha_fin <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY fecha_fin ASC
      LIMIT 10
    `);

    return {
      alertasActivas: (alertasActivas.rows || []).map(a => ({
        id: a.id,
        tipo: a.tipo,
        estado: a.estado,
        severidad: a.severidad
      })),
      contratosPorExpirar: (contratosPorExpirar.rows || []).map(c => ({
        id: c.id,
        cliente: c.cliente,
        tarifa: Number(c.tarifa),
        fecha_fin: c.fecha_fin
      })),
    };

  } catch (error) {
    console.error("Error en getAlertas:", error);
    throw error;
  }
};

// GRAFICAS
export const getGraficas = async () => {
  try {

    const gps = await query(`
      SELECT tipo_evento, COUNT(*) AS total
      FROM gps_eventos
      GROUP BY tipo_evento
      ORDER BY total DESC
    `);

    const camiones = await query(`
      SELECT estado, COUNT(*) AS total
      FROM unidades
      GROUP BY estado
      ORDER BY total DESC
    `);

    return {
      gps: (gps.rows || []).map(r => ({
        tipo_evento: r.tipo_evento,
        total: Number(r.total)
      })),
      camiones: (camiones.rows || []).map(r => ({
        estado: r.estado,
        total: Number(r.total)
      })),
    };

  } catch (error) {
    console.error("Error en getGraficas:", error);

    return {
      gps: [],
      camiones: [],
    };
  }
};

// TOP CAMIONES
export const getTopCamiones = async () => {
  try {
    const result = await query(`
      SELECT 
        u.id AS unidad,
        SUM(j.km_recorridos) AS km
      FROM jornadas j
      JOIN unidades u ON j.unidad_id = u.id
      GROUP BY u.id
      ORDER BY km DESC
      LIMIT 6
    `);

    return (result.rows || []).map(r => ({
      unidad: r.unidad,
      km: Number(r.km)
    }));

  } catch (error) {
    console.error("Error en getTopCamiones:", error);
    throw error;
  }
};

// CONTRATOS ACTIVOS
export const getContratos = async () => {
  try {
    const result = await query(`
      SELECT id, cliente, tarifa, fecha_fin
      FROM contratos
      WHERE activo = true
      AND fecha_fin >= CURRENT_DATE
      ORDER BY fecha_fin ASC
    `);

    return (result.rows || []).map(r => ({
      id: r.id,
      cliente: r.cliente,
      tarifa: Number(r.tarifa),
      fecha_fin: r.fecha_fin
    }));

  } catch (error) {
    console.error("Error en getContratos:", error);
    throw error;
  }
};