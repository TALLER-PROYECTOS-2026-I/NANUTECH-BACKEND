import { query } from "../../shared/config/database.mjs";

const getFechaCondition = (tiempo, colName = "j.fecha_jornada") => {
  switch (tiempo) {
    case "hoy":
      return ` AND ${colName} = CURRENT_DATE`;
    case "semana":
      return ` AND ${colName} >= (CURRENT_DATE - INTERVAL '7 days')`;
    case "mes":
      return ` AND ${colName} >= (CURRENT_DATE - INTERVAL '30 days')`;
    default:
      return ""; // 'todas'
  }
};

export class DashboardGerencialRepository {
  // AC1: Resumen General
  async getResumen(tiempo) {
    const timeCond = getFechaCondition(tiempo, "fecha_jornada");

    const jornadasStats = await query(`
      SELECT 
        COUNT(*) as total_jornadas,
        SUM(CASE WHEN estado = 'COMPLETADA' THEN 1 ELSE 0 END) as completadas,
        COALESCE(SUM(km_recorridos), 0) as total_km,
        COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio))/3600), 0) as total_horas
      FROM jornadas j
      WHERE 1=1 ${getFechaCondition(tiempo, "j.fecha_jornada")}
    `);

    const flota = await query(`SELECT COUNT(*) as total FROM unidades WHERE activo = true`);
    const conductores = await query(
      `SELECT COUNT(*) as total FROM usuarios WHERE rol = 'CHOFER' AND activo = true`
    );
    const contratos = await query(
      `SELECT COUNT(*) as total, COALESCE(SUM(tarifa), 0) as ingresos FROM contratos WHERE activo = true`
    );

    const jStats = jornadasStats.rows[0];
    return {
      jornadas: Number(jStats.total_jornadas),
      jornadas_completadas: Number(jStats.completadas),
      horas_acumuladas: Number(jStats.total_horas).toFixed(2),
      km_totales: Number(jStats.total_km),
      eficiencia:
        jStats.total_jornadas > 0
          ? ((jStats.completadas / jStats.total_jornadas) * 100).toFixed(1) + "%"
          : "0%",
      flota_activa: Number(flota.rows[0].total),
      conductores_activos: Number(conductores.rows[0].total),
      contratos_activos: Number(contratos.rows[0].total),
      ingresos_estimados: Number(contratos.rows[0].ingresos),
    };
  }

  // AC2: Gráficas
  async getGraficas(tiempo) {
    const timeCond = getFechaCondition(tiempo, "j.fecha_jornada");

    // Líneas
    const jornadasPorDia = await query(`
      SELECT fecha_jornada, COUNT(*) as total, SUM(km_recorridos) as km
      FROM jornadas j
      WHERE 1=1 ${timeCond}
      GROUP BY fecha_jornada
      ORDER BY fecha_jornada ASC
      LIMIT 30
    `);

    // Sectores
    const estadoJornadas = await query(
      `SELECT estado, COUNT(*) as total FROM jornadas j WHERE 1=1 ${timeCond} GROUP BY estado`
    );
    const estadoCamiones = await query(
      `SELECT estado, COUNT(*) as total FROM unidades GROUP BY estado`
    );
    const estadoConductores = await query(
      `SELECT estado, COUNT(*) as total FROM usuarios WHERE rol = 'CHOFER' GROUP BY estado`
    );

    return {
      jornadas_por_dia: jornadasPorDia.rows,
      sectores_jornadas: estadoJornadas.rows,
      sectores_camiones: estadoCamiones.rows,
      sectores_conductores: estadoConductores.rows,
    };
  }

  // AC3: Operaciones
  async getOperaciones() {
    const enProgreso = await query(`
      SELECT j.id, u.nombres || ' ' || u.apellidos as conductor, cam.placa as camion, j.hora_inicio
      FROM jornadas j
      JOIN usuarios u ON j.conductor_id = u.id
      JOIN unidades cam ON j.unidad_id = cam.id
      WHERE j.estado = 'EN_PROCESO' OR j.estado = 'PENDIENTE'
    `);

    const mantenimiento = await query(
      `SELECT placa, marca, modelo FROM unidades WHERE estado = 'MANTENIMIENTO'`
    );
    const disponibles = await query(
      `SELECT nombres || ' ' || apellidos as nombre FROM usuarios WHERE rol = 'CHOFER' AND estado = 'ACTIVO'`
    );

    return {
      en_progreso: enProgreso.rows,
      camiones_mantenimiento: mantenimiento.rows,
      conductores_disponibles: disponibles.rows,
    };
  }

  // AC4: Rendimiento
  async getRendimiento(tiempo) {
    const timeCond = getFechaCondition(tiempo, "j.fecha_jornada");

    const topConductores = await query(`
      SELECT u.nombres || ' ' || u.apellidos as conductor, SUM(j.km_recorridos) as km_totales
      FROM jornadas j
      JOIN usuarios u ON j.conductor_id = u.id
      WHERE 1=1 ${timeCond}
      GROUP BY u.id, u.nombres, u.apellidos
      ORDER BY km_totales DESC
      LIMIT 5
    `);

    const topCamiones = await query(`
      SELECT cam.placa, COUNT(j.id) as usos, SUM(j.km_recorridos) as km_totales
      FROM jornadas j
      JOIN unidades cam ON j.unidad_id = cam.id
      WHERE 1=1 ${timeCond}
      GROUP BY cam.id, cam.placa
      ORDER BY usos DESC
      LIMIT 5
    `);

    return {
      top_conductores_km: topConductores.rows,
      top_camiones_uso: topCamiones.rows,
    };
  }

  // AC5: Historial
  async getHistorial(tiempo, search) {
    let queryStr = `
      SELECT 
        j.id, 
        u.nombres || ' ' || u.apellidos as conductor,
        cam.placa as camion,
        j.hora_inicio,
        j.hora_fin,
        j.km_recorridos,
        COALESCE(EXTRACT(EPOCH FROM (j.hora_fin - j.hora_inicio))/3600, 0) as horas_duracion,
        j.estado
      FROM jornadas j
      JOIN usuarios u ON j.conductor_id = u.id
      JOIN unidades cam ON j.unidad_id = cam.id
      WHERE 1=1 ${getFechaCondition(tiempo, "j.fecha_jornada")}
    `;

    if (search) {
      queryStr += ` AND (
        u.nombres ILIKE '%${search}%' OR 
        u.apellidos ILIKE '%${search}%' OR 
        cam.placa ILIKE '%${search}%' OR 
        CAST(j.id AS TEXT) ILIKE '%${search}%'
      )`;
    }

    queryStr += ` ORDER BY j.fecha_jornada DESC LIMIT 100`;

    const result = await query(queryStr);
    return result.rows;
  }
}

export const dashboardGerencialRepository = new DashboardGerencialRepository();
