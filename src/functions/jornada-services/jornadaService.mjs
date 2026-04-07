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

      const unidadOcupada = await this.repository.checkUnidadActiva(
        validatedData.id_unidad,
      );
      if (unidadOcupada) {
        throw new Error("La unidad ya tiene una jornada activa.");
      }

      const createdDb = await this.repository.create(validatedData);
      return Jornada.fromDatabase(createdDb);
    } catch (error) {
      console.error("Error en createJornada service:", error);
      throw error;
    }
  }
}
