import { getClient } from "../../shared/config/database.mjs";

/**
 * Fragmento SQL base que selecciona los campos de alertas_jornada
 * junto con los JOINs a jornadas, usuarios (conductor) y unidades.
 * Se usa en findActivas para evitar repetir la estructura.
 *
 * @type {string}
 */
const BASE_SELECT_ACTIVAS = `
  SELECT
    a.id,
    a.codigo,
    a.jornada_id,
    a.tipo,
    a.estado,
    a.severidad,
    a.detalle,
    a.tipo_falla_mecanica,
    a.latitud,
    a.longitud,
    a.direccion,
    a.fecha_hora,
    a.bloqueo_sos_activo,
    j.conductor_id,
    u.nombres || ' ' || u.apellidos AS conductor_nombre_completo,
    u.telefono AS conductor_telefono,
    u.dni AS conductor_dni,
    j.unidad_id,
    un.placa AS unidad_placa,
    un.marca AS unidad_marca,
    un.modelo AS unidad_modelo
  FROM alertas_jornada a
  JOIN jornadas j ON j.id = a.jornada_id
  JOIN usuarios u ON u.id = j.conductor_id
  LEFT JOIN unidades un ON un.id = j.unidad_id
`;

/**
 * Repositorio de acceso a datos para la entidad Alerta.
 * Todas las operaciones obtienen un cliente de la pool de PostgreSQL
 * y lo liberan en el bloque finally para evitar fugas de conexión.
 *
 * @class AlertaRepository
 */
