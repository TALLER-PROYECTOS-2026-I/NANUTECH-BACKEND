import db from "../../shared/config/database.mjs";

const ALLOWED_ORDER_FIELDS = {
  fecha_fin: 'c.fecha_fin',
  fecha_inicio: 'c.fecha_inicio',
  cliente: 'c.cliente',
  codigo: 'c.codigo',
  estado: 'c.estado',
  created_at: 'c.created_at',
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
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
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
       ORDER BY cliente`,
    );
    return result.rows;
  }

  async createContrato(data) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const codigo = this.generateCodigoContrato();
      const totalReferencial = this.calculateTotalReferencial(data);

      // 1. Insertar contrato principal
      const contratoResult = await client.query(
        `
      INSERT INTO contratos (
        codigo,
        cliente,
        ruc,
        descripcion,
        tipo_servicio,
        fecha_inicio,
        fecha_fin,
        tarifa,
        moneda,
        estado,
        activo
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
        ],
      );

      const contrato = contratoResult.rows[0];

      // 2. Ruta
      await client.query(
        `
      INSERT INTO contrato_rutas (
        contrato_id,
        origen,
        destino,
        distancia_estimada_km
      )
      VALUES ($1,$2,$3,$4)
      `,
        [
          contrato.id,
          data.origen.trim(),
          data.destino.trim(),
          Number(data.distancia_estimada_km).toFixed(2),
        ],
      );

      // 3. Tarifas
      await client.query(
        `
      INSERT INTO contrato_tarifas (
        contrato_id,
        tarifa_por_km,
        tarifa_por_hora,
        tarifa_espera,
        total_referencial
      )
      VALUES ($1,$2,$3,$4,$5)
      `,
        [
          contrato.id,
          Number(data.tarifa_por_km).toFixed(2),
          Number(data.tarifa_por_hora || 0).toFixed(2),
          Number(data.tarifa_espera || 0).toFixed(2),
          totalReferencial,
        ],
      );

      const fullResult = await this.getFullContratoByIdWithClient(
        client,
        contrato.id,
      );

      await client.query("COMMIT");

      return fullResult;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }


  async getFullContratoByIdWithClient(client, id) {
    const result = await client.query(
      `SELECT 
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
          cr.origen,
          cr.destino,
          cr.distancia_estimada_km,
          ct.tarifa_base,
          ct.tarifa_por_km,
          ct.tarifa_por_hora,
          ct.tarifa_por_tonelada,
          ct.tarifa_espera,
          ct.total_referencial
       FROM contratos c
       JOIN contrato_rutas cr ON cr.contrato_id = c.id
       JOIN contrato_tarifas ct ON ct.contrato_id = c.id
       WHERE c.id = $1`,
      [id],
    );

    return result.rows[0];
  }

  generateCodigoContrato() {
    return `CONT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  calculateTotalReferencial(data) {
    const distancia = Number(data.distancia_estimada_km || 0);
    const tarifaPorKm = Number(data.tarifa_por_km || 0);

    return Number((distancia * tarifaPorKm).toFixed(2));
  }
  
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

  async findAll({ q, estado } = {}, { page = 1, limit = 10, order_by = 'fecha_fin' } = {}) {
    const { whereClause, params } = buildFilters({ q, estado });

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;
    const orderField = ALLOWED_ORDER_FIELDS[order_by] || 'c.fecha_fin';

    const countResult = await db.query(
      `SELECT COUNT(*)::INT AS total FROM contratos c ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const dataParams = [...params, limitNum, offset];
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
        CASE WHEN c.fecha_fin IS NOT NULL
          THEN EXTRACT(DAY FROM (c.fecha_fin - CURRENT_DATE))::INT
        END AS dias_para_vencer,
        (SELECT COUNT(*)::INT FROM contrato_unidades
         WHERE contrato_id = c.id AND activo = TRUE) AS camiones_asignados,
        CASE
          WHEN c.fecha_fin IS NOT NULL
            AND EXTRACT(DAY FROM (c.fecha_fin - CURRENT_DATE)) BETWEEN 0 AND 30
            THEN TRUE
          ELSE FALSE
        END AS proximo_a_vencer
      FROM contratos c
      ${whereClause}
      ORDER BY ${orderField} ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, dataParams);

    return { rows: result.rows, total, page: pageNum, limit: limitNum };
  }

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
          THEN EXTRACT(DAY FROM (c.fecha_fin - CURRENT_DATE))::INT
        END AS dias_para_vencer,
        CASE
          WHEN c.fecha_fin IS NOT NULL
            AND EXTRACT(DAY FROM (c.fecha_fin - CURRENT_DATE)) BETWEEN 0 AND 30
            THEN TRUE
          ELSE FALSE
        END AS proximo_a_vencer,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', u.id,
              'placa', u.placa,
              'marca', u.marca,
              'modelo', u.modelo,
              'estado', u.estado
            )
          )
          FROM contrato_unidades cu
          JOIN unidades u ON u.id = cu.unidad_id
          WHERE cu.contrato_id = c.id AND cu.activo = TRUE),
          '[]'::json
        ) AS unidades
      FROM contratos c
      WHERE c.id = $1
    `, [contratoId]);

    return result.rows[0] || null;
  }
}
