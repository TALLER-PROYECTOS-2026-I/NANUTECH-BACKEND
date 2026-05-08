/**
 * Repositorio encargado de acceso a datos
 * del módulo de camiones.
 */

import db from "../../shared/config/database.mjs";

function normalizeEstadoFilter(estado) {
  if (!estado) return null;

  const value = String(estado).trim().toUpperCase();

  if (value === "TODOS") return null;
  if (value === "EN_USO") return "EN_JORNADA";

  return value;
}

function getActivoCondition(columns) {
  return columns.has("activo") ? "u.activo = TRUE" : "TRUE";
}

function buildUnidadFilters(filters = {}, columns = new Set()) {
  const conditions = [getActivoCondition(columns)];
  const params = [];

  if (filters.placa) {
    params.push(`%${String(filters.placa).trim()}%`);
    conditions.push(`u.placa ILIKE $${params.length}`);
  }

  const estado = normalizeEstadoFilter(filters.estado);

  if (estado) {
    params.push(estado);
    conditions.push(`u.estado = $${params.length}`);
  }

  return {
    whereClause: `WHERE ${conditions.join(" AND ")}`,
    params,
  };
}

async function tableExists(tableName) {
  try {
    const result = await db.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      ) AS exists
      `,
      [tableName],
    );

    return Boolean(result.rows[0]?.exists);
  } catch (error) {
    console.warn(
      `No se pudo verificar existencia de tabla ${tableName}:`,
      error.message,
    );
    return false;
  }
}

async function getExistingColumns(tableName) {
  try {
    const result = await db.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      `,
      [tableName],
    );

    return new Set(result.rows.map((row) => row.column_name));
  } catch (error) {
    console.warn(
      `No se pudo obtener columnas de tabla ${tableName}:`,
      error.message,
    );
    return new Set();
  }
}

function columnOrNull(columns, columnName, alias, type = "text") {
  if (columns.has(columnName)) {
    return `u.${columnName} AS ${alias}`;
  }

  return `NULL::${type} AS ${alias}`;
}

function columnOrDefault(columns, columnName, alias, defaultExpression) {
  if (columns.has(columnName)) {
    return `u.${columnName} AS ${alias}`;
  }

  return `${defaultExpression} AS ${alias}`;
}

function getUnidadSelectFields(columns) {
  return `
    u.id,
    u.placa,
    u.marca,
    u.modelo,
    ${columnOrNull(columns, "anio", "anio", "int")},
    ${columnOrNull(columns, "capacidad_ton", "capacidad_ton", "numeric")},
    u.estado,
    ${columnOrDefault(columns, "gps_habilitado", "gps_habilitado", "false")},
    ${columnOrNull(columns, "vin", "vin", "text")},
    ${columnOrNull(columns, "color", "color", "text")},
    ${columnOrNull(columns, "tipo_combustible", "tipo_combustible", "text")},
    ${columnOrNull(columns, "fecha_registro", "fecha_registro", "date")},
    ${columnOrNull(columns, "ultima_fecha_mantenimiento", "ultima_fecha_mantenimiento", "date")},
    ${columnOrNull(columns, "proxima_fecha_mantenimiento", "proxima_fecha_mantenimiento", "date")},
    ${columnOrDefault(columns, "kilometraje_actual", "kilometraje_actual", "0::numeric")},
    ${columnOrDefault(columns, "activo", "activo", "true")}
  `;
}

function getGpsSelectFields(hasGpsRegistros) {
  if (!hasGpsRegistros) {
    return `
      0::float AS horas_movimiento,
      0::float AS horas_detenido,
      0::float AS horas_totales,
      0::float AS kilometros_totales,
      NULL::timestamp AS ultimo_gps_at
    `;
  }

  return `
    COALESCE(gps.horas_movimiento, 0)::float AS horas_movimiento,
    COALESCE(gps.horas_detenido, 0)::float AS horas_detenido,
    (
      COALESCE(gps.horas_movimiento, 0) +
      COALESCE(gps.horas_detenido, 0)
    )::float AS horas_totales,
    COALESCE(gps.kilometros_totales, 0)::float AS kilometros_totales,
    gps.ultimo_gps_at
  `;
}

function getGpsJoin(hasGpsRegistros) {
  if (!hasGpsRegistros) {
    return "";
  }

  return `
    LEFT JOIN (
      SELECT
        unidad_id,
        ROUND((COUNT(*) FILTER (WHERE velocidad_kmh > 5) * 0.5)::numeric, 2) AS horas_movimiento,
        ROUND((COUNT(*) FILTER (WHERE velocidad_kmh <= 5 OR velocidad_kmh IS NULL) * 0.5)::numeric, 2) AS horas_detenido,
        MAX(odometro_km) AS kilometros_totales,
        MAX(fecha_hora) AS ultimo_gps_at
      FROM gps_registros
      GROUP BY unidad_id
    ) gps ON gps.unidad_id = u.id
  `;
}