export class AlertaRepository {
  /**
   * Obtiene los 3 contadores del panel de alertas en una sola query.
   *
   * - panico_activas: alertas tipo PANICO en estado ACTIVA
   * - auxilio_pendientes: alertas tipo AUXILIO_MECANICO en estado ACTIVA o EN_PROCESO
   * - total_resueltas: alertas en estado RESUELTA
   * - tiene_panico_activo: booleano derivado (true si panico_activas > 0)
   *
   * @returns {Promise<Object>} Objeto con los 4 indicadores numéricos/booleanos
   */
  async getIndicadores() {
    const client = await getClient();

    try {
      const result = await client.query(`
        SELECT
          COALESCE(COUNT(CASE WHEN tipo = 'PANICO' AND estado = 'ACTIVA' THEN 1 END), 0) AS panico_activas,
          COALESCE(COUNT(CASE WHEN tipo = 'AUXILIO_MECANICO' AND estado IN ('ACTIVA', 'EN_PROCESO') THEN 1 END), 0) AS auxilio_pendientes,
          COALESCE(COUNT(CASE WHEN estado = 'RESUELTA' THEN 1 END), 0) AS total_resueltas,
          COALESCE(BOOL_OR(tipo = 'PANICO' AND estado = 'ACTIVA'), FALSE) AS tiene_panico_activo
        FROM alertas_jornada;
      `);

      const row = result.rows[0];
      return {
        panico_activas: Number(row.panico_activas),
        auxilio_pendientes: Number(row.auxilio_pendientes),
        total_resueltas: Number(row.total_resueltas),
        tiene_panico_activo: row.tiene_panico_activo,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Busca todas las alertas aplicando filtros opcionales por tipo y estado.
   * Si no se proporcionan filtros, retorna todas las alertas sin importar
   * el estado operativo, incluyendo RESUELTA y FALSA_ALARMA.
   * Ordena primero las ACTIVAS, luego EN_PROCESO, RESUELTA y FALSA_ALARMA,
   * dentro de cada grupo por fecha_hora descendente.
   *
   * @param {Object} [options={}] - Filtros opcionales
   * @param {string} [options.tipo] - PANICO | AUXILIO_MECANICO | OBSERVACION
   * @param {string} [options.estado] - ACTIVA | EN_PROCESO | RESUELTA | FALSA_ALARMA
   * @returns {Promise<Object[]>} Filas con campos de alerta, conductor y unidad
   */
  async findActivas(options = {}) {
    const client = await getClient();

    try {
      const conditions = [];
      const params = [];

      if (options.tipo) {
        params.push(options.tipo);
        conditions.push(`a.tipo = $${params.length}`);
      }

      if (options.estado) {
        params.push(options.estado);
        conditions.push(`a.estado = $${params.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const result = await client.query(
        `
          ${BASE_SELECT_ACTIVAS}
          ${whereClause}
          ORDER BY
            CASE a.estado
              WHEN 'ACTIVA' THEN 0
              WHEN 'EN_PROCESO' THEN 1
              WHEN 'RESUELTA' THEN 2
              WHEN 'FALSA_ALARMA' THEN 3
              ELSE 4
            END,
            a.fecha_hora DESC;
        `,
        params
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Busca una alerta por su ID primario.
   *
   * @param {string} id - UUID de la alerta
   * @returns {Promise<Object|null>} Fila de la alerta o null si no existe
   */
  async findById(id) {
    const client = await getClient();

    try {
      const result = await client.query(
        `${BASE_SELECT_ACTIVAS} WHERE a.id = $1 LIMIT 1;`,
        [id]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Marca una alerta como RESUELTA, registrando los datos de resolución.
   * Siempre actualiza: estado = 'RESUELTA', atendida = TRUE, atendida_at = NOW().
   * Opcionalmente persiste detalle_resolucion y servicio_tecnico_realizado
   * cuando el objeto data los incluye.
   *
   * @param {string} id - UUID de la alerta a resolver
   * @param {Object} [data={}] - Datos adicionales de resolución
   * @param {string} [data.detalle_resolucion] - Descripción de cómo se resolvió
   * @param {string} [data.servicio_tecnico_realizado] - Técnico o servicio involucrado
   * @returns {Promise<Object|null>} Fila actualizada de la alerta, o null si no existía
   */
  async resolverAlerta(id, data = {}) {
    const client = await getClient();

    try {
      const setClauses = [
        "estado = 'RESUELTA'",
        "atendida = TRUE",
        "atendida_at = NOW()",
      ];
      const params = [id];

      if (data.detalle_resolucion !== undefined) {
        params.push(data.detalle_resolucion);
        setClauses.push(`detalle_resolucion = $${params.length}`);
      }

      if (data.servicio_tecnico_realizado !== undefined) {
        params.push(data.servicio_tecnico_realizado);
        setClauses.push(`servicio_tecnico_realizado = $${params.length}`);
      }

      const result = await client.query(
        `
          UPDATE alertas_jornada
          SET ${setClauses.join(", ")}
          WHERE id = $1
          RETURNING
            id,
            codigo,
            jornada_id,
            tipo,
            estado,
            severidad,
            detalle,
            tipo_falla_mecanica,
            latitud,
            longitud,
            direccion,
            fecha_hora,
            atendida,
            atendida_at,
            detalle_resolucion,
            servicio_tecnico_realizado,
            telefono_contactado,
            bloqueo_sos_activo,
            created_at;
        `,
        params
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Actualiza el estado operativo de una alerta de auxilio mecánico.
   * Si el nuevo estado es 'RESUELTA', también marca atendida = TRUE y
   * fija atendida_at = NOW().
   *
   * @param {string} id - UUID de la alerta
   * @param {string} nuevoEstado - Estado objetivo (EN_PROCESO | RESUELTA)
   * @returns {Promise<Object|null>} Fila actualizada de la alerta, o null si no existía
   */
  async actualizarEstado(id, nuevoEstado) {
    const client = await getClient();

    try {
      const setClauses = ["estado = $2"];
      const params = [id, nuevoEstado];

      if (nuevoEstado === "RESUELTA") {
        setClauses.push("atendida = TRUE");
        setClauses.push("atendida_at = NOW()");
      }

      const result = await client.query(
        `
          UPDATE alertas_jornada
          SET ${setClauses.join(", ")}
          WHERE id = $1
          RETURNING
            id,
            codigo,
            jornada_id,
            tipo,
            estado,
            severidad,
            detalle,
            tipo_falla_mecanica,
            latitud,
            longitud,
            direccion,
            fecha_hora,
            atendida,
            atendida_at,
            detalle_resolucion,
            servicio_tecnico_realizado,
            telefono_contactado,
            bloqueo_sos_activo,
            created_at;
        `,
        params
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
  
    /**
   * HU21 - Valida que la jornada pertenezca al conductor y esté EN_PROCESO.
   *
   * Esta validación es obligatoria porque la HU21 depende de la HU03:
   * los botones SOS y Auxilio Mecánico solo deben funcionar cuando el chofer
   * tiene una jornada activa en proceso.
   *
   * @param {string} jornadaId - UUID de la jornada.
   * @param {string} conductorId - UUID del conductor autenticado.
   * @returns {Promise<Object|null>} Jornada en proceso o null.
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
            j.estado,
            un.placa AS unidad_placa
          FROM jornadas j
          LEFT JOIN unidades un ON un.id = j.unidad_id
          WHERE j.id = $1
            AND j.conductor_id = $2
            AND j.estado = 'EN_PROCESO'
          LIMIT 1;
        `,
        [jornadaId, conductorId]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * HU21 - Inserta una alerta generada desde la app móvil.
   *
   * Se usa para:
   * - SOS PÁNICO.
   * - Auxilio Mecánico.
   *
   * Esta función no reemplaza los endpoints administrativos existentes;
   * solo agrega la capacidad de registrar nuevas alertas desde el flujo móvil.
   *
   * @param {Object} data - Datos normalizados de la alerta.
   * @returns {Promise<Object|null>} Alerta creada.
   */
  async createAlerta(data) {
    const client = await getClient();

    try {
      const result = await client.query(
        `
          INSERT INTO alertas_jornada (
            codigo,
            jornada_id,
            tipo,
            estado,
            severidad,
            detalle,
            tipo_falla_mecanica,
            latitud,
            longitud,
            direccion,
            fecha_hora,
            bloqueo_sos_activo
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            COALESCE($11::timestamp, NOW()),
            $12
          )
          RETURNING
            id,
            codigo,
            jornada_id,
            tipo,
            estado,
            severidad,
            detalle,
            tipo_falla_mecanica,
            latitud,
            longitud,
            direccion,
            fecha_hora,
            bloqueo_sos_activo,
            created_at;
        `,
        [
          data.codigo,
          data.jornada_id,
          data.tipo,
          data.estado,
          data.severidad,
          data.detalle,
          data.tipo_falla_mecanica,
          data.latitud,
          data.longitud,
          data.direccion,
          data.fecha_hora,
          data.bloqueo_sos_activo,
        ]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
}
