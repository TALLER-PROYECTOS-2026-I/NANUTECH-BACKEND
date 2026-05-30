import { getClient } from "../../shared/config/database.mjs";


/**
 * Repositorio de acceso a datos para HU15.
 *
 * Responsabilidades:
 * - Consultar jornadas activas.
 * - Consultar kilometraje previo.
 * - Registrar abastecimientos.
 * - Actualizar odómetro de la unidad.
 * - Consultar historial por jornada.
 *
 * Este componente NO contiene reglas de negocio.
 * Todas las validaciones se realizan en el Service.
 */
export class CombustibleRepository {

      /**
   * Busca una jornada activa (EN_PROCESO) para un conductor.
   *
   * Se utiliza antes de registrar combustible para asegurar
   * que la jornada se encuentra operativa.
   */
  async findJornadaEnProceso(jornadaId, conductorId) {
    const client = await getClient();

    try {
      const result = await client.query(
        `
        SELECT
          j.id,
          j.conductor_id,
          j.unidad_id,
          j.contrato_id,
          j.estado,
          u.placa,
          u.kilometraje_actual AS kilometraje_unidad
        FROM jornadas j
        JOIN unidades u ON u.id = j.unidad_id
        WHERE j.id = $1
          AND j.conductor_id = $2
          AND j.estado = 'EN_PROCESO'
        LIMIT 1
        `,
        [jornadaId, conductorId]
      );

      return result.rows[0] ?? null;
    } finally {
      client.release();
    }
  }


    /**
   * Obtiene el último kilometraje conocido de una unidad.
   *
   * Prioridad:
   * 1. Último registro en combustible_registros.
   * 2. Kilometraje actual de la tabla unidades.
   * 3. Valor por defecto = 0.
   */
  async getUltimoKilometraje(unidadId) {
    const client = await getClient();

    try {
      const result = await client.query(
        `
        SELECT
          COALESCE(
            (
              SELECT cr.kilometraje_actual
              FROM combustible_registros cr
              WHERE cr.unidad_id = $1
                AND cr.estado <> 'ANULADO'
              ORDER BY cr.registrado_at DESC, cr.created_at DESC
              LIMIT 1
            ),
            (
              SELECT u.kilometraje_actual
              FROM unidades u
              WHERE u.id = $1
              LIMIT 1
            ),
            0
          ) AS ultimo_kilometraje
        `,
        [unidadId]
      );

      return Number(result.rows[0]?.ultimo_kilometraje ?? 0);
    } finally {
      client.release();
    }
  }



    /**
   * Registra un abastecimiento de combustible.
   *
   * Operaciones realizadas:
   * 1. Inserta registro en combustible_registros.
   * 2. Actualiza kilometraje_actual de la unidad.
   * 3. Ejecuta ambas acciones dentro de una transacción.
   */
  async createRegistro(data) {
    const client = await getClient();

    try {
      await client.query("BEGIN");

      const insertResult = await client.query(
        `
        INSERT INTO combustible_registros (
          jornada_id,
          unidad_id,
          conductor_id,
          contrato_id,
          tipo_comprobante,
          numero_comprobante,
          galones,
          costo_total,
          kilometraje_actual,
          kilometraje_anterior,
          rendimiento_km_galon,
          foto_comprobante_url,
          observaciones,
          latitud,
          longitud,
          estado,
          sincronizado,
          registrado_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18
        )
        RETURNING *
        `,
        [
          data.jornada_id,
          data.unidad_id,
          data.conductor_id,
          data.contrato_id,
          data.tipo_comprobante,
          data.numero_comprobante,
          data.galones,
          data.costo_total,
          data.kilometraje_actual,
          data.kilometraje_anterior,
          data.rendimiento_km_galon,
          data.foto_comprobante_url,
          data.observaciones,
          data.latitud,
          data.longitud,
          data.estado,
          data.sincronizado,
          data.registrado_at,
        ]
      );

      await client.query(
        `
        UPDATE unidades
        SET kilometraje_actual = $1,
            updated_at = NOW()
        WHERE id = $2
        `,
        [data.kilometraje_actual, data.unidad_id]
      );

      await client.query("COMMIT");

      return insertResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }



    /**
   * Obtiene todos los abastecimientos registrados
   * para una jornada específica.
   *
   * Se ordena del más reciente al más antiguo.
   */
  async findByJornada(jornadaId) {
    const client = await getClient();

    try {
      const result = await client.query(
        `
        SELECT *
        FROM combustible_registros
        WHERE jornada_id = $1
        ORDER BY registrado_at DESC, created_at DESC
        `,
        [jornadaId]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }
}