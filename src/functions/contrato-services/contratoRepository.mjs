import db from "../../shared/config/database.mjs";

const ALLOWED_ORDER_FIELDS = {
  fecha_fin: "c.fecha_fin",
  fecha_inicio: "c.fecha_inicio",
  cliente: "c.cliente",
  codigo: "c.codigo",
  estado: "c.estado",
  created_at: "c.created_at",
};

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

export class ContratoRepository {
  async getAllVigentes() {
    const result = await db.query(
      `SELECT id, codigo, cliente, descripcion,
              fecha_inicio, fecha_fin, tarifa, moneda, estado, activo
       FROM contratos
       WHERE activo = TRUE
         AND estado = 'VIGENTE'
         AND fecha_inicio <= CURRENT_DATE
         AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
       ORDER BY cliente`
    );
    return result.rows;
  }

  // 🔥 IMPORTANTE: corregido con alias "c"
  async getById(id) {
    const result = await db.query(`SELECT * FROM contratos c WHERE c.id = $1`, [id]);
    return result.rows[0];
  }

  async getTarifasByContrato(id) {
    try {
      const result = await db.query(`SELECT * FROM contrato_tarifas WHERE contrato_id = $1`, [id]);
      return result.rows[0];
    } catch (error) {
      console.warn("⚠️ Tabla contrato_tarifas no existe aún");
      return null;
    }
  }

  async updateContrato(id, data) {
    await db.query(
      `UPDATE contratos
       SET fecha_inicio = $1,
           fecha_fin = $2,
           tipo_servicio = $3,
           descripcion = $4,
           tarifa = $5
       WHERE id = $6`,
      [data.fecha_inicio, data.fecha_fin, data.tipo_servicio, data.descripcion, data.tarifa, id]
    );
  }

  async updateTarifas(id, tarifas) {
    await db.query(
      `UPDATE contrato_tarifas
       SET tarifa_base = $1,
           tarifa_por_hora = $2,
           tarifa_por_tonelada = $3
       WHERE contrato_id = $4`,
      [tarifas.base, tarifas.hora, tarifas.tonelada, id]
    );
  }

  async insertHistorial(data) {
    await db.query(
      `INSERT INTO contratos_historial
       (contrato_id, accion, campo, valor_anterior, valor_nuevo, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
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

  async insertUnidad(contrato_id, unidad_id) {
    await db.query(
      `INSERT INTO contrato_unidades (contrato_id, unidad_id)
       VALUES ($1, $2)`,
      [contrato_id, unidad_id]
    );
  }

  async deleteUnidades(contrato_id) {
    await db.query(`DELETE FROM contrato_unidades WHERE contrato_id = $1`, [contrato_id]);
  }

  async getIndicadores() {
    const result = await db.query(`
      WITH
        dist_estado AS (
          SELECT estado, COUNT(*)::INT AS cantidad
          FROM contratos
          GROUP BY estado
        ),
        dist_tipo AS (
          SELECT tipo_servicio, COUNT(*)::INT AS cantidad
          FROM contratos
          WHERE tipo_servicio IS NOT NULL
          GROUP BY tipo_servicio
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
         WHERE c.estado = 'VIGENTE') AS camiones_asignados,
        COALESCE(
          (SELECT json_agg(row_to_json(d)) FROM dist_estado d),
          '[]'::json
        ) AS distribucion_por_estado,
        COALESCE(
          (SELECT json_agg(row_to_json(t)) FROM dist_tipo t),
          '[]'::json
        ) AS distribucion_por_tipo_servicio
    `);
    return result.rows[0];
  }

  // 🔥 AQUÍ ESTABA EL ERROR GRANDE
  async findAll({ q, estado } = {}, { page = 1, limit = 10, order_by = "fecha_fin" } = {}) {
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

    const dataParams = [...params, limitNum, offset];

    const result = await db.query(
      `
      SELECT 
        c.*,
        (c.fecha_fin - CURRENT_DATE) AS dias_para_vencer,
        COUNT(cu.unidad_id) AS camiones_asignados,
        CASE 
          WHEN (c.fecha_fin - CURRENT_DATE) <= 7 THEN true
          ELSE false
        END AS proximo_a_vencer
      FROM contratos c
      LEFT JOIN contrato_unidades cu ON cu.contrato_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY ${orderField} ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
      dataParams
    );

    return { rows: result.rows, total, page: pageNum, limit: limitNum };
  }

  // 🔥 CORREGIDO (joins + alias)
  async findById(contratoId) {
    const result = await db.query(
      `
      SELECT 
        c.*,
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
      [contratoId]
    );

    return result.rows[0] || null;
  }
}
