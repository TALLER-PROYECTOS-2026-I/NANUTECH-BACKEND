import db from "../../shared/config/database.mjs";

/**
 * Campos permitidos para ordenar la lista de contratos en findAll.
 * Usar un mapa explícito previene inyección SQL en la cláusula ORDER BY,
 * ya que el valor de order_by del cliente se traduce al campo calificado de SQL.
 *
 * @type {Object.<string, string>}
 */
const ALLOWED_ORDER_FIELDS = {
  fecha_fin: "c.fecha_fin",
  fecha_inicio: "c.fecha_inicio",
  cliente: "c.cliente",
  codigo: "c.codigo",
  estado: "c.estado",
  created_at: "c.created_at",
};

/**
 * Construye la cláusula WHERE y el arreglo de parámetros para filtrar contratos.
 * Usa parámetros numerados ($1, $2, …) compatibles con node-postgres para prevenir inyección SQL.
 * La búsqueda por texto `q` aplica ILIKE simultáneamente sobre código y nombre del cliente.
 *
 * @param {Object} [options={}] - Criterios de filtrado
 * @param {string} [options.q] - Texto libre; busca en `c.codigo` e `c.cliente` con ILIKE
 * @param {string} [options.estado] - Filtra exacto por `c.estado` (VIGENTE, VENCIDO, SUSPENDIDO, etc.)
 * @returns {{ whereClause: string, params: Array }} Cláusula WHERE lista para interpolación y arreglo de valores
 */
