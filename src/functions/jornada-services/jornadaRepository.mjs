import { getClient } from "../../shared/config/database.mjs";
import { ALERT_TYPES } from "../../shared/constants/alertTypes.mjs";

/**
 * Columnas base seleccionadas en consultas simples sobre la tabla jornadas.
 * No incluye JOINs con otras tablas; para vistas enriquecidas con datos de
 * conductor, unidad y contrato, usar findAll o exportAll.
 *
 * @type {string}
 */
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

/**
 * Fragmento SQL que calcula la duración de una jornada en formato HH:MM.
 * Lógica por caso:
 * - Si hora_fin está definida: calcula la diferencia en segundos y la formatea con LPAD.
 * - Si el estado es EN_PROCESO: retorna 'En curso' (jornada todavía activa).
 * - Si el estado es REGISTRADA: retorna 'Sin iniciar' (aún no arrancó).
 * - En cualquier otro caso: retorna '-'.
 *
 * Requiere que la tabla jornadas esté aliasada como `j` en la consulta principal.
 *
 * @type {string}
 */
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

/**
 * Construye la cláusula WHERE y el arreglo de parámetros para filtrar jornadas.
 * Usa parámetros numerados ($1, $2, …) compatibles con node-postgres para evitar inyección SQL.
 * La búsqueda por texto `q` aplica ILIKE simultáneamente sobre placa y nombre completo del conductor.
 *
 * @param {Object} [options={}] - Criterios de filtrado
 * @param {string} [options.q] - Texto libre; busca en `un.placa` y en `u.nombres || ' ' || u.apellidos`
 * @param {string|number} [options.conductor_id] - Filtra exacto por `j.conductor_id`
 * @param {string} [options.fecha_desde] - Límite inferior de `j.fecha_jornada` (YYYY-MM-DD, inclusive)
 * @param {string} [options.fecha_hasta] - Límite superior de `j.fecha_jornada` (YYYY-MM-DD, inclusive)
 * @returns {{ whereClause: string, params: Array }} Cláusula WHERE lista para interpolación y arreglo de valores
 */
