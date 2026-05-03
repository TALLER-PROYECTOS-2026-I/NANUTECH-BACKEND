import db from "../../shared/config/database.mjs";

export class GpsRepository {
  async findUnidadByPlaca(placa) {
    const result = await db.query(
      `
      SELECT id, placa
      FROM unidades
      WHERE UPPER(placa) = UPPER($1)
        AND activo = TRUE
      LIMIT 1
      `,
      [placa],
    );

    return result.rows[0] || null;
  }

  async createImportacion({
    proveedor,
    nombreArchivo,
    totalRegistros,
    registrosValidos,
    registrosInvalidos,
    estado,
    observaciones = null,
    cargadoPor = null,
  }) {
    const result = await db.query(
      `
      INSERT INTO gps_importaciones (
        proveedor,
        nombre_archivo,
        cargado_por,
        total_registros,
        registros_validos,
        registros_invalidos,
        estado,
        observaciones,
        processed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id, proveedor, nombre_archivo, total_registros, registros_validos,
                registros_invalidos, estado, observaciones, created_at, processed_at
      `,
      [
        proveedor,
        nombreArchivo,
        cargadoPor,
        totalRegistros,
        registrosValidos,
        registrosInvalidos,
        estado,
        observaciones,
      ],
    );

    return result.rows[0];
  }

  async saveImportacionError({
    importacionId,
    rowNumber,
    field,
    value,
    message,
    rawPayload,
  }) {
    await db.query(
      `
      INSERT INTO gps_importacion_errores (
        importacion_id,
        numero_fila,
        campo,
        valor_recibido,
        motivo_error,
        raw_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        importacionId,
        rowNumber,
        field,
        value === undefined || value === null ? null : String(value),
        message,
        JSON.stringify(rawPayload || {}),
      ],
    );
  }

  async existsRegistro({ proveedor, unidadId, fechaHora }) {
    const result = await db.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM gps_registros
        WHERE proveedor = $1
          AND unidad_id = $2
          AND fecha_hora = $3
      ) AS exists
      `,
      [proveedor, unidadId, fechaHora],
    );

    return result.rows[0].exists;
  }

  async insertRegistro({ importacionId, unidadId, row }) {
    const result = await db.query(
      `
      INSERT INTO gps_registros (
        importacion_id,
        unidad_id,
        jornada_id,
        fecha_hora,
        latitud,
        longitud,
        velocidad_kmh,
        rumbo,
        odometro_km,
        estado,
        proveedor,
        raw_payload
      )
      VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      RETURNING id, unidad_id, fecha_hora, latitud, longitud, velocidad_kmh,
                rumbo, odometro_km, estado, proveedor, created_at
      `,
      [
        importacionId,
        unidadId,
        row.fecha_hora,
        row.latitud,
        row.longitud,
        row.velocidad_kmh,
        row.rumbo,
        row.odometro_km,
        row.estado,
        row.proveedor,
        JSON.stringify(row.raw_payload || {}),
      ],
    );

    return result.rows[0];
  }

