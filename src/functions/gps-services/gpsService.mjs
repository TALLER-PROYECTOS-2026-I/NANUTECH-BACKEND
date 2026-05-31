
/**
 * Servicio encargado de ejecutar validaciones de estructura, contenido CSV y gestión de negocio GPS.
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
  /**
   * Constructor de la clase que instancia el repositorio de persistencia.
   */
  constructor() {
    this.repository = new GpsRepository();
  }

  /**
   * Obtiene los proveedores GPS soportados formateando sus propiedades básicas.
   */
  getProviders() {
    /**
     * LÓGICA PRINCIPAL
     */
    return getProviderConfigs().map((provider) => ({
      proveedor: provider.code,
      nombre: provider.displayName,
      encabezados: provider.headers,
    }));
  }

  /**
   * Genera la estructura y el contenido de un archivo CSV de ejemplo basado en el proveedor.
   */
  getTemplate(provider) {
    /**
     * LÓGICA PRINCIPAL
     */
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

  /**
   * Realiza un análisis exhaustivo de la estructura, nombre del archivo y registros del CSV.
   */
  validateCsv({ proveedor, nombreArchivo, csvContent }) {
    /**
     * NORMALIZACIÓN Y VALIDACIÓN PREVIA
     */
    const normalizedProvider = normalizeProvider(proveedor);

    assertCsvFilename(nombreArchivo);

    const validation = validateCsvContent(csvContent, normalizedProvider);

    /**
     * RETORNO DE RESULTADO ESTRUCTURADO
     */
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
   * Procesa la importación e inserción de registros GPS válidos en lote bajo reglas de negocio definidas.
   */
  async importCsv({ proveedor, nombreArchivo, csvContent, cargadoPor }) {
    /**
     * NORMALIZACIÓN Y VALIDACIÓN PREVIA
     */
    const normalizedProvider = normalizeProvider(proveedor);

    assertCsvFilename(nombreArchivo);

    const validation = validateCsvContent(csvContent, normalizedProvider);

    /**
     * DESPACHO HACIA REPOSITORIO SEGÚN ESTADO DE VALIDACIÓN
     */
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
   * Solicita al repositorio las métricas operativas generales agregadas del GPS.
   */
  async getSummary() {
    /**
     * ACCESO A REPOSITORIO
     */
    return this.repository.getSummary();
  }

  /**
   * Solicita al repositorio el resumen de tracking enfocado en excesos de velocidad y estados actuales.
   */
  async getTrackingSummary() {
    /**
     * ACCESO A REPOSITORIO
     */
    return this.repository.getTrackingSummary();
  }

  /**
   * Prepara los filtros y criterios dinámicos para exportar el historial de tracking a formato CSV.
   */
  async exportTrackingCsv(filters = {}) {
    /**
     * NORMALIZACIÓN DE FILTROS OBLIGATORIOS
     */
    const proveedor = filters.proveedor
      ? normalizeProvider(filters.proveedor)
      : undefined;

    /**
     * ACCESO A REPOSITORIO
     */
    return this.repository.exportTrackingCsv({
      proveedor,
      placa: filters.placa,
      estado: filters.estado,
      horaInicio: filters.horaInicio,
      horaFin: filters.horaFin,
    });
  }

  /**
   * Prepara los filtros dinámicos requeridos para obtener y listar el historial de registros almacenados.
   */
  async listRegistros(filters = {}) {
    /**
     * NORMALIZACIÓN DE FILTROS OBLIGATORIOS
     */
    const proveedor = filters.proveedor
      ? normalizeProvider(filters.proveedor)
      : undefined;

    /**
     * ACCESO A REPOSITORIO
     */
    return this.repository.listRegistros({
      proveedor,
      placa: filters.placa,
      estado: filters.estado,
      horaInicio: filters.horaInicio,
      horaFin: filters.horaFin,
    });
  }
}