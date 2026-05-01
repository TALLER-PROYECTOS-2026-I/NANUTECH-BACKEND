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

  // HU07 - Criterios 2, 4 + T31 + T32
  async updateContrato(id, data, ip) {
    const repo = new ContratoRepository();

    const actual = await repo.getById(id);

    // Regla de negocio
    if (data.fecha_fin && data.fecha_fin < data.fecha_inicio) {
      throw new Error("Fecha fin no puede ser menor a inicio");
    }

    // Auditoría
    if (data.fecha_fin !== actual.fecha_fin) {
      await repo.insertHistorial({
        contrato_id: id,
        campo: "fecha_fin",
        anterior: actual.fecha_fin,
        nuevo: data.fecha_fin,
        ip,
      });
    }

    // Update
    await repo.updateContrato(id, data);

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
