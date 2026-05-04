import { ContratoRepository } from "./contratoRepository.mjs";
import { Contrato } from "./contratoModel.mjs";

export class ContratoService {
  async getAllVigentes() {
    const contratoRepository = new ContratoRepository();
    const rows = await contratoRepository.getAllVigentes();
    return Contrato.fromDatabaseList(rows);
  }

  async getIndicadores() {
    const contratoRepository = new ContratoRepository();
    return contratoRepository.getIndicadores();
  }

  async getAllContratos(filtros = {}, pagination = {}) {
    const contratoRepository = new ContratoRepository();
    const { rows, total, page, limit } = await contratoRepository.findAll(filtros, pagination);
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
    const contratoRepository = new ContratoRepository();
    return contratoRepository.findById(id);
  }
}
