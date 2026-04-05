import { ContratoRepository } from "./contratoRepository.mjs";
import { Contrato } from "./contratoModel.mjs";

export class ContratoService {
  async getAllVigentes() {
    const contratoRepository = new ContratoRepository();
    const rows = await contratoRepository.getAllVigentes();
    return Contrato.fromDatabaseList(rows);
  }
}
