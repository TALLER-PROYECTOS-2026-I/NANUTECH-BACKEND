import { UnidadRepository } from "./unidadRepository.mjs";
import { Unidad } from "./unidadModel.mjs";

export class UnidadService {
  async getAllDisponibles() {
    const unidadRepository = new UnidadRepository();
    const rows = await unidadRepository.getAllDisponibles();
    return Unidad.fromDatabaseList(rows);
  }
}
