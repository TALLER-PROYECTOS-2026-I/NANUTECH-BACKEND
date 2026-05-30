// Conexión a base de datos PostgreSQL
import db from "../../shared/config/database.mjs";

/**
 * Repository encargado de interactuar directamente con la base de datos para operaciones relacionadas a conductores.
 */
export class ConductorRepository {
  /**
   * Obtiene todos los conductores activos.
   *
   * Filtros aplicados:
   * - rol = CHOFER
   * - activo = TRUE
   * - estado = ACTIVO
   *
   * Retorna:
   * Lista de conductores ordenados por apellidos y nombres.
   */
  async getAllActive() {
    const result = await db.query(
      `SELECT
          id,
          cognito_sub,
          correo,
          nombres,
          apellidos,
          rol,
          telefono,
          dni,
          activo,
          estado

       FROM usuarios

       WHERE rol = 'CHOFER'
         AND activo = TRUE
         AND estado = 'ACTIVO'

       ORDER BY apellidos, nombres`
    );

    // Retorna únicamente las filas obtenidas
    return result.rows;
  }

  /**
   * Obtiene estadísticas agregadas de un conductor específico.
   *
   * Funcionalidades:
   * - Total de jornadas
   * - Jornadas completadas
   * - Jornadas activas
   * - Horas totales trabajadas
   * - Promedio de horas por jornada
   * - Estado actual del conductor
   */
  async getConductorStatistics(conductorId) {
    /**
     * Query SQL de agregación.
     *
     * Utiliza:
     * - COUNT()
     * - SUM()
     * - AVG()
     * - CASE
     * - LEFT JOIN
     *
     * para calcular métricas del conductor.
     */
    const query = `

      SELECT
        u.id,
        u.nombres,
        u.apellidos,

        /**
         * Total general de jornadas
         * asociadas al conductor
         */
        COUNT(j.id) AS total_jornadas,

        /**
         * Cantidad de jornadas completadas
         */
        COUNT(
          CASE
            WHEN j.estado = 'COMPLETADA'
            THEN 1
          END
        ) AS jornadas_completadas,

        /**
         * Cantidad de jornadas activas
         * actualmente en proceso
         */
        COUNT(
          CASE
            WHEN j.estado = 'EN_PROCESO'
            THEN 1
          END
        ) AS jornadas_activas,

        /**
         * Suma total de horas trabajadas.
         *
         * Convierte:
         * segundos -> horas decimales
         */
        COALESCE(
          SUM(
            CASE
              WHEN j.estado = 'COMPLETADA'
                AND j.hora_inicio IS NOT NULL
                AND j.hora_fin IS NOT NULL

              THEN EXTRACT(
                EPOCH FROM (
                  j.hora_fin - j.hora_inicio
                )
              ) / 3600

              ELSE 0
            END
          ),
          0
        ) AS horas_totales,

        /**
         * Promedio de horas trabajadas
         * por jornada completada
         */
        COALESCE(
          AVG(
            CASE
              WHEN j.estado = 'COMPLETADA'
                AND j.hora_inicio IS NOT NULL
                AND j.hora_fin IS NOT NULL

              THEN EXTRACT(
                EPOCH FROM (
                  j.hora_fin - j.hora_inicio
                )
              ) / 3600
            END
          ),
          0
        ) AS promedio_horas,

        /**
         * Estado calculado del conductor.
         *
         * Si tiene al menos una jornada
         * EN_PROCESO:
         * -> ACTIVO
         *
         * Caso contrario:
         * -> INACTIVO
         */
        CASE
          WHEN COUNT(
            CASE
              WHEN j.estado = 'EN_PROCESO'
              THEN 1
            END
          ) > 0

          THEN 'ACTIVO'

          ELSE 'INACTIVO'

        END AS estado_actual

      FROM usuarios u

      /**
       * Relación entre conductor
       * y jornadas registradas
       */
      LEFT JOIN jornadas j
        ON j.conductor_id = u.id

      /**
       * Filtra únicamente
       * el conductor solicitado
       */
      WHERE u.id = $1

      /**
       * Agrupación necesaria
       * para funciones agregadas
       */
      GROUP BY
        u.id,
        u.nombres,
        u.apellidos
    `;

    // Ejecuta la query parametrizada
    const result = await db.query(query, [conductorId]);

    // Retorna únicamente una fila
    return result.rows[0];
  }
  /**
   * HU18
   * Obtiene detalle completo del conductor
   */
  async getConductorDetail(conductorId) {
    const query = `
      SELECT
        u.id,
        u.nombres,
        u.apellidos,
        u.correo,
        u.telefono,
        u.dni,

        lc.numero_licencia,
        lc.categoria,
        lc.fecha_emision,
        lc.fecha_vencimiento,
        lc.autoridad_emisora

      FROM usuarios u

      LEFT JOIN licencias_conducir lc
        ON lc.conductor_id = u.id

      WHERE u.id = $1
    `;

    const result = await db.query(query, [conductorId]);

    return result.rows[0];
  }
  /**
   * HU18
   * Actualiza licencia del conductor
   */
  async updateLicencia(conductorId, licenciaData) {
    const query = `
      UPDATE licencias_conducir
      SET
        numero_licencia = $2,
        categoria = $3,
        fecha_emision = $4,
        fecha_vencimiento = $5,
        autoridad_emisora = $6,
        updated_at = NOW()

      WHERE conductor_id = $1

      RETURNING *
    `;

    const result = await db.query(query, [
      conductorId,
      licenciaData.numeroLicencia,
      licenciaData.categoria,
      licenciaData.fechaEmision,
      licenciaData.fechaVencimiento,
      licenciaData.autoridadEmisora,
    ]);

    return result.rows[0];
  }
  /**
   * HU18
   * Obtiene licencia actual
   */
  async getLicenciaActual(conductorId) {
    const result = await db.query(
      `
        SELECT
          id,
          categoria,
          fecha_vencimiento
        FROM licencias_conducir
        WHERE conductor_id = $1
        AND activa = TRUE
        LIMIT 1
        `,
      [conductorId]
    );

    return result.rows[0];
  }
}
