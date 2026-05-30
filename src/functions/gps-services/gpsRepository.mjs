// gpsRepository.mjs

import db from "../../shared/config/database.mjs";

/**
 * Repositorio encargado de la persistencia y consultas de datos GPS en la base de datos.
 */
export class GpsRepository {
  /**
   * Busca unidades asociadas a una placa específica.
   */
  async findUnidadByPlaca(placa) {
    /**
     * LÓGICA PRINCIPAL / CONSULTA SQL
     */
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

  /**
   * Registra la metadata inicial o final de una importación masiva de datos GPS.
   */
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
    /**
     * LÓGICA PRINCIPAL / INSERCIÓN SQL
     */
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

  /**
   * Almacena los errores específicos detectados en las filas durante el proceso de importación.
   */
  async saveImportacionError({
    importacionId,
    rowNumber,
    field,
    value,
    message,
    rawPayload,
  }) {
    /**
     * LÓGICA PRINCIPAL / INSERCIÓN SQL
     */
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

  /**
   * Verifica si ya existe un registro GPS idéntico (evita duplicados por proveedor, unidad y marca de tiempo).
   */
  async existsRegistro({ proveedor, unidadId, fechaHora }) {
    /**
     * LÓGICA PRINCIPAL / CONSULTA SQL
     */
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

  /**
   * Inserta un registro de geolocalización GPS individual previamente validado.
   */
  async insertRegistro({ importacionId, unidadId, row }) {
    /**
     * LÓGICA PRINCIPAL / INSERCIÓN SQL
     */
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

  /**
   * Procesa e inserta múltiples registros en lote, gestionando unidades inexistentes, duplicados y transiciones de estado.
   */
  async importRows({
    proveedor,
    nombreArchivo,
    validRows,
    validationErrors = [],
    cargadoPor = null,
  }) {
    /**
     * INICIALIZACIÓN DE CONTADORES Y VARIABLES
     */
    let registrosImportados = 0;
    let duplicadosOmitidos = 0;
    let registrosInvalidos = validationErrors.length;
    const errores = [...validationErrors];
    const insertados = [];

    /**
     * REGISTRO DE APERTURA DE IMPORTACIÓN
     */
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

    /**
     * PROCESAMIENTO DE ERRORES PREVIOS DE VALIDACIÓN
     */
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

    /**
     * PROCESAMIENTO Y VALIDACIÓN DE FILAS ENCONTRADAS COMO VÁLIDAS
     */
    for (const row of validRows) {
      const unidad = await this.findUnidadByPlaca(row.placa);

      // Si la unidad asociada a la placa no existe o está inactiva
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

      // Verificación de duplicidad cronológica
      const exists = await this.existsRegistro({
        proveedor: row.proveedor,
        unidadId: unidad.id,
        fechaHora: row.fecha_hora,
      });

      if (exists) {
        duplicadosOmitidos += 1;
        continue;
      }

      // Inserción del registro definitivo
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

    /**
     * CÁLCULO DEL ESTADO FINAL DE LA IMPORTACIÓN
     */
    const estadoFinal =
      registrosImportados > 0 && registrosInvalidos > 0
        ? "PROCESADA_CON_ERRORES"
        : registrosImportados > 0
          ? "PROCESADA"
          : registrosInvalidos > 0
            ? "RECHAZADA"
            : "PROCESADA";

    /**
     * ACTUALIZACIÓN DE RESUMEN FINAL DE LA IMPORTACIÓN
     */
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

  /**
   * Obtiene métricas agregadas del último estado conocido de cada unidad.
   */
  async getSummary() {
    /**
     * LÓGICA PRINCIPAL / CONSULTA CON CTE (DISTINCT ON)
     */
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

  /**
   * Lista y filtra el historial de registros GPS con base en criterios dinámicos.
   */
  async listRegistros({
    proveedor,
    placa,
    estado,
    horaInicio,
    horaFin,
  } = {}) {
    /**
     * CONSTRUCCIÓN DINÁMICA DE CONDICIONES WHERE
     */
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

    if (estado) {
      params.push(estado);
      conditions.push(`gr.estado = $${params.length}`);
    }

    if (horaInicio) {
      params.push(horaInicio);
      conditions.push(`gr.fecha_hora >= $${params.length}`);
    }

    if (horaFin) {
      params.push(horaFin);
      conditions.push(`gr.fecha_hora <= $${params.length}`);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    /**
     * LÓGICA PRINCIPAL / EJECUCIÓN DE CONSULTA DINÁMICA
     */
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
      gr.created_at,

      CASE
        WHEN gr.velocidad_kmh > 90 THEN TRUE
        ELSE FALSE
      END AS exceso_velocidad

    FROM gps_registros gr
    INNER JOIN unidades un
      ON un.id = gr.unidad_id

    ${whereClause}

    ORDER BY
      CASE
        WHEN gr.velocidad_kmh > 90 THEN 0
        ELSE 1
      END,
      gr.fecha_hora DESC
    `,
      params,
    );

    return result.rows;
  }

  /**
   * Obtiene un resumen estadístico de tracking enfocado en excesos de velocidad y estados actuales de las unidades.
   */
  async getTrackingSummary() {
    /**
     * LÓGICA PRINCIPAL / CONSULTA CON CTE (DISTINCT ON)
     */
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
        COUNT(*)::int AS total_registros,

        COUNT(*) FILTER (
          WHERE estado IN ('MOVIENDO','EXCESO_VELOCIDAD')
        )::int AS unidades_movimiento,

        COUNT(*) FILTER (
          WHERE estado = 'DETENIDO'
        )::int AS unidades_detenidas,

        COUNT(*) FILTER (
          WHERE velocidad_kmh > 90
        )::int AS excesos_velocidad

      FROM ultimos
    `);

    return result.rows[0];
  }

  /**
   * Interfaz de repositorio para exportar el historial de tracking reutilizando la lógica de listado.
   */
  async exportTrackingCsv(filters = {}) {
    /**
     * REUTILIZACIÓN DE FUNCIÓN DE BÚSQUEDA
     */
    return this.listRegistros(filters);
  }
}