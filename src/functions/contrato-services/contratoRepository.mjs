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

  // ✅ 🔥 ESTE MÉTODO FALTABA (ARREGLA TU TEST)
  async getIndicadores() {
    const result = await db.query(`
    SELECT
      COUNT(*) AS total_contratos,
      COUNT(*) FILTER (WHERE estado = 'VIGENTE') AS contratos_activos,
      COUNT(*) FILTER (WHERE estado = 'VENCIDO') AS contratos_vencidos,
      COUNT(*) FILTER (WHERE estado = 'VIGENTE' AND fecha_fin <= NOW() + INTERVAL '30 days') AS proximos_a_vencer,
      COUNT(*) FILTER (WHERE camion_id IS NOT NULL) AS camiones_asignados,

      -- distribución por estado
      (
        SELECT json_agg(t)
        FROM (
          SELECT estado, COUNT(*) AS total
          FROM contratos
          GROUP BY estado
        ) t
      ) AS distribucion_por_estado,

      -- distribución por tipo de servicio ✅ (ESTA ES LA CLAVE)
      (
        SELECT json_agg(t)
        FROM (
          SELECT tipo_servicio, COUNT(*) AS total
          FROM contratos
          GROUP BY tipo_servicio
        ) t
      ) AS distribucion_por_tipo_servicio

    FROM contratos;
  `);

    return result.rows[0];
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

  // 🔥 =========================
  // LIST + DETALLE
  // 🔥 =========================

  // Obtiene el listado de contratos con filtros,
  // contador de camiones asignados y alerta de vencimiento.
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

  async findById(id) {
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
      [id]
    );

    return result.rows[0] || null;
  }
}
