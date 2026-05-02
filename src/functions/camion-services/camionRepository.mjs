import db from "../../shared/config/database.mjs";

export class CamionRepository {
  async getAll() {
    try {
      const result = await db.query(`
        SELECT id, placa, marca, modelo, estado
        FROM camiones 
        ORDER BY id
      `);
      return result.rows;
    } catch (error) {
      console.error("Error en getAll repository:", error);
      throw new Error(`Error al obtener camiones: ${error.message}`);
    }
  }

  async getById(id) {
    try {
      const result = await db.query(
        `SELECT id, placa, marca, modelo, estado
         FROM camiones 
         WHERE id = $1`,
        [id],
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error en getById repository:`, error);
      throw new Error(`Error al obtener camión: ${error.message}`);
    }
  }

  async exists(id) {
    try {
      const result = await db.query(
        "SELECT EXISTS(SELECT 1 FROM camiones WHERE id = $1) as exists",
        [id],
      );
      return result.rows[0].exists;
    } catch (error) {
      console.error("Error en exists:", error);
      return false;
    }
  }

  async getByPlaca(placa) {
    try {
      const result = await db.query(
        `SELECT id, placa, marca, modelo, estado
         FROM camiones 
         WHERE placa = $1`,
        [placa],
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error en getByPlaca:", error);
      throw new Error(`Error al obtener por placa: ${error.message}`);
    }
  }

  async create(data) {
    const { placa, marca, modelo, estado } = data;

    try {
      const result = await db.query(
        `INSERT INTO camiones (placa, marca, modelo, estado)
         VALUES ($1, $2, $3, $4)
         RETURNING id, placa, marca, modelo, estado`,
        [placa, marca, modelo, estado || "disponible"],
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error en create:", error);
      throw new Error(`Error al crear camión: ${error.message}`);
    }
  }

  async update(id, data) {
    const { placa, marca, modelo, estado } = data;

    try {
      const result = await db.query(
        `UPDATE camiones 
         SET placa = $1, marca = $2, modelo = $3, estado = $4
         WHERE id = $5
         RETURNING id, placa, marca, modelo, estado`,
        [placa, marca, modelo, estado, id],
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error en update:", error);
      throw new Error(`Error al actualizar: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const result = await db.query(
        "DELETE FROM camiones WHERE id = $1 RETURNING id",
        [id],
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error en delete:", error);
      throw new Error(`Error al eliminar: ${error.message}`);
    }
  }
  
  async getByPlacaHu11(placa) {
  const result = await db.query(
    `
    SELECT id, placa
    FROM unidades
    WHERE UPPER(placa) = UPPER($1)
    LIMIT 1
    `,
    [placa]
  );

  return result.rows[0] || null;
}

async getByVinHu11(vin) {
  const result = await db.query(
    `
    SELECT id, placa, vin
    FROM unidades
    WHERE UPPER(vin) = UPPER($1)
    LIMIT 1
    `,
    [vin]
  );

  return result.rows[0] || null;
}

async createHu11(data) {
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
      activo
    )
    VALUES (
      $1, $2, $3, $4, $5,
      'DISPONIBLE',
      $6, $7, $8, $9,
      $10, $11, $12, $13,
      TRUE
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
      kilometraje_actual
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
    ]
  );

  return result.rows[0];
}

async getPanelHu11(filters = {}) {
  const conditions = ["u.activo = TRUE"];
  const params = [];

  if (filters.placa) {
    params.push(`%${String(filters.placa).trim()}%`);
    conditions.push(`u.placa ILIKE $${params.length}`);
  }

  if (filters.estado && String(filters.estado).toUpperCase() !== "TODOS") {
    let estado = String(filters.estado).trim().toUpperCase();

    if (estado === "EN_USO") {
      estado = "EN_JORNADA";
    }

    params.push(estado);
    conditions.push(`u.estado = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const result = await db.query(
    `
    WITH base AS (
      SELECT
        u.id,
        u.placa,
        u.marca,
        u.modelo,
        u.anio,
        u.capacidad_ton,
        u.estado,
        u.vin,
        u.color,
        u.gps_habilitado,
        u.kilometraje_actual,
        u.fecha_registro,
        u.ultima_fecha_mantenimiento,
        u.proxima_fecha_mantenimiento,
        COALESCE(gps.horas_movimiento, 0)::float AS horas_movimiento,
        COALESCE(gps.horas_detenido, 0)::float AS horas_detenido,
        (
          COALESCE(gps.horas_movimiento, 0) +
          COALESCE(gps.horas_detenido, 0)
        )::float AS horas_totales,
        COALESCE(gps.kilometros_totales, u.kilometraje_actual, 0)::float AS kilometros_totales
      FROM unidades u
      LEFT JOIN (
        SELECT
          unidad_id,
          ROUND((COUNT(*) FILTER (WHERE velocidad_kmh > 5) * 0.5)::numeric, 2) AS horas_movimiento,
          ROUND((COUNT(*) FILTER (WHERE velocidad_kmh <= 5 OR velocidad_kmh IS NULL) * 0.5)::numeric, 2) AS horas_detenido,
          MAX(odometro_km) AS kilometros_totales
        FROM gps_registros
        GROUP BY unidad_id
      ) gps ON gps.unidad_id = u.id
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
    params
  );

  const row = result.rows[0];

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
}

async exportCsvHu11(filters = {}) {
  const panel = await this.getPanelHu11(filters);
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
    if (value === null || value === undefined) {
      return "";
    }

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
