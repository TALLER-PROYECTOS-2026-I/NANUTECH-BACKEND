import { ContratoRepository } from "./contratoRepository.mjs";
import { Contrato } from "./contratoModel.mjs";

export class ContratoService {
  constructor() {
    this.contratoRepository = new ContratoRepository();
  }
  async getAllVigentes() {
    const rows = await this.contratoRepository.getAllVigentes();
    return Contrato.fromDatabaseList(rows);
  }

  async createContrato(data) {
    this.validateContrato(data);

    const row = await this.contratoRepository.createContrato(data);

    return Contrato.fromDatabase(row);
  }

  validateContrato(data) {
    if (!data.cliente || data.cliente.trim() === "") {
      throw new Error("El nombre del cliente no puede estar vacío");
    }

    const ruc = String(data.ruc || "").trim();

    if (!ruc) {
      throw new Error("El RUC es obligatorio");
    }

    if (ruc.length !== 11) {
      throw new Error("El RUC debe tener exactamente 11 dígitos");
    }

    if (!/^\d{11}$/.test(ruc)) {
      throw new Error("El RUC debe contener solo dígitos numéricos");
    }

    if (ruc === "00000000000") {
      throw new Error("El RUC ingresado no es válido");
    }

    if (!data.tipo_servicio) {
      throw new Error("Tipo de Servicio es obligatorio");
    }

    const tiposPermitidos = [
      "POR_VIAJE",
      "POR_HORA",
      "POR_TONELADA",
      "POR_KM",
      "MENSUAL",
    ];

    if (!tiposPermitidos.includes(data.tipo_servicio)) {
      throw new Error("El tipo de servicio no es válido");
    }

    if (!data.fecha_inicio) {
      throw new Error("La fecha de inicio es obligatoria");
    }

    if (data.fecha_fin && data.fecha_fin < data.fecha_inicio) {
      throw new Error("La fecha fin no puede ser menor que la fecha inicio");
    }

    if (!data.origen || data.origen.trim() === "") {
      throw new Error("El punto de partida es obligatorio");
    }

    if (!data.destino || data.destino.trim() === "") {
      throw new Error("El punto de llegada es obligatorio");
    }

    if (
      data.distancia_estimada_km === undefined ||
      data.distancia_estimada_km === null ||
      data.distancia_estimada_km === "" ||
      Number(data.distancia_estimada_km) <= 0
    ) {
      throw new Error("La distancia debe ser mayor a 0");
    }

    if (
      data.tarifa_por_km === undefined ||
      data.tarifa_por_km === null ||
      data.tarifa_por_km === "" ||
      Number(data.tarifa_por_km) <= 0
    ) {
      throw new Error("La tarifa debe ser un valor positivo");
    }

    if (
      data.tarifa_por_hora === undefined ||
      data.tarifa_por_hora === null ||
      data.tarifa_por_hora === ""
    ) {
      throw new Error("La tarifa por hora es obligatoria");
    }

    if (Number(data.tarifa_por_hora) < 0) {
      throw new Error("La tarifa por hora debe ser mayor o igual a 0");
    }

    if (
      data.tarifa_espera === undefined ||
      data.tarifa_espera === null ||
      data.tarifa_espera === ""
    ) {
      throw new Error("La tarifa por espera es obligatoria");
    }

    if (Number(data.tarifa_espera) < 0) {
      throw new Error("La tarifa por espera debe ser mayor o igual a 0");
    }
  }

  async getIndicadores() {
    return this.contratoRepository.getIndicadores();
  }

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

  async getContratoById(id) {
    return this.contratoRepository.findById(id);
  }

}
