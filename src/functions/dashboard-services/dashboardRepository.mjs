// Importa la función query para ejecutar consultas SQL.
import { query } from "../../shared/config/database.mjs";

// KPIs
// Obtiene los indicadores principales del dashboard.
export const getKPIs = async () => {

  try {

    // Cuenta el total de camiones registrados.
    const totalCamiones = await query(`
      SELECT COUNT(*) FROM unidades
    `);

    // Cuenta contratos vigentes.
    const contratosActivos = await query(`
      SELECT COUNT(*) 
      FROM contratos 
      WHERE fecha_fin >= CURRENT_DATE
    `);

    // Cuenta alertas activas.
    const alertasActivas = await query(`
      SELECT COUNT(*) 
      FROM alertas_jornada
      WHERE estado = 'ACTIVA'
    `);

    // Suma ingresos de contratos activos.
    const ingresos = await query(`
      SELECT COALESCE(SUM(tarifa), 0) AS total
      FROM contratos 
      WHERE activo = true
    `);

    // Retorna los KPIs formateados.
    return {
      totalCamiones: Number(totalCamiones.rows[0]?.count || 0),
      contratosActivos: Number(contratosActivos.rows[0]?.count || 0),
      alertasActivas: Number(alertasActivas.rows[0]?.count || 0),
      ingresos: Number(ingresos.rows[0]?.total || 0),
    };

  } catch (error) {

    // Muestra error en consola.
    console.error("Error en getKPIs:", error);

    // Propaga el error.
    throw error;
  }
};

// ALERTAS
// Obtiene alertas activas y contratos por expirar.
export const getAlertas = async () => {

  try {

    // Consulta alertas activas.
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

    // Consulta contratos próximos a vencer.
    const contratosPorExpirar = await query(`
      SELECT id, cliente, tarifa, fecha_fin
      FROM contratos
      WHERE fecha_fin <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY fecha_fin ASC
      LIMIT 10
    `);

    // Retorna datos transformados.
    return {

      // Lista de alertas activas.
      alertasActivas: (alertasActivas.rows || []).map(a => ({
        id: a.id,
        tipo: a.tipo,
        estado: a.estado,
        severidad: a.severidad
      })),

      // Lista de contratos por expirar.
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
// Obtiene información estadística para gráficas.
export const getGraficas = async () => {

  try {

    // Consulta eventos GPS agrupados por tipo.
    const gps = await query(`
      SELECT tipo_evento, COUNT(*) AS total
      FROM gps_eventos
      GROUP BY tipo_evento
      ORDER BY total DESC
    `);

    // Consulta estados de camiones.
    const camiones = await query(`
      SELECT estado, COUNT(*) AS total
      FROM unidades
      GROUP BY estado
      ORDER BY total DESC
    `);

    // Retorna información procesada.
    return {

      // Datos gráficos GPS.
      gps: (gps.rows || []).map(r => ({
        tipo_evento: r.tipo_evento,
        total: Number(r.total)
      })),

      // Datos gráficos de camiones.
      camiones: (camiones.rows || []).map(r => ({
        estado: r.estado,
        total: Number(r.total)
      })),
    };

  } catch (error) {

    console.error("Error en getGraficas:", error);

    // Si falla, retorna arrays vacíos.
    return {
      gps: [],
      camiones: [],
    };
  }
};

// TOP CAMIONES
// Obtiene los camiones con mayor kilometraje.
export const getTopCamiones = async () => {

  try {

    // Consulta kilómetros recorridos por unidad.
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

    // Retorna datos procesados.
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
// Obtiene contratos activos.
export const getContratos = async () => {

  try {

    // Consulta contratos vigentes.
    const result = await query(`
      SELECT id, cliente, tarifa, fecha_fin
      FROM contratos
      WHERE activo = true
      AND fecha_fin >= CURRENT_DATE
      ORDER BY fecha_fin ASC
    `);

    // Retorna contratos procesados.
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