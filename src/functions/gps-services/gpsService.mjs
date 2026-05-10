/**
 * Ejecuta validaciones de estructura y contenido CSV.
 */

import { GpsRepository } from "./gpsRepository.mjs";
import {
  assertCsvFilename,
  getProviderConfig,
  getProviderConfigs,
  normalizeProvider,
  validateCsvContent,
} from "./gpsValidator.mjs";

export class GpsService {
  constructor() {
    this.repository = new GpsRepository();
  }

  getProviders() {
    return getProviderConfigs().map((provider) => ({
      proveedor: provider.code,
      nombre: provider.displayName,
      encabezados: provider.headers,
    }));
  }

/**
 * Genera estructura CSV compatible con importaciones.
 */

  getTemplate(provider) {
    const config = getProviderConfig(provider);

    const example =
      config.code === "GPSCONTROL"
        ? "2026-05-01,08:00:00,ABC-123,-12.0464000,-77.0428000,60,180,1000.50"
        : "2026-05-01,08:00:00,ABC-123,-12.0464000,-77.0428000,60,180,1000.50";

    return {
      proveedor: config.code,
      nombre: config.displayName,
      filename: `${config.code.toLowerCase()}_plantilla_gps.csv`,
      content_type: "text/csv",
      encabezados: config.headers,
      csv: `${config.headers.join(",")}\n${example}`,
    };
  }

  validateCsv({ proveedor, nombreArchivo, csvContent }) {
    const normalizedProvider = normalizeProvider(proveedor);

    assertCsvFilename(nombreArchivo);

    const validation = validateCsvContent(csvContent, normalizedProvider);

    return {
      proveedor: normalizedProvider,
      nombre_archivo: nombreArchivo,
      importacion_habilitada: validation.valid,
      total_filas: validation.totalRows,
      encabezados_esperados: validation.headers.expected,
      encabezados_recibidos: validation.headers.received,
      filas_validas: validation.validRows.length,
      errores: validation.errors,
    };
  }

/**
 * Procesa e inserta registros GPS válidos.
 * 
 * Reglas:
 * - evita duplicados
 * - valida coordenadas
 * - valida proveedor
 * - valida velocidades
 */

  async importCsv({ proveedor, nombreArchivo, csvContent, cargadoPor }) {
    const normalizedProvider = normalizeProvider(proveedor);

    assertCsvFilename(nombreArchivo);

    const validation = validateCsvContent(csvContent, normalizedProvider);

    if (!validation.valid) {
      return this.repository.importRows({
        proveedor: normalizedProvider,
        nombreArchivo,
        validRows: validation.validRows,
        validationErrors: validation.errors,
        cargadoPor,
      });
    }

    return this.repository.importRows({
      proveedor: normalizedProvider,
      nombreArchivo,
      validRows: validation.validRows,
      validationErrors: [],
      cargadoPor,
    });
  }

/**
 * Calcula métricas operativas GPS.
 */

  async getSummary() {
    return this.repository.getSummary();
  }

/**
 * Lista registros GPS almacenados.
 */

  async listRegistros(filters = {}) {
    const proveedor = filters.proveedor
      ? normalizeProvider(filters.proveedor)
      : undefined;

    return this.repository.listRegistros({
      proveedor,
      placa: filters.placa,
    });
  }
}