function buildFilters({ q, estado } = {}) {
  const conditions = [];
  const params = [];

  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    conditions.push(`(c.codigo ILIKE $${idx} OR c.cliente ILIKE $${idx})`);
  }

  if (estado) {
    params.push(estado);
    conditions.push(`c.estado = $${params.length}`);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

/**
 * Repositorio de acceso a datos para la entidad Contrato.
 * Las operaciones de escritura usan transacciones explícitas para garantizar atomicidad.
 * Las operaciones de lectura usan la pool directamente (db.query) sin reservar cliente dedicado.
 */
export class ContratoRepository {
  /**
   * Obtiene todos los contratos actualmente vigentes según los criterios del sistema.
   * Un contrato es vigente cuando: activo = TRUE, estado = VIGENTE,
   * fecha_inicio <= CURRENT_DATE y (fecha_fin >= CURRENT_DATE OR fecha_fin IS NULL).
   *
   * @returns {Promise<Object[]>} Lista de contratos vigentes ordenados alfabéticamente por cliente
   */
  async getAllVigentes() {
    const result = await db.query(`
      SELECT id, codigo, cliente, descripcion,
             fecha_inicio, fecha_fin, tarifa, moneda, estado, activo
      FROM contratos
      WHERE activo = TRUE
        AND estado = 'VIGENTE'
        AND fecha_inicio <= CURRENT_DATE
        AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
      ORDER BY cliente
    `);
    return result.rows;
  }


  // 🔥 =========================
  // CREATE (DEVELOP)
  // 🔥 =========================

  /**
   * Registra un contrato completo en PostgreSQL.
   *
   * Flujo:
   * 1. Inicia transacción.
   * 2. Inserta contrato principal.
   * 3. Inserta ruta del contrato.
   * 4. Inserta reglas tarifarias.
   * 5. Confirma transacción.
   *
   * Si ocurre un error:
   * - Se ejecuta ROLLBACK.
   */
  async createContrato(data) {
    // Obtiene un cliente de conexión para manejar la transacción
    const client = await db.getClient();

    try {
      // Inicia la transacción
      await client.query("BEGIN");

      // Genera código único y calcula la tarifa referencial
      const codigo = this.generateCodigoContrato();
      const totalReferencial = this.calculateTotalReferencial(data);

      // Inserta la información principal del contrato
      const contratoResult = await client.query(
        `
        INSERT INTO contratos (
          codigo, cliente, ruc, descripcion, tipo_servicio,
          fecha_inicio, fecha_fin, tarifa, moneda, estado, activo
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'VIGENTE',TRUE)
        RETURNING *
        `,
        [
          codigo,
          data.cliente.trim(),
          data.ruc,
          data.descripcion || null,
          data.tipo_servicio,
          data.fecha_inicio,
          data.fecha_fin || null,
          totalReferencial,
          data.moneda || "PEN",
        ]
      );

      // Obtiene el contrato creado para usar su ID en las tablas relacionadas
      const contrato = contratoResult.rows[0];

      // Registra la ruta asociada al contrato
      await client.query(
        `
        INSERT INTO contrato_rutas (contrato_id, origen, destino, distancia_estimada_km)
        VALUES ($1,$2,$3,$4)
        `,
        [
          contrato.id,
          data.origen.trim(),
          data.destino.trim(),
          Number(data.distancia_estimada_km).toFixed(2),
        ]
      );

      // Registra las tarifas y el total referencial del contrato
      await client.query(
        `
        INSERT INTO contrato_tarifas (
          contrato_id, tarifa_por_km, tarifa_por_hora,
          tarifa_espera, total_referencial
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          contrato.id,
          Number(data.tarifa_por_km).toFixed(2),
          Number(data.tarifa_por_hora || 0).toFixed(2),
          Number(data.tarifa_espera || 0).toFixed(2),
          totalReferencial,
        ]
      );

      // Consulta el contrato completo con ruta y tarifas asociadas
      const fullResult = await this.getFullContratoByIdWithClient(client, contrato.id);

      // Confirma la transacción
      await client.query("COMMIT");

      // Retorna el contrato completo registrado
      return fullResult;
    } catch (error) {
      // Revierte la transacción si ocurre algún error
      await client.query("ROLLBACK");
      throw error;
    } finally {
      // Libera la conexión del cliente
      client.release();
    }
  }

  /**
   * Obtiene el detalle completo de un contrato,
   * incluyendo datos generales, ruta y tarifas.
   */
  async getFullContratoByIdWithClient(client, id) {
    const result = await client.query(
      `
      SELECT 
        c.*,
        cr.origen, cr.destino, cr.distancia_estimada_km,
        ct.tarifa_por_km, ct.tarifa_por_hora,
        ct.tarifa_espera, ct.total_referencial
      FROM contratos c
      JOIN contrato_rutas cr ON cr.contrato_id = c.id
      JOIN contrato_tarifas ct ON ct.contrato_id = c.id
      WHERE c.id = $1
      `,
      [id]
    );

    // Retorna el primer resultado encontrado del contrato
    return result.rows[0];
  }

  /**
   * Genera un código único para identificar el contrato.
   */
  generateCodigoContrato() {
    // Genera un código alfanumérico único para el contrato.
    return `CONT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Calcula el total referencial del contrato.
   *
   * Fórmula:
   * Total referencial = Distancia estimada × Tarifa por KM
   */
  calculateTotalReferencial(data) {
    // Convierte la distancia a número
    const distancia = Number(data.distancia_estimada_km || 0);

    // Convierte la tarifa por KM a número
    const tarifaPorKm = Number(data.tarifa_por_km || 0);

    // Calcula la tarifa total referencial.
    // Tarifa Total = Distancia Estimada × Tarifa por KM
    return Number((distancia * tarifaPorKm).toFixed(2));
  }

  /**
   * Obtiene los indicadores agregados del módulo de contratos usando CTEs para modularidad.
   *
   * CTEs definidas:
   * - dist_estado: cuenta contratos agrupados por estado, ordenados por cantidad DESC
   * - dist_tipo: cuenta contratos agrupados por tipo_servicio (excluye NULLs), ordenados por cantidad DESC
   *
   * Métricas retornadas:
   * - total_contratos: conteo total de contratos registrados
   * - contratos_activos: contratos con estado = 'VIGENTE' y activo = TRUE
   * - contratos_vencidos: contratos con estado = 'VENCIDO'
   * - proximos_a_vencer: contratos VIGENTES con fecha_fin entre hoy y 30 días adelante
   * - camiones_asignados: conteo de unidades únicas activas en contratos vigentes (vía contrato_unidades)
   * - distribucion_por_estado: JSON array [{ estado, cantidad }] ordenado por cantidad DESC
   * - distribucion_por_tipo_servicio: JSON array [{ tipo_servicio, cantidad }] ordenado por cantidad DESC
   *
   * @returns {Promise<Object>} Fila única con todas las métricas del módulo
   */
  async getIndicadores() {
    const result = await db.query(`
      WITH
        dist_estado AS (
          SELECT estado, COUNT(*)::INT AS cantidad
          FROM contratos
          GROUP BY estado
          ORDER BY cantidad DESC
        ),
        dist_tipo AS (
          SELECT tipo_servicio, COUNT(*)::INT AS cantidad
          FROM contratos
          WHERE tipo_servicio IS NOT NULL
          GROUP BY tipo_servicio
          ORDER BY cantidad DESC
        )
      SELECT
        (SELECT COUNT(*)::INT FROM contratos) AS total_contratos,
        (SELECT COUNT(*)::INT FROM contratos
         WHERE estado = 'VIGENTE' AND activo = TRUE) AS contratos_activos,
        (SELECT COUNT(*)::INT FROM contratos
         WHERE estado = 'VENCIDO') AS contratos_vencidos,
        (SELECT COUNT(*)::INT FROM contratos
         WHERE estado = 'VIGENTE'
           AND fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS proximos_a_vencer,
        (SELECT COUNT(DISTINCT cu.unidad_id)::INT
         FROM contrato_unidades cu
         JOIN contratos c ON c.id = cu.contrato_id
         WHERE cu.activo = TRUE AND c.estado = 'VIGENTE') AS camiones_asignados,
        COALESCE(
          (SELECT json_agg(row_to_json(d))
           FROM (SELECT estado, cantidad FROM dist_estado) d),
          '[]'::json
        ) AS distribucion_por_estado,
        COALESCE(
          (SELECT json_agg(row_to_json(t))
           FROM (SELECT tipo_servicio, cantidad FROM dist_tipo) t),
          '[]'::json
        ) AS distribucion_por_tipo_servicio
    `);
    return result.rows[0];
  }


  // 🔥 =========================
  // HU07 (UPDATE + HISTORIAL)
  // 🔥 =========================

  // Obtiene la información base del contrato seleccionado
  // para mostrar el detalle y validar cambios antes de actualizar.
  async getById(id) {
    const result = await db.query(`SELECT * FROM contratos c WHERE c.id = $1`, [id]);
    return result.rows[0];
  }

  // Obtiene el esquema de tarifas asociado al contrato.
  // Permite visualizar y editar cobros por hora, tonelada o tarifa base.
  async getTarifasByContrato(id) {
    try {
      const result = await db.query(`SELECT * FROM contrato_tarifas WHERE contrato_id = $1`, [id]);
      return result.rows[0];
    } catch {
      return null;
    }
  }

  // Actualiza los datos principales del contrato.
  // Incluye fechas, descripción, tipo de servicio y tarifa general.
  async updateContrato(id, data) {
    await db.query(
      `
      UPDATE contratos
      SET fecha_inicio = $1,
          fecha_fin = $2,
          tipo_servicio = $3,
          descripcion = $4,
          tarifa = $5
      WHERE id = $6
      `,
      [data.fecha_inicio, data.fecha_fin, data.tipo_servicio, data.descripcion, data.tarifa, id]
    );
  }

  // Actualiza el esquema de tarifas del contrato.
  // Permite modificar tarifas según tipo de cobro requerido.
  async updateTarifas(id, tarifas) {
    await db.query(
      `
      UPDATE contrato_tarifas
      SET tarifa_base = $1,
          tarifa_por_hora = $2,
          tarifa_por_tonelada = $3
      WHERE contrato_id = $4
      `,
      [tarifas.base, tarifas.hora, tarifas.tonelada, id]
    );
  }

  // Registra automáticamente los cambios realizados en el contrato.
  // Guarda campo modificado, valor anterior, valor nuevo e IP del usuario.
  async insertHistorial(data) {
    await db.query(
      `
      INSERT INTO contratos_historial
      (contrato_id, accion, campo, valor_anterior, valor_nuevo, ip_address)
      VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [
        data.contrato_id,
        "UPDATE",
        data.campo,
        data.valor_anterior,
        data.valor_nuevo,
        data.ip_address,
      ]
    );
  }

  // Inserta una unidad/camión vinculada al contrato.
  // Permite la asignación múltiple de unidades.
  async insertUnidad(contrato_id, unidad_id) {
    await db.query(
      `INSERT INTO contrato_unidades (contrato_id, unidad_id)
       VALUES ($1,$2)`,
      [contrato_id, unidad_id]
    );
  }

  // Elimina las unidades previamente asociadas al contrato
  // antes de registrar una nueva asignación.
  async deleteUnidades(contrato_id) {
    await db.query(`DELETE FROM contrato_unidades WHERE contrato_id = $1`, [contrato_id]);
  }

    /**
   * Obtiene contratos paginados con campos calculados de vencimiento.
   * Ejecuta dos consultas: una para el conteo total (paginación) y otra para los datos.
   * Aplica filtros, paginación segura (clampea limit a 1-100) y ordenamiento validado contra
   * ALLOWED_ORDER_FIELDS para prevenir inyección SQL en ORDER BY.
   *
   * Campos calculados incluidos:
   * - dias_para_vencer: diferencia en días entre fecha_fin y hoy (NULL si sin fecha_fin)
   * - camiones_asignados: conteo de unidades activas asignadas al contrato
   * - proximo_a_vencer: TRUE si fecha_fin está entre 0 y 30 días desde hoy
   *
   * @param {Object} [filtros={}] - Criterios de búsqueda
   * @param {string} [filtros.q] - Texto libre (código o cliente)
   * @param {string} [filtros.estado] - Estado exacto del contrato
   * @param {Object} [pagination={}] - Parámetros de paginación
   * @param {number} [pagination.page=1] - Página actual (mínimo 1)
   * @param {number} [pagination.limit=10] - Registros por página (rango: 1-100)
   * @param {string} [pagination.order_by='fecha_fin'] - Campo de ordenamiento (ver ALLOWED_ORDER_FIELDS)
   * @returns {Promise<{ rows: Object[], total: number, page: number, limit: number }>}
   */
  async findAll({ q, estado } = {}, { page = 1, limit = 10, order_by = 'fecha_fin' } = {}) {
    const { whereClause, params } = buildFilters({ q, estado });

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;
    const orderField = ALLOWED_ORDER_FIELDS[order_by] || "c.fecha_fin";

    const countResult = await db.query(
      `SELECT COUNT(*)::INT AS total FROM contratos c ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    const result = await db.query(
      `
      SELECT
        c.*,
        CASE WHEN c.fecha_fin IS NOT NULL
          THEN (c.fecha_fin - CURRENT_DATE)::INT
        END AS dias_para_vencer,
        (SELECT COUNT(*) FROM contrato_unidades WHERE contrato_id = c.id) AS camiones_asignados,
        CASE
          WHEN c.fecha_fin IS NOT NULL
            AND (c.fecha_fin - CURRENT_DATE) BETWEEN 0 AND 30
          THEN TRUE ELSE FALSE
        END AS proximo_a_vencer
      FROM contratos c
      ${whereClause}
      ORDER BY ${orderField}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limitNum, offset]
    );

    return { rows: result.rows, total, page: pageNum, limit: limitNum };
  }

  /**
   * Obtiene el detalle completo de un contrato por su ID primario.
   * Incluye un JSON array de unidades activas asignadas (id, placa, marca, modelo, estado)
   * agregado mediante subquery con json_agg. Si no hay unidades, retorna '[]'::json.
   * Calcula dias_para_vencer y el flag proximo_a_vencer al momento de la consulta.
   *
   * @param {string|number} contratoId - ID del contrato
   * @returns {Promise<Object|null>} Contrato con unidades asignadas y campos calculados, o null si no existe
   */
  async findById(contratoId) {
    const result = await db.query(`
      SELECT
        c.id,
        c.codigo,
        c.cliente,
        c.ruc,
        c.descripcion,
        c.tipo_servicio,
        c.fecha_inicio,
        c.fecha_fin,
        c.tarifa,
        c.moneda,
        c.estado,
        c.activo,
        c.created_at,
        c.updated_at,
        CASE WHEN c.fecha_fin IS NOT NULL
          THEN (c.fecha_fin - CURRENT_DATE)::INT
        END AS dias_para_vencer,
        CASE
          WHEN c.fecha_fin IS NOT NULL
            AND (c.fecha_fin - CURRENT_DATE) BETWEEN 0 AND 30
            THEN TRUE
          ELSE FALSE
        END AS proximo_a_vencer,
        COALESCE(
          json_agg(
            json_build_object(
              'unidad_id', u.id,
              'placa', u.placa
            )
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) AS unidades
      FROM contratos c
      LEFT JOIN contrato_unidades cu ON cu.contrato_id = c.id
      LEFT JOIN unidades u ON u.id = cu.unidad_id
      WHERE c.id = $1
      GROUP BY c.id
      `,
      [id]
    );

    return result.rows[0] || null;
  }
}
