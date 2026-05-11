// ===============================
// dashboardRepository.mjs
// ===============================

// Importa conexión PostgreSQL.
import { query }
from "../../shared/config/database.mjs";


// ======================================================
// KPIs PRINCIPALES
// ======================================================
export const getKPIs = async () => {

  try {

    const totalCamiones = await query(`
      SELECT COUNT(*)
      FROM unidades
    `);

    const contratosActivos = await query(`
      SELECT COUNT(*)
      FROM contratos
      WHERE estado = 'VIGENTE'
    `);

    const alertasActivas = await query(`
      SELECT COUNT(*)
      FROM gps_registros
      WHERE estado = 'EXCESO_VELOCIDAD'
    `);

    const ingresos = await query(`
      SELECT COALESCE(
        SUM(tarifa),
        0
      ) AS total
      FROM contratos
      WHERE estado = 'VIGENTE'
    `);

    const jornadasCompletadas =
      await query(`
        SELECT COUNT(*)
        FROM jornadas
        WHERE estado = 'COMPLETADA'
      `);

    const jornadasActivas =
      await query(`
        SELECT COUNT(*)
        FROM jornadas
        WHERE estado = 'EN_PROCESO'
      `);

    const horasTotales =
      await query(`
        SELECT COALESCE(

          SUM(
            EXTRACT(
              EPOCH FROM (
                hora_fin - hora_inicio
              )
            ) / 3600
          ),

          0

        ) AS total

        FROM jornadas

        WHERE hora_inicio IS NOT NULL
        AND hora_fin IS NOT NULL
      `);

    const kilometrosTotales =
      await query(`
        SELECT COALESCE(
          SUM(km_recorridos),
          0
        ) AS total
        FROM jornadas
      `);

    return {

      totalCamiones: Number(
        totalCamiones.rows[0]?.count || 0
      ),

      contratosActivos: Number(
        contratosActivos.rows[0]?.count || 0
      ),

      alertasActivas: Number(
        alertasActivas.rows[0]?.count || 0
      ),

      ingresos: Number(
        ingresos.rows[0]?.total || 0
      ),

      jornadasCompletadas: Number(
        jornadasCompletadas.rows[0]?.count || 0
      ),

      jornadasActivas: Number(
        jornadasActivas.rows[0]?.count || 0
      ),

      horasTotales: Number(
        Number(
          horasTotales.rows[0]?.total || 0
        ).toFixed(2)
      ),

      kilometrosTotales: Number(
        kilometrosTotales.rows[0]?.total || 0
      )
    };

  } catch (error) {

    console.error(
      "Error en getKPIs:",
      error
    );

    throw error;
  }
};


// ======================================================
// ALERTAS
// ======================================================
export const getAlertas = async () => {

  try {

    const alertasActivas =
      await query(`
        SELECT

          gr.id,

          u.placa,

          gr.velocidad_kmh,

          gr.estado,

          gr.fecha_hora

        FROM gps_registros gr

        INNER JOIN unidades u
          ON gr.unidad_id = u.id

        WHERE gr.estado =
          'EXCESO_VELOCIDAD'

        ORDER BY gr.fecha_hora DESC

        LIMIT 10
      `);

    const contratosPorExpirar =
      await query(`
        SELECT

          id,

          cliente,

          tarifa,

          fecha_fin

        FROM contratos

        WHERE fecha_fin
        BETWEEN CURRENT_DATE

        AND CURRENT_DATE
        + INTERVAL '30 days'

        ORDER BY fecha_fin ASC

        LIMIT 10
      `);

    return {

      alertasActivas: (
        alertasActivas.rows || []
      ).map(a => ({

        id: a.id,

        placa: a.placa,

        velocidad_kmh: Number(
          a.velocidad_kmh
        ),

        estado: a.estado,

        tipo: "EXCESO_VELOCIDAD",

        severidad: "ALTA",

        fecha_hora: a.fecha_hora
      })),

      contratosPorExpirar: (
        contratosPorExpirar.rows || []
      ).map(c => ({

        id: c.id,

        cliente: c.cliente,

        tarifa: Number(c.tarifa),

        fecha_fin: c.fecha_fin
      }))
    };

  } catch (error) {

    console.error(
      "Error en getAlertas:",
      error
    );

    throw error;
  }
};


// ======================================================
// GRÁFICAS
// ======================================================
export const getGraficas = async () => {

  try {

    const gps = await query(`
      SELECT

        estado,

        COUNT(*) AS total

      FROM gps_registros

      GROUP BY estado

      ORDER BY total DESC
    `);

    const camiones = await query(`
      SELECT

        estado,

        COUNT(*) AS total

      FROM unidades

      GROUP BY estado

      ORDER BY total DESC
    `);

    const totalGPS =
      (gps.rows || []).reduce(

        (acc, item) => {

          return acc +
            Number(item.total);

        },

        0
      );

    const totalCamiones =
      (camiones.rows || []).reduce(

        (acc, item) => {

          return acc +
            Number(item.total);

        },

        0
      );

    return {

      gps: (gps.rows || []).map(r => {

        const total =
          Number(r.total);

        return {

          tipo_evento: r.estado,

          total,

          porcentaje:

            totalGPS === 0
              ? 0
              : Number(
                  (
                    (total / totalGPS)
                    * 100
                  ).toFixed(2)
                )
        };
      }),

      camiones: (
        camiones.rows || []
      ).map(r => {

        const total =
          Number(r.total);

        return {

          estado: r.estado,

          total,

          porcentaje:

            totalCamiones === 0
              ? 0
              : Number(
                  (
                    (total / totalCamiones)
                    * 100
                  ).toFixed(2)
                )
        };
      })
    };

  } catch (error) {

    console.error(
      "Error en getGraficas:",
      error
    );

    return {

      gps: [],

      camiones: []
    };
  }
};


// ======================================================
// TOP CAMIONES
// ======================================================
export const getTopCamiones = async () => {

  try {

    const result = await query(`
      SELECT

        u.id AS unidad,

        u.placa,

        u.modelo,

        COALESCE(
          SUM(j.km_recorridos),
          0
        ) AS kilometros,

        COALESCE(

          SUM(
            EXTRACT(
              EPOCH FROM (
                j.hora_fin - j.hora_inicio
              )
            ) / 3600
          ),

          0

        ) AS horas

      FROM jornadas j

      INNER JOIN unidades u
        ON j.unidad_id = u.id

      GROUP BY

        u.id,
        u.placa,
        u.modelo

      ORDER BY kilometros DESC

      LIMIT 6
    `);

    return (result.rows || []).map(r => {

      const kilometros =
        Number(r.kilometros);

      const horas =
        Number(r.horas);

      return {

        unidad: r.unidad,

        placa: r.placa,

        modelo: r.modelo,

        km: kilometros,

        kilometros,

        horas: Number(
          horas.toFixed(2)
        ),

        eficiencia:

          horas === 0
            ? 0
            : Number(
                (
                  kilometros / horas
                ).toFixed(2)
              )
      };
    });

  } catch (error) {

    console.error(
      "Error en getTopCamiones:",
      error
    );

    throw error;
  }
};