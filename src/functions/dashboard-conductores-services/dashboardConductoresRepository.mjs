import db from "../../shared/config/database.mjs";

// Estados considerados como jornadas activas
const JORNADAS_ACTIVAS = "'REGISTRADA','PENDIENTE','EN_PROCESO'";

export class DashboardConductoresRepository {
  // INDICADORES PRINCIPALES DEL DASHBOARD
  async getIndicadores() {
    const result = await db.query(`
      SELECT
        COUNT(*)::INT AS total_conductores,

        COUNT(*) FILTER (
          WHERE u.activo = TRUE
        )::INT AS conductores_activos,

        COUNT(*) FILTER (
          WHERE u.activo = TRUE
            AND c.estado_operacional = 'DISPONIBLE'
            AND j.id IS NULL
        )::INT AS disponibles,

        COUNT(*) FILTER (
          WHERE c.estado_operacional = 'EN_RUTA'
        )::INT AS en_ruta

      FROM conductores c
      INNER JOIN usuarios u ON u.id = c.usuario_id

      LEFT JOIN jornadas j
        ON j.conductor_id = c.usuario_id
        AND j.estado IN (${JORNADAS_ACTIVAS})

      WHERE u.rol = 'CHOFER';
    `);

    return result.rows[0];
  }

  // GRAFICO PIE CHART
  // DISTRIBUCIÓN ACTIVOS / INACTIVOS
  async getDistribucionContrato() {
    const result = await db.query(`
    SELECT
      CASE
        WHEN u.activo = TRUE THEN 'ACTIVOS'
        ELSE 'INACTIVOS'
      END AS estado,

      COUNT(*)::INT AS cantidad

    FROM conductores c
    INNER JOIN usuarios u
      ON u.id = c.usuario_id

    WHERE u.rol = 'CHOFER'

    GROUP BY u.activo
    ORDER BY cantidad DESC;
  `);

    return result.rows;
  }

  // GRAFICO BAR CHART
  // ESTADOS OPERACIONALES
  async getEstadoOperacional() {
    const result = await db.query(`
      SELECT
        c.estado_operacional::TEXT AS estado,
        COUNT(*)::INT AS cantidad
      FROM conductores c
      INNER JOIN usuarios u ON u.id = c.usuario_id
      WHERE u.rol = 'CHOFER'
      GROUP BY c.estado_operacional
      ORDER BY cantidad DESC;
    `);

    return result.rows;
  }

  // LISTADO DE CONDUCTORES
  // CON FILTROS Y BUSQUEDA
  async findAllConductores({ busqueda, estado, disponibilidad, page = 1, limit = 20 } = {}) {
    // Condiciones dinámicas para filtros
    const conditions = ["u.rol = 'CHOFER'"];
    // Parámetros seguros SQL
    const params = [];

    // FILTRO DE BUSQUEDA
    // Nombre, apellido, DNI o licencia
    if (busqueda) {
      params.push(`%${busqueda}%`);
      const idx = params.length;

      conditions.push(`
        (
          u.nombres ILIKE $${idx}
          OR u.apellidos ILIKE $${idx}
          OR lc.numero_licencia ILIKE $${idx}
        )
      `);
    }

    // FILTRO ACTIVOS / INACTIVOS
    if (estado && estado !== "TODOS") {
      params.push(estado === "ACTIVOS");
      conditions.push(`u.activo = $${params.length}`);
    }

    // FILTRO POR DISPONIBILIDAD
    if (disponibilidad && disponibilidad !== "TODOS") {
      params.push(disponibilidad);
      conditions.push(`c.estado_operacional::TEXT = $${params.length}`);
    }

    // Construcción dinámica del WHERE
    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const limitNumber = Number(limit) > 0 ? Number(limit) : 20;
    const offset = (pageNumber - 1) * limitNumber;

    params.push(limitNumber);
    const limitIndex = params.length;

    params.push(offset);
    const offsetIndex = params.length;

    const result = await db.query(
      `
      SELECT
        u.id AS id,
        CONCAT(u.nombres, ' ', u.apellidos) AS nombre,
        u.correo AS email,
        u.dni,
        lc.numero_licencia AS licencia,
        u.telefono AS contacto,

        CASE
          WHEN c.estado_operacional = 'DESCANSO' THEN 'DESCANSANDO'
          WHEN c.estado_operacional = 'EN_RUTA' THEN 'EN_RUTA'
          WHEN c.estado_operacional = 'DISPONIBLE' THEN 'DISPONIBLE'
          ELSE 'SIN_ASIGNAR'
        END AS estado_operacional,

        COALESCE(un.placa, 'Sin asignar') AS camion_asignado,

        CASE
          WHEN u.activo = TRUE THEN 'ACTIVO'
          ELSE 'INACTIVO'
        END AS estado

      FROM conductores c
      INNER JOIN usuarios u ON u.id = c.usuario_id

      LEFT JOIN LATERAL (
        SELECT l.numero_licencia
        FROM licencias_conducir l
        WHERE l.conductor_id = c.usuario_id
          AND l.activa = TRUE
        ORDER BY l.fecha_vencimiento DESC
        LIMIT 1
      ) lc ON TRUE

      LEFT JOIN jornadas j
        ON j.id = c.current_shift_id
        AND j.estado IN (${JORNADAS_ACTIVAS})

      LEFT JOIN unidades un
        ON un.id = j.unidad_id

      ${whereClause}

      ORDER BY u.id ASC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex};
      `,
      params
    );

    return result.rows;
  }

  async countConductores({ busqueda, estado, disponibilidad } = {}) {
    const conditions = ["u.rol = 'CHOFER'"];
    const params = [];

    if (busqueda) {
      params.push(`%${busqueda}%`);
      const idx = params.length;

      conditions.push(`
        (
          u.nombres ILIKE $${idx}
          OR u.apellidos ILIKE $${idx}
          OR lc.numero_licencia ILIKE $${idx}
        )
      `);
    }

    if (estado && estado !== "TODOS") {
      params.push(estado === "ACTIVOS");
      conditions.push(`u.activo = $${params.length}`);
    }

    if (disponibilidad && disponibilidad !== "TODOS") {
      params.push(disponibilidad);
      conditions.push(`c.estado_operacional::TEXT = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const result = await db.query(
      `
      SELECT COUNT(*)::INT AS total

      FROM conductores c
      INNER JOIN usuarios u ON u.id = c.usuario_id

      LEFT JOIN LATERAL (
        SELECT l.numero_licencia
        FROM licencias_conducir l
        WHERE l.conductor_id = c.usuario_id
          AND l.activa = TRUE
        ORDER BY l.fecha_vencimiento DESC
        LIMIT 1
      ) lc ON TRUE

      ${whereClause};
      `,
      params
    );

    return result.rows[0].total;
  }
}
