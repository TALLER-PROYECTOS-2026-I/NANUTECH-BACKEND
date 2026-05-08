import { ContratoRepository } from "./contratoRepository.mjs";
import { Contrato } from "./contratoModel.mjs";
import { ContratoValidator } from "../../shared/utils/validators/contratoValidator.mjs";

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

  validateContrato(data) {
    if (!data.cliente || data.cliente.trim() === "") {
      throw new Error("El nombre del cliente no puede estar vacío");
    }

    const ruc = String(data.ruc || "").trim();

    if (!ruc) throw new Error("El RUC es obligatorio");
    if (ruc.length !== 11) throw new Error("El RUC debe tener exactamente 11 dígitos");
    if (!/^\d{11}$/.test(ruc)) throw new Error("El RUC debe contener solo dígitos numéricos");
    if (ruc === "00000000000") throw new Error("El RUC ingresado no es válido");

    if (!data.tipo_servicio) throw new Error("Tipo de Servicio es obligatorio");

    const tiposPermitidos = ["POR_VIAJE", "POR_HORA", "POR_TONELADA", "POR_KM", "MENSUAL"];
    if (!tiposPermitidos.includes(data.tipo_servicio)) {
      throw new Error("El tipo de servicio no es válido");
    }

    if (!data.fecha_inicio) throw new Error("La fecha de inicio es obligatoria");
    if (data.fecha_fin && data.fecha_fin < data.fecha_inicio) {
      throw new Error("La fecha fin no puede ser menor que la fecha inicio");
    }

    if (!data.origen || data.origen.trim() === "") {
      throw new Error("El punto de partida es obligatorio");
    }

    if (!data.destino || data.destino.trim() === "") {
      throw new Error("El punto de llegada es obligatorio");
    }

    if (data.distancia_estimada_km === undefined || Number(data.distancia_estimada_km) <= 0) {
      throw new Error("La distancia debe ser mayor a 0");
    }

    if (data.tarifa_por_km === undefined || Number(data.tarifa_por_km) <= 0) {
      throw new Error("La tarifa debe ser un valor positivo");
    }

    if (data.tarifa_por_hora === undefined) {
      throw new Error("La tarifa por hora es obligatoria");
    }

    if (Number(data.tarifa_por_hora) < 0) {
      throw new Error("La tarifa por hora debe ser mayor o igual a 0");
    }

    if (data.tarifa_espera === undefined) {
      throw new Error("La tarifa por espera es obligatoria");
    }

    if (Number(data.tarifa_espera) < 0) {
      throw new Error("La tarifa por espera debe ser mayor o igual a 0");
    }
  }

  // =========================
  // INDICADORES
  // =========================
  async getIndicadores() {
    return this.contratoRepository.getIndicadores();
  }

  // =========================
  // LISTADO bueno
  // =========================
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
