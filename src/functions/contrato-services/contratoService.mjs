import { ContratoRepository } from "./contratoRepository.mjs";
import { Contrato } from "./contratoModel.mjs";

export class ContratoService {
  async getAllVigentes() {
    const contratoRepository = new ContratoRepository();
    const rows = await contratoRepository.getAllVigentes();
    return Contrato.fromDatabaseList(rows);
  }

  // HU07 - Criterio 1
  async getDetalleContrato(id) {
    const repo = new ContratoRepository();

    const contrato = await repo.getById(id);
    const tarifas = await repo.getTarifasByContrato(id);

    return { contrato, tarifas };
  }

  // HU07 - Criterios 2, 4 + historial + validaciones
  async updateContrato(id, data, ip) {
    const repo = new ContratoRepository();

    const actual = await repo.getById(id);

    // =========================
    // ✅ VALIDACIONES
    // =========================

    // Fecha fin >= fecha inicio
    if (
      data.fecha_fin &&
      data.fecha_inicio &&
      data.fecha_fin < data.fecha_inicio
    ) {
      throw new Error("Fecha fin no puede ser menor a inicio");
    }

    // Tarifa > 0
    if (data.tarifa !== undefined && Number(data.tarifa) <= 0) {
      throw new Error("La tarifa no puede ser 0");
    }
    // 🔥 NUEVO: Descripción obligatoria
    if (data.descripcion !== undefined && data.descripcion.trim() === "") {
      throw new Error("La descripción no puede estar vacía");
    }

    // =========================
    // 🧾 AUDITORÍA (HISTORIAL)
    // =========================

    // Fecha fin
    if (data.fecha_fin !== undefined && data.fecha_fin !== actual.fecha_fin) {
      await repo.insertHistorial({
        contrato_id: id,
        campo: "fecha_fin",
        valor_anterior: actual.fecha_fin,
        valor_nuevo: data.fecha_fin,
        ip_address: ip,
      });
    }

    // 🔥 Tarifa (IMPORTANTE PARA TC00120)
    if (
      data.tarifa !== undefined &&
      Number(data.tarifa) !== Number(actual.tarifa)
    ) {
      await repo.insertHistorial({
        contrato_id: id,
        campo: "tarifa",
        valor_anterior: actual.tarifa,
        valor_nuevo: data.tarifa,
        ip_address: ip,
      });
    }

    // (Recomendado) Descripción
    if (
      data.descripcion !== undefined &&
      data.descripcion !== actual.descripcion
    ) {
      await repo.insertHistorial({
        contrato_id: id,
        campo: "descripcion",
        valor_anterior: actual.descripcion,
        valor_nuevo: data.descripcion,
        ip_address: ip,
      });
    }

    // =========================
    // 📝 UPDATE
    // =========================
    await repo.updateContrato(id, data);

    // Tarifas (tabla secundaria)
    if (data.tarifas) {
      await repo.updateTarifas(id, data.tarifas);
    }

    return { updated: true };
  }

  // HU07 - Criterio 5
  async assignUnidades(id, unidades) {
    const repo = new ContratoRepository();

    await repo.deleteUnidades(id);

    for (const unidad of unidades) {
      await repo.insertUnidad(id, unidad);
    }

    return { assigned: true };
  }
}