  async importRows({
    proveedor,
    nombreArchivo,
    validRows,
    validationErrors = [],
    cargadoPor = null,
  }) {
    let registrosImportados = 0;
    let duplicadosOmitidos = 0;
    let registrosInvalidos = validationErrors.length;
    const errores = [...validationErrors];
    const insertados = [];

    const importacion = await this.createImportacion({
      proveedor,
      nombreArchivo,
      totalRegistros: validRows.length + validationErrors.length,
      registrosValidos: 0,
      registrosInvalidos: validationErrors.length,
      estado: validationErrors.length > 0 ? "PROCESADA_CON_ERRORES" : "PENDIENTE",
      observaciones: "Importación GPS iniciada desde backend HU8.",
      cargadoPor,
    });

    for (const validationError of validationErrors) {
      await this.saveImportacionError({
        importacionId: importacion.id,
        rowNumber: validationError.row,
        field: validationError.field,
        value: validationError.value,
        message: validationError.message,
        rawPayload: validationError,
      });
    }

    for (const row of validRows) {
      const unidad = await this.findUnidadByPlaca(row.placa);

      if (!unidad) {
        registrosInvalidos += 1;

        const error = {
          row: row.rowNumber,
          field: "placa",
          value: row.placa,
          message: `No existe una unidad activa con placa ${row.placa}.`,
        };

        errores.push(error);

        await this.saveImportacionError({
          importacionId: importacion.id,
          rowNumber: row.rowNumber,
          field: "placa",
          value: row.placa,
          message: error.message,
          rawPayload: row.raw_payload,
        });

        continue;
      }

      const exists = await this.existsRegistro({
        proveedor: row.proveedor,
        unidadId: unidad.id,
        fechaHora: row.fecha_hora,
      });

      if (exists) {
        duplicadosOmitidos += 1;
        continue;
      }

      const inserted = await this.insertRegistro({
        importacionId: importacion.id,
        unidadId: unidad.id,
        row,
      });

      registrosImportados += 1;

      insertados.push({
        ...inserted,
        placa: unidad.placa,
      });
    }

    const estadoFinal =
      registrosImportados > 0 && registrosInvalidos > 0
        ? "PROCESADA_CON_ERRORES"
        : registrosImportados > 0
          ? "PROCESADA"
          : registrosInvalidos > 0
            ? "RECHAZADA"
            : "PROCESADA";

    await db.query(
      `
      UPDATE gps_importaciones
      SET registros_validos = $1,
          registros_invalidos = $2,
          estado = $3,
          observaciones = $4,
          processed_at = NOW()
      WHERE id = $5
      `,
      [
        registrosImportados,
        registrosInvalidos,
        estadoFinal,
        `Importados: ${registrosImportados}. Duplicados omitidos: ${duplicadosOmitidos}. Inválidos: ${registrosInvalidos}.`,
        importacion.id,
      ],
    );

    return {
      importacion_id: importacion.id,
      proveedor,
      nombre_archivo: nombreArchivo,
      registros_importados: registrosImportados,
      duplicados_omitidos: duplicadosOmitidos,
      registros_invalidos: registrosInvalidos,
      estado: estadoFinal,
      errores,
      registros: insertados,
    };
  }

  async getSummary() {
    const result = await db.query(`
      WITH ultimos AS (
        SELECT DISTINCT ON (unidad_id)
          unidad_id,
          estado,
          velocidad_kmh,
          fecha_hora
        FROM gps_registros
        ORDER BY unidad_id, fecha_hora DESC
      )
      SELECT
        COUNT(*)::int AS total_registros_activos,
        COUNT(*) FILTER (WHERE estado IN ('MOVIENDO', 'EXCESO_VELOCIDAD'))::int AS unidades_en_movimiento,
        COUNT(*) FILTER (WHERE estado = 'DETENIDO')::int AS unidades_detenidas,
        COALESCE(ROUND(AVG(velocidad_kmh)::numeric, 2), 0)::float AS velocidad_promedio
      FROM ultimos
    `);

    return result.rows[0];
  }

  async listRegistros({ proveedor, placa } = {}) {
    const conditions = [];
    const params = [];

    if (proveedor) {
      params.push(proveedor);
      conditions.push(`gr.proveedor = $${params.length}`);
    }

    if (placa) {
      params.push(`%${placa}%`);
      conditions.push(`un.placa ILIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await db.query(
      `
      SELECT
        gr.id,
        un.placa,
        gr.proveedor,
        gr.fecha_hora,
        gr.latitud,
        gr.longitud,
        gr.velocidad_kmh,
        gr.rumbo,
        gr.odometro_km AS distancia_total,
        gr.estado,
        gr.created_at
      FROM gps_registros gr
      JOIN unidades un ON un.id = gr.unidad_id
      ${whereClause}
      ORDER BY gr.fecha_hora DESC
      LIMIT 200
      `,
      params,
    );

    return result.rows;
  }
}