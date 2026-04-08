import { getClient } from "../../shared/config/database.mjs";

const BASE_SELECT = `
  SELECT
    id,
    conductor_id,
    unidad_id,
    contrato_id,
    creado_por,
    fecha_jornada,
    hora_inicio,
    hora_fin,
    origen,
    destino,
    km_recorridos,
    observaciones,
    estado,
    created_at,
    updated_at
  FROM jornadas
`;

export class JornadaRepository {
  async create(jornadaData) {
    const client = await getClient();
    try {
      const query = `
        INSERT INTO jornadas (
          conductor_id,
          unidad_id,
          contrato_id,
          creado_por,
          fecha_jornada,
          origen,
          destino,
          km_recorridos,
          observaciones,
          estado
        )
        VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7, $8, $9, $10)
        RETURNING
          id,
          conductor_id,
          unidad_id,
          contrato_id,
          creado_por,
          fecha_jornada,
          hora_inicio,
          hora_fin,
          origen,
          destino,
          km_recorridos,
          observaciones,
          estado,
          created_at,
          updated_at;
      `;
      const values = [
        jornadaData.conductor_id,
        jornadaData.unidad_id,
        jornadaData.contrato_id,
        jornadaData.creado_por,
        jornadaData.fecha_jornada,
        jornadaData.origen,
        jornadaData.destino,
        jornadaData.km_recorridos,
        jornadaData.observaciones,
        jornadaData.estado,
      ];
      const result = await client.query(query, values);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async findById(jornadaId) {
    const client = await getClient();
    try {
      const result = await client.query(
        `${BASE_SELECT} WHERE id = $1 LIMIT 1;`,
        [jornadaId],
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async findCurrentByConductorId(conductorId) {
    const client = await getClient();
    try {
      const result = await client.query(
        `${BASE_SELECT}
         WHERE conductor_id = $1
           AND estado IN ('REGISTRADA', 'EN_PROCESO')
         ORDER BY created_at DESC
         LIMIT 1;`,
        [conductorId],
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async checkUnidadActiva(unidadId) {
    const client = await getClient();
    try {
      const result = await client.query(
        `SELECT id
         FROM jornadas
         WHERE unidad_id = $1
           AND estado IN ('REGISTRADA', 'EN_PROCESO')
         LIMIT 1;`,
        [unidadId],
      );
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async checkConductorActivo(conductorId) {
    const client = await getClient();
    try {
      const result = await client.query(
        `SELECT id
         FROM jornadas
         WHERE conductor_id = $1
           AND estado IN ('REGISTRADA', 'EN_PROCESO')
         LIMIT 1;`,
        [conductorId],
      );
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async startTurn(jornadaId) {
    const client = await getClient();
    try {
      const result = await client.query(
        `UPDATE jornadas
         SET
           hora_inicio = NOW(),
           estado = 'EN_PROCESO'
         WHERE id = $1
         RETURNING
           id,
           conductor_id,
           unidad_id,
           contrato_id,
           creado_por,
           fecha_jornada,
           hora_inicio,
           hora_fin,
           origen,
           destino,
           km_recorridos,
           observaciones,
           estado,
           created_at,
           updated_at;`,
        [jornadaId],
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async finishTurn(jornadaId, observaciones) {
    const client = await getClient();
    try {
      const result = await client.query(
        `UPDATE jornadas
         SET
           hora_fin = NOW(),
           estado = 'COMPLETADA',
           observaciones = COALESCE($2, observaciones)
         WHERE id = $1
         RETURNING
           id,
           conductor_id,
           unidad_id,
           contrato_id,
           creado_por,
           fecha_jornada,
           hora_inicio,
           hora_fin,
           origen,
           destino,
           km_recorridos,
           observaciones,
           estado,
           created_at,
           updated_at,
           CASE
             WHEN hora_inicio IS NOT NULL AND hora_fin IS NOT NULL
               THEN EXTRACT(EPOCH FROM (hora_fin - hora_inicio))::BIGINT
             ELSE NULL
           END AS duracion_total_segundos;`,
        [jornadaId, observaciones],
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
}
