import { ConductorRepository } from "./conductorRepository.mjs";
import { Conductor } from "./conductorModel.mjs";

export class ConductorService {
  async getAllActiveConductores() {
    const conductorRepository = new ConductorRepository();
    const rows = await conductorRepository.getAllActive();
    return Conductor.fromDatabaseList(rows);
  }
}