export class CamionRepository {

  /**
 * Consulta todos los camiones registrados.
 */ 

  async getAll(filters = {}) {
    try {
      const columns = await getExistingColumns("unidades");
      const { whereClause, params } = buildUnidadFilters(filters, columns);

      const hasGpsRegistros = await tableExists("gps_registros");
      const unidadSelectFields = getUnidadSelectFields(columns);
      const gpsSelectFields = getGpsSelectFields(hasGpsRegistros);
      const gpsJoin = getGpsJoin(hasGpsRegistros);

      const result = await db.query(
        `
        SELECT
          ${unidadSelectFields},
          ${gpsSelectFields}
        FROM unidades u
        ${gpsJoin}
        ${whereClause}
        ORDER BY u.placa
        `,
        params,
      );

      return result.rows;
    } catch (error) {
      console.error("Error en getAll repository:", error);
      throw new Error(`Error al obtener camiones: ${error.message}`);
    }
  }

/**
 * Busca un camión específico por UUID.
 */

  async getById(id) {
    try {
      const columns = await getExistingColumns("unidades");

      const hasGpsRegistros = await tableExists("gps_registros");
      const unidadSelectFields = getUnidadSelectFields(columns);
      const gpsSelectFields = getGpsSelectFields(hasGpsRegistros);
      const gpsJoin = getGpsJoin(hasGpsRegistros);

      const result = await db.query(
        `
        SELECT
          ${unidadSelectFields},
          ${gpsSelectFields}
        FROM unidades u
        ${gpsJoin}
        WHERE u.id::text = $1
        LIMIT 1
        `,
        [String(id)],
      );

      if (result.rows[0]) {
        return result.rows[0];
      }

      if (/^\d+$/.test(String(id))) {
        const offset = Math.max(Number(id) - 1, 0);

        const fallbackResult = await db.query(
          `
          SELECT
            ${unidadSelectFields},
            ${gpsSelectFields}
          FROM unidades u
          ${gpsJoin}
          ${getActivoCondition(columns) === "TRUE" ? "" : "WHERE u.activo = TRUE"}
          ORDER BY u.placa
          OFFSET $1
          LIMIT 1
          `,
          [offset],
        );

        return fallbackResult.rows[0] || null;
      }

      return null;
    } catch (error) {
      console.error("Error en getById repository:", error);
      throw new Error(`Error al obtener camión: ${error.message}`);
    }
  }

/**
 * Verifica existencia de placa duplicada.
 */

