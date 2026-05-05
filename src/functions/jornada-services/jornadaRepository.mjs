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

const DURATION_SQL = `
  CASE
    WHEN j.hora_fin IS NOT NULL
      THEN LPAD((EXTRACT(EPOCH FROM (j.hora_fin - j.hora_inicio))::BIGINT / 3600)::TEXT, 2, '0') || ':' ||
           LPAD(((EXTRACT(EPOCH FROM (j.hora_fin - j.hora_inicio))::BIGINT % 3600) / 60)::TEXT, 2, '0')
    WHEN j.estado = 'EN_PROCESO' THEN 'En curso'
    WHEN j.estado = 'REGISTRADA' THEN 'Sin iniciar'
    ELSE '-'
  END
`;

function buildFilters({ q, conductor_id, fecha_desde, fecha_hasta } = {}) {
  const conditions = [];
  const params = [];

  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    conditions.push(`(un.placa ILIKE $${idx} OR u.nombres || ' ' || u.apellidos ILIKE $${idx})`);
  }
  if (conductor_id) {
    params.push(conductor_id);
    conditions.push(`j.conductor_id = $${params.length}`);
  }
  if (fecha_desde) {
    params.push(fecha_desde);
    conditions.push(`j.fecha_jornada >= $${params.length}`);
  }
  if (fecha_hasta) {
    params.push(fecha_hasta);
    conditions.push(`j.fecha_jornada <= $${params.length}`);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

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
      const query = `${BASE_SELECT} WHERE id = $1 LIMIT 1;`;
      const result = await client.query(query, [jornadaId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async findCurrentByConductorId(conductorId) {
    const client = await getClient();

    try {
      const query = `
        ${BASE_SELECT}
        WHERE conductor_id = $1
          AND estado IN ('REGISTRADA', 'PENDIENTE', 'EN_PROCESO')
        ORDER BY created_at DESC
        LIMIT 1;
      `;
      const result = await client.query(query, [conductorId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async checkUnidadActiva(unidadId) {
    const client = await getClient();

    try {
      const query = `
        SELECT id
        FROM jornadas
        WHERE unidad_id = $1
          AND estado IN ('REGISTRADA', 'PENDIENTE', 'EN_PROCESO')
        LIMIT 1;
      `;
      const result = await client.query(query, [unidadId]);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async checkConductorActivo(conductorId) {
    const client = await getClient();

    try {
      const query = `
        SELECT id
        FROM jornadas
        WHERE conductor_id = $1
          AND estado IN ('REGISTRADA', 'PENDIENTE', 'EN_PROCESO')
        LIMIT 1;
      `;
      const result = await client.query(query, [conductorId]);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async startTurn(jornadaId) {
    const client = await getClient();

    try {
      const query = `
        UPDATE jornadas
        SET
          hora_inicio = NOW(),
          estado = 'EN_PROCESO',
          updated_at = NOW()
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
          updated_at;
      `;
      const result = await client.query(query, [jornadaId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async finishTurn(jornadaId, observaciones) {
    const client = await getClient();

    try {
      const query = `
        UPDATE jornadas
        SET
          hora_fin = NOW(),
          estado = 'COMPLETADA',
          observaciones = COALESCE($2, observaciones),
          updated_at = NOW()
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
          EXTRACT(EPOCH FROM (hora_fin - hora_inicio))::BIGINT AS duracion_total_segundos;
      `;
      const result = await client.query(query, [jornadaId, observaciones]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async findAll(filtros = {}) {
    const client = await getClient();
    try {
      const { whereClause, params } = buildFilters(filtros);
      const result = await client.query(`
        SELECT
          j.id,
          j.fecha_jornada AS fecha,
          u.nombres || ' ' || u.apellidos AS conductor,
          un.placa || ' - ' || un.marca || ' ' || un.modelo AS camion,
          c.codigo AS contrato,
          CASE
            WHEN j.hora_inicio IS NOT NULL AND j.hora_fin IS NOT NULL
              THEN TO_CHAR(j.hora_inicio, 'HH:MI AM') || ' - ' || TO_CHAR(j.hora_fin, 'HH:MI AM')
            WHEN j.hora_inicio IS NOT NULL
              THEN TO_CHAR(j.hora_inicio, 'HH:MI AM') || ' - En curso'
            ELSE 'Sin iniciar'
          END AS horario,
          j.km_recorridos AS km,
          j.estado,
          j.observaciones,
          ${DURATION_SQL} AS duracion_total,
          (j.observaciones IS NOT NULL AND j.observaciones <> '') AS tiene_observaciones
        FROM jornadas j
        JOIN usuarios u ON u.id = j.conductor_id
        JOIN unidades un ON un.id = j.unidad_id
        JOIN contratos c ON c.id = j.contrato_id
        ${whereClause}
        ORDER BY j.created_at DESC;
      `, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async exportAll(filtros = {}) {
    const client = await getClient();
    try {
      const { whereClause, params } = buildFilters(filtros);
      const result = await client.query(`
        SELECT
          j.id,
          TO_CHAR(j.fecha_jornada, 'YYYY-MM-DD') AS fecha,
          u.nombres || ' ' || u.apellidos AS conductor,
          un.placa,
          c.codigo AS contrato,
          TO_CHAR(j.hora_inicio, 'YYYY-MM-DD HH24:MI:SS') AS hora_inicio,
          TO_CHAR(j.hora_fin, 'YYYY-MM-DD HH24:MI:SS') AS hora_fin,
          ${DURATION_SQL} AS duracion_total,
          j.km_recorridos,
          j.estado,
          j.observaciones
        FROM jornadas j
        JOIN usuarios u ON u.id = j.conductor_id
        JOIN unidades un ON un.id = j.unidad_id
        JOIN contratos c ON c.id = j.contrato_id
        ${whereClause}
        ORDER BY j.created_at DESC;
      `, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
}
