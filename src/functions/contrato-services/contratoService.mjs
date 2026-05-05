import { ContratoRepository } from "./contratoRepository.mjs";
import { Contrato } from "./contratoModel.mjs";

export class ContratoService {
  constructor(repo = new ContratoRepository()) {
    this.repo = repo;
  }

  async getAllVigentes() {
    const rows = await this.repo.getAllVigentes();
    return Contrato.fromDatabaseList(rows);
  }

  async getIndicadores() {
    return this.repo.getIndicadores();
  }

  async getAllContratos(filtros = {}, pagination = {}) {
    const { rows, total, page, limit } = await this.repo.findAll(filtros, pagination);

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
    return this.repo.findById(id);
  }

  async getDetalleContrato(id) {
    const repo = new ContratoRepository();

    const contrato = await repo.getById(id);
    const tarifas = await repo.getTarifasByContrato(id);

    return {
      contrato, // ❌ quita el || null
      tarifas,
    };
  }

  async updateContrato(id, data, ip) {
    const repo = new ContratoRepository();

    const actual = (await repo.findById(id)) || {};

    // validaciones
    if (data.fecha_fin && data.fecha_inicio && data.fecha_fin < data.fecha_inicio) {
      throw new Error("Fecha fin no puede ser menor a inicio");
    }

    if (data.tarifa !== undefined && Number(data.tarifa) <= 0) {
      throw new Error("La tarifa no puede ser 0");
    }

    if (data.descripcion !== undefined && data.descripcion.trim() === "") {
      throw new Error("La descripción no puede estar vacía");
    }

    // historial
    if (data.fecha_fin && data.fecha_fin !== actual.fecha_fin) {
      await this.repo.insertHistorial({
        contrato_id: id,
        campo: "fecha_fin",
        valor_anterior: actual.fecha_fin,
        valor_nuevo: data.fecha_fin,
        ip_address: ip,
      });
    }

    if (data.tarifa !== undefined && Number(data.tarifa) !== Number(actual.tarifa)) {
      await this.repo.insertHistorial({
        contrato_id: id,
        campo: "tarifa",
        valor_anterior: actual.tarifa,
        valor_nuevo: data.tarifa,
        ip_address: ip,
      });
    }

    if (data.descripcion !== undefined && data.descripcion !== actual.descripcion) {
      await this.repo.insertHistorial({
        contrato_id: id,
        campo: "descripcion",
        valor_anterior: actual.descripcion,
        valor_nuevo: data.descripcion,
        ip_address: ip,
      });
    }

    const actualizado = await this.repo.updateContrato(id, data);

    if (data.tarifas) {
      await this.repo.updateTarifas(id, data.tarifas);
    }

    return actualizado || { updated: true };
  }

  async assignUnidades(id, unidades) {
    await this.repo.deleteUnidades(id);

    for (const unidad of unidades) {
      await this.repo.insertUnidad(id, unidad);
    }

    return { assigned: true };
  }
}
