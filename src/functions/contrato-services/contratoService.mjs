import { ContratoRepository } from "./contratoRepository.mjs";
import { Contrato } from "./contratoModel.mjs";
import { ContratoValidator } from "../../shared/utils/validators/contratoValidator.mjs";

/**
 * Servicio de dominio para la gestión de contratos de transporte.
 * Centraliza la validación de reglas de negocio y coordina el acceso al repositorio.
 */
export class ContratoService {
  constructor() {
    this.contratoRepository = new ContratoRepository();
  }

  // =========================
  // GET VIGENTES
  // =========================
  async getAllVigentes() {
    const rows = await this.contratoRepository.getAllVigentes();
    return Contrato.fromDatabaseList(rows);
  }

  // =========================
  // CREATE
  // =========================
  /**
   * Registra un nuevo contrato.
   *
   * Flujo:
   * 1. Valida reglas de negocio.
   * 2. Envía información al Repository.
   * 3. Retorna contrato transformado.
   */
  async createContrato(data) {
    // Aplica validaciones de negocio
    ContratoValidator.validateContrato(data);

    // Registra contrato en base de datos
    const row = await this.contratoRepository.createContrato(data);

    // Transforma respuesta usando el modelo Contrato
    return Contrato.fromDatabase(row);
  }

  // =========================
  // INDICADORES
  // =========================
  /**
   * Obtiene los indicadores agregados del módulo de contratos mediante CTEs en SQL.
   * Incluye totales por estado, por tipo de servicio, camiones asignados activos
   * y contratos con fecha_fin dentro de los próximos 30 días.
   *
   * @returns {Promise<Object>} Objeto con todas las métricas agregadas del módulo
   */
  async getIndicadores() {
    return this.contratoRepository.getIndicadores();
  }

  /**
   * Obtiene contratos paginados con filtros opcionales.
   * Normaliza los parámetros de paginación y retorna metadatos junto con los datos.
   *
   * @param {Object} [filtros={}] - Filtros de búsqueda
   * @param {string} [filtros.q] - Texto libre (busca en código y cliente)
   * @param {string} [filtros.estado] - Estado exacto del contrato (VIGENTE, VENCIDO, etc.)
   * @param {Object} [pagination={}] - Parámetros de paginación y ordenamiento
   * @param {string|number} [pagination.page=1] - Número de página actual
   * @param {string|number} [pagination.limit=10] - Registros por página (máx: 100)
   * @param {string} [pagination.order_by='fecha_fin'] - Campo para ordenar (ver ALLOWED_ORDER_FIELDS en repositorio)
   * @returns {Promise<{ data: Object[], meta: { total: number, page: number, limit: number, total_pages: number } }>}
   */
  async getAllContratos(filtros = {}, pagination = {}) {
    const { rows, total, page, limit } = await this.contratoRepository.findAll(filtros, pagination);

    return {
      data: rows,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // =========================
  // DETALLE
  // =========================

  // Obtiene el detalle completo del contrato seleccionado,
  // incluyendo las unidades vinculadas a la operación.
  async getContratoById(id) {
    return this.contratoRepository.findById(id);
  }

  // =========================
  // UPDATE + HISTORIAL
  // =========================

  // Actualiza la información editable del contrato
  // y registra automáticamente los cambios realizados.
  async updateContrato(id, data, ip) {
    const actual = (await this.contratoRepository.findById(id)) || {};

    // =========================
    // VALIDACIONES DE NEGOCIO - HU07
    // =========================

    // Valida que la fecha fin no sea menor a la fecha inicio.
    if (data.fecha_fin && data.fecha_inicio && data.fecha_fin < data.fecha_inicio) {
      throw new Error("Fecha fin no puede ser menor a inicio");
    }

    // Valida que la tarifa tenga un valor válido.
    if (data.tarifa !== undefined && Number(data.tarifa) <= 0) {
      throw new Error("La tarifa no puede ser 0");
    }

    // Valida que la descripción no esté vacía.
    if (data.descripcion !== undefined && data.descripcion.trim() === "") {
      throw new Error("La descripción no puede estar vacía");
    }

    // =========================
    // REGISTRO DE HISTORIAL
    // =========================

    // Registra cambios realizados en la fecha de finalización.
    if (data.fecha_fin && data.fecha_fin !== actual.fecha_fin) {
      await this.contratoRepository.insertHistorial({
        contrato_id: id,
        campo: "fecha_fin",
        valor_anterior: actual.fecha_fin,
        valor_nuevo: data.fecha_fin,
        ip_address: ip,
      });
    }

    // Registra modificaciones realizadas sobre la tarifa.
    if (data.tarifa !== undefined && Number(data.tarifa) !== Number(actual.tarifa)) {
      await this.contratoRepository.insertHistorial({
        contrato_id: id,
        campo: "tarifa",
        valor_anterior: actual.tarifa,
        valor_nuevo: data.tarifa,
        ip_address: ip,
      });
    }

    // Registra cambios realizados en la descripción del contrato.
    if (data.descripcion !== undefined && data.descripcion !== actual.descripcion) {
      await this.contratoRepository.insertHistorial({
        contrato_id: id,
        campo: "descripcion",
        valor_anterior: actual.descripcion,
        valor_nuevo: data.descripcion,
        ip_address: ip,
      });
    }

    // Actualización principal del contrato.
    await this.contratoRepository.updateContrato(id, data);

    // Actualización del esquema de tarifas del contrato.
    if (data.tarifas) {
      await this.contratoRepository.updateTarifas(id, data.tarifas);
    }

    return { updated: true };
  }

  // =========================
  // ASIGNAR UNIDADES //
  // =========================

  // Permite asignar múltiples camiones/unidades al contrato.
  async assignUnidades(id, unidades) {
    // Elimina las asignaciones anteriores antes de registrar nuevas.
    await this.contratoRepository.deleteUnidades(id);

    // Inserta cada unidad seleccionada en el contrato.
    for (const unidad of unidades) {
      await this.contratoRepository.insertUnidad(id, unidad);
    }

    return { assigned: true };
  }
}