  async getByPlaca(placa) {
    try {
      const result = await db.query(
        `
        SELECT id, placa, marca, modelo, estado
        FROM unidades
        WHERE UPPER(placa) = UPPER($1)
        LIMIT 1
        `,
        [placa],
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error("Error en getByPlaca:", error);
      throw new Error(`Error al obtener camión por placa: ${error.message}`);
    }
  }

/**
 * Verifica existencia de VIN duplicado.
 */

  async getByVin(vin) {
    try {
      const columns = await getExistingColumns("unidades");

      if (!columns.has("vin")) {
        return null;
      }

      const result = await db.query(
        `
        SELECT id, placa, vin
        FROM unidades
        WHERE UPPER(vin) = UPPER($1)
        LIMIT 1
        `,
        [vin],
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error("Error en getByVin:", error);
      throw new Error(`Error al obtener camión por VIN: ${error.message}`);
    }
  }

/**
 * Inserta un nuevo camión en base de datos.
 */

  async create(data) {
    try {
      const result = await db.query(
        `
        INSERT INTO unidades (
          placa,
          marca,
          modelo,
          anio,
          capacidad_ton,
          estado,
          gps_habilitado,
          vin,
          color,
          tipo_combustible,
          fecha_registro,
          ultima_fecha_mantenimiento,
          proxima_fecha_mantenimiento,
          kilometraje_actual,
          activo,
          notas
        )
        VALUES (
          $1, $2, $3, $4, $5,
          'DISPONIBLE',
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          TRUE, $14
        )
        RETURNING
          id,
          placa,
          marca,
          modelo,
          anio,
          capacidad_ton,
          estado,
          gps_habilitado,
          vin,
          color,
          tipo_combustible,
          fecha_registro,
          ultima_fecha_mantenimiento,
          proxima_fecha_mantenimiento,
          kilometraje_actual,
          activo,
          0::float AS horas_movimiento,
          0::float AS horas_detenido,
          0::float AS horas_totales,
          kilometraje_actual::float AS kilometros_totales,
          NULL::timestamp AS ultimo_gps_at
        `,
        [
          data.placa,
          data.marca,
          data.modelo,
          data.anio,
          data.capacidad_ton,
          data.gps_habilitado,
          data.vin,
          data.color,
          data.tipo_combustible,
          data.fecha_registro,
          data.ultima_fecha_mantenimiento,
          data.proxima_fecha_mantenimiento,
          data.kilometraje_actual,
          data.notas,
        ],
      );

      const unidad = result.rows[0];

      await this.syncCamionLegacy(unidad);

      return unidad;
    } catch (error) {
      console.error("Error en create repository:", error);
      throw new Error(`Error al registrar camión: ${error.message}`);
    }
  }

  async syncCamionLegacy(unidad) {
    try {
      await db.query(
        `
        INSERT INTO camiones (unidad_id, placa, marca, modelo, estado)
        VALUES ($1, $2, $3, $4, 'disponible')
        ON CONFLICT (placa) DO NOTHING
        `,
        [unidad.id, unidad.placa, unidad.marca, unidad.modelo],
      );
    } catch (error) {
      console.warn(
        "No se pudo sincronizar tabla legacy camiones:",
        error.message,
      );
    }
  }

/**
 * Obtiene información consolidada de monitoreo.
 * 
 * Incluye métricas GPS calculadas mediante
 * agregaciones SQL y LEFT JOIN.
 */

  async getPanel(filters = {}) {
    try {
      const columns = await getExistingColumns("unidades");
      const { whereClause, params } = buildUnidadFilters(filters, columns);

      const hasGpsRegistros = await tableExists("gps_registros");
      const unidadSelectFields = getUnidadSelectFields(columns);
      const gpsSelectFields = getGpsSelectFields(hasGpsRegistros);
      const gpsJoin = getGpsJoin(hasGpsRegistros);

      const result = await db.query(
        `
        WITH base AS (
          SELECT
            ${unidadSelectFields},
            ${gpsSelectFields}
          FROM unidades u
          ${gpsJoin}
          ${whereClause}
        )
        SELECT
          COALESCE(json_agg(base ORDER BY placa), '[]'::json) AS camiones,
          COUNT(*)::int AS total_camiones,
          COUNT(*) FILTER (WHERE estado = 'EN_JORNADA')::int AS en_uso,
          COUNT(*) FILTER (WHERE estado = 'DISPONIBLE')::int AS disponibles,
          COUNT(*) FILTER (WHERE estado = 'MANTENIMIENTO')::int AS mantenimiento,
          COALESCE(SUM(horas_movimiento), 0)::float AS horas_movimiento,
          COALESCE(SUM(horas_detenido), 0)::float AS horas_detenido
        FROM base
        `,
        params,
      );

      const row = result.rows[0] || {};
      const horasMovimiento = Number(row.horas_movimiento || 0);
      const horasDetenido = Number(row.horas_detenido || 0);
      const horasTotales = horasMovimiento + horasDetenido;

      return {
        resumen: {
          total_camiones: Number(row.total_camiones || 0),
          en_uso: Number(row.en_uso || 0),
          disponibles: Number(row.disponibles || 0),
          mantenimiento: Number(row.mantenimiento || 0),
        },
        grafica_movimiento: {
          horas_movimiento: horasMovimiento,
          horas_detenido: horasDetenido,
          porcentaje_movimiento:
            horasTotales > 0
              ? Number(((horasMovimiento / horasTotales) * 100).toFixed(2))
              : 0,
          porcentaje_detenido:
            horasTotales > 0
              ? Number(((horasDetenido / horasTotales) * 100).toFixed(2))
              : 0,
        },
        camiones: row.camiones || [],
      };
    } catch (error) {
      console.error("Error en getPanel repository:", error);
      throw new Error(`Error al obtener panel de camiones: ${error.message}`);
    }
  }

/**
 * Obtiene información estructurada para exportación CSV.
 */
  async exportCsv(filters = {}) {
    const panel = await this.getPanel(filters);
    const camiones = panel.camiones || [];

    const headers = [
      "ID",
      "Placa",
      "Marca",
      "Modelo",
      "Año",
      "Capacidad (ton)",
      "Estado",
      "VIN",
      "Color",
      "GPS",
      "Kilometraje",
      "Fecha de Registro",
      "Último Mantenimiento",
      "Próximo Mantenimiento",
    ];

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return "";
      const text = String(value).replaceAll('"', '""');
      return `"${text}"`;
    };

    const rows = camiones.map((camion) => [
      camion.id,
      camion.placa,
      camion.marca,
      camion.modelo,
      camion.anio,
      camion.capacidad_ton,
      camion.estado,
      camion.vin,
      camion.color,
      camion.gps_habilitado ? "SI" : "NO",
      camion.kilometros_totales ?? camion.kilometraje_actual ?? 0,
      camion.fecha_registro,
      camion.ultima_fecha_mantenimiento,
      camion.proxima_fecha_mantenimiento,
    ]);

    return [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");
  }
}

export default new CamionRepository();