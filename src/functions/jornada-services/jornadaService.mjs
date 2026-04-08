import { JornadaRepository } from "./jornadaRepository.mjs";
import { Jornada } from "./jornadaModel.mjs";
import { JornadaValidator } from "../../shared/utils/validators/jornadaValidator.mjs";

export class JornadaService {
  constructor() {
    this.repository = new JornadaRepository();
  }

  async createJornada(jornadaData) {
    try {
      const validatedData = JornadaValidator.validateCreateJornada(jornadaData);

      const unidadOcupada = await this.repository.checkUnidadActiva(validatedData.unidad_id);
      if (unidadOcupada) {
        throw new Error("La unidad ya tiene una jornada en proceso o registrada.");
      }

      const conductorOcupado = await this.repository.checkConductorActivo(validatedData.conductor_id);
      if (conductorOcupado) {
        throw new Error("El conductor ya tiene una jornada en proceso o registrada.");
      }

      const createdDb = await this.repository.create(validatedData);
      return Jornada.fromDatabase(createdDb);
    } catch (error) {
      console.error("Error en createJornada service:", error);
      throw error;
    }
  }
}