function buildFilters({
  q,
  conductor_id,
  fecha_desde,
  fecha_hasta,
  estado_alerta,
  observaciones,
} = {}) {
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
  if (estado_alerta) {
    params.push(estado_alerta);
    conditions.push(`a.tipo_alerta = $${params.length}`);
  }
  if (observaciones === "true") {
    conditions.push(`j.observaciones IS NOT NULL AND j.observaciones <> ''`);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

/**
 * Repositorio de acceso a datos para la entidad Jornada.
 * Obtiene clientes de la pool y los libera en el bloque finally de cada operación.
 */
export class JornadaRepository {
  /**
   * Inserta una nueva jornada en la base de datos.
   * Si no se provee fecha_jornada, PostgreSQL usa CURRENT_DATE mediante COALESCE.
   *
   * @param {Object} jornadaData - Datos validados de la jornada
   * @param {number} jornadaData.conductor_id - ID del conductor
   * @param {number} jornadaData.unidad_id - ID de la unidad
   * @param {number} jornadaData.contrato_id - ID del contrato
   * @param {number} jornadaData.creado_por - ID del usuario que registra la jornada
   * @param {string|null} [jornadaData.fecha_jornada] - Fecha de la jornada (null → CURRENT_DATE)
   * @param {string} [jornadaData.origen] - Origen del recorrido
   * @param {string} [jornadaData.destino] - Destino del recorrido
   * @param {number} [jornadaData.km_recorridos] - Kilómetros estimados del recorrido
   * @param {string} [jornadaData.observaciones] - Observaciones iniciales
   * @param {string} jornadaData.estado - Estado inicial de la jornada (ej. REGISTRADA)
   * @returns {Promise<Object|null>} Fila insertada con todos sus campos, o null si falló
   */
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

  /**
   * Busca una jornada por su ID primario usando BASE_SELECT.
   *
   * @param {number|string} jornadaId - ID de la jornada
   * @returns {Promise<Object|null>} Fila de la jornada o null si no existe
   */
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

  /**
   * Busca la jornada activa más reciente de un conductor.
   * Solo considera estados activos: REGISTRADA, PENDIENTE o EN_PROCESO.
   * Ordena por created_at DESC para obtener la más reciente si hubiera varias activas.
   *
   * @param {number|string} conductorId - ID del conductor
   * @returns {Promise<Object|null>} Fila de la jornada o null si no hay ninguna activa
   */
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

  /**
   * Verifica si una unidad ya tiene una jornada en estado activo.
   * Impide asignar la misma unidad a dos jornadas simultáneas.
   *
   * @param {number|string} unidadId - ID de la unidad/camión
   * @returns {Promise<boolean>} true si la unidad ya está ocupada en otra jornada activa
   */
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

  /**
   * Verifica si un conductor ya tiene una jornada en estado activo.
   * Impide que un conductor sea asignado a dos jornadas en paralelo.
   *
   * @param {number|string} conductorId - ID del conductor
   * @returns {Promise<boolean>} true si el conductor ya está ocupado en otra jornada activa
   */
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

  /**
   * Marca una jornada como EN_PROCESO fijando hora_inicio con NOW().
   * El campo updated_at también se actualiza en la misma sentencia.
   *
   * @param {number|string} jornadaId - ID de la jornada a iniciar
   * @returns {Promise<Object|null>} Fila actualizada con hora_inicio, o null si el ID no existe
   */
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

  /**
   * Marca una jornada como COMPLETADA fijando hora_fin con NOW() y calculando la duración.
   * Las observaciones solo se actualizan si se provee un valor; COALESCE conserva las anteriores.
   * Retorna duracion_total_segundos como la diferencia entre hora_fin y hora_inicio en segundos.
   *
   * @param {number|string} jornadaId - ID de la jornada a finalizar
   * @param {string|null} [observaciones] - Observaciones finales (opcional; null conserva las existentes)
   * @returns {Promise<Object|null>} Fila actualizada con hora_fin y duracion_total_segundos, o null
   */
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

  /**
   * Obtiene todas las jornadas con información enriquecida mediante JOINs a usuarios,
   * unidades y contratos. Aplica filtros opcionales y ordena por created_at DESC.
   *
   * Campos calculados incluidos:
   * - conductor: nombre completo del conductor
   * - camion: placa + marca + modelo de la unidad
   * - contrato: código del contrato
   * - horario: rango legible hora_inicio–hora_fin (o 'Sin iniciar' / 'En curso')
   * - duracion_total: tiempo transcurrido en HH:MM o estado textual (DURATION_SQL)
   * - tiene_observaciones: flag booleano para mostrar indicador en la UI
   *
   * @param {Object} [filtros={}] - Criterios de búsqueda
   * @param {string} [filtros.q] - Búsqueda libre en placa y nombre del conductor
   * @param {string} [filtros.conductor_id] - ID exacto del conductor
   * @param {string} [filtros.fecha_desde] - Fecha mínima de jornada (YYYY-MM-DD)
   * @param {string} [filtros.fecha_hasta] - Fecha máxima de jornada (YYYY-MM-DD)
   * @returns {Promise<Object[]>} Lista de filas con todos los campos enriquecidos y calculados
   */
  async findAll(filtros = {}) {
    const client = await getClient();
    try {
      const { whereClause, params } = buildFilters(filtros);
      const result = await client.query(
        `
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
          
          j.km_estimados,
          j.km_recorridos,

          j.estado,
          j.observaciones,

          ${DURATION_SQL} AS duracion_total,

          (
            j.observaciones IS NOT NULL
            AND j.observaciones <> ''
          ) AS tiene_observaciones,

          a.tipo AS tipo_alerta,
          a.detalle AS alerta_descripcion,
          a.fecha_hora AS fecha_alerta,
          a.latitud,
          a.longitud,
          a.estado AS estado_alerta,

          CASE
            WHEN a.tipo = '${ALERT_TYPES.PANICO}'
              THEN true
            ELSE false
          END AS es_panico,

          CASE
            WHEN a.tipo = '${ALERT_TYPES.AUXILIO}'
              THEN true
            ELSE false
          END AS es_auxilio
        FROM jornadas j
        JOIN usuarios u ON u.id = j.conductor_id
        JOIN unidades un ON un.id = j.unidad_id
        JOIN contratos c ON c.id = j.contrato_id
        LEFT JOIN alertas a ON a.jornada_id = j.id
        ${whereClause}
        ORDER BY j.created_at DESC;
      `,
        params
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene todas las jornadas en formato optimizado para exportación CSV.
   * Las fechas y horas se formatean como cadenas legibles (YYYY-MM-DD HH24:MI:SS).
   * La duración se calcula con DURATION_SQL igual que en findAll.
   * Aplica los mismos filtros que findAll.
   *
   * @param {Object} [filtros={}] - Criterios de filtrado (mismos parámetros que findAll)
   * @returns {Promise<Object[]>} Lista de filas con campos formateados para escritura CSV directa
   */
  async exportAll(filtros = {}) {
    const client = await getClient();
    try {
      const { whereClause, params } = buildFilters(filtros);
      const result = await client.query(
        `
        SELECT
          j.id,
          TO_CHAR(j.fecha_jornada, 'YYYY-MM-DD') AS fecha,
          u.nombres || ' ' || u.apellidos AS conductor,
          un.placa,
          c.codigo AS contrato,
          TO_CHAR(j.hora_inicio, 'YYYY-MM-DD HH24:MI:SS') AS hora_inicio,
          TO_CHAR(j.hora_fin, 'YYYY-MM-DD HH24:MI:SS') AS hora_fin,
          ${DURATION_SQL} AS duracion_total,
          j.km_estimados,
          j.km_recorridos,

          j.estado,
          j.observaciones
        FROM jornadas j
        JOIN usuarios u ON u.id = j.conductor_id
        JOIN unidades un ON un.id = j.unidad_id
        JOIN contratos c ON c.id = j.contrato_id
        ${whereClause}
        ORDER BY j.created_at DESC;
      `,
        params
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
  /**
   * Obtiene métricas gerenciales del historial de jornadas.
   */
  async getHistorialMetrics(filtros = {}) {
    const client = await getClient();

    try {
      const { whereClause, params } = buildFilters(filtros);

      const result = await client.query(
        `
        SELECT
          COUNT(DISTINCT j.id) AS total_jornadas,

          COUNT(
            DISTINCT CASE
              WHEN a.tipo = '${ALERT_TYPES.PANICO}'
              THEN j.id
            END
          ) AS alertas_panico,

          COUNT(
            DISTINCT CASE
              WHEN a.tipo = '${ALERT_TYPES.AUXILIO}'
              THEN j.id
            END
          ) AS auxilio_mecanico,

          COUNT(
            DISTINCT CASE
              WHEN j.observaciones IS NOT NULL
                AND j.observaciones <> ''
              THEN j.id
            END
          ) AS jornadas_observaciones,

          COALESCE(AVG(j.km_recorridos), 0) AS km_promedio

        FROM jornadas j
        JOIN usuarios u ON u.id = j.conductor_id
        JOIN unidades un ON un.id = j.unidad_id
        JOIN contratos c ON c.id = j.contrato_id
        LEFT JOIN alertas a ON a.jornada_id = j.id

        ${whereClause};
      `,
        params
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }
  /**
   * Obtiene detalle completo de una alerta.
   */
  async getAlertDetail(jornadaId) {
    const client = await getClient();

    try {
      const result = await client.query(
        `
        SELECT
          j.id AS jornada_id,
          u.nombres || ' ' || u.apellidos AS conductor,
          un.placa,
          j.fecha_jornada,
          j.origen,
          j.destino,

          a.tipo AS tipo_alerta,
          a.detalle,
          a.fecha_hora,
          a.latitud,
          a.longitud,
          a.estado,
          a.atendida_at,
          a.detalle_resolucion

        FROM jornadas j
        JOIN usuarios u ON u.id = j.conductor_id
        JOIN unidades un ON un.id = j.unidad_id
        LEFT JOIN alertas a ON a.jornada_id = j.id

        WHERE j.id = $1
        LIMIT 1;
      `,
        [jornadaId]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
}
