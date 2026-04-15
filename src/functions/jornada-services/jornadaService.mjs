import { JornadaRepository } from "./jornadaRepository.mjs";
import { JornadaValidator } from "../../shared/utils/validators/jornadaValidator.mjs";

export class JornadaService {
  constructor() {
    this.repository = new JornadaRepository();
  }

  async createJornada(jornadaData) {
    try {
      const validatedData = JornadaValidator.validateCreateJornada(jornadaData);
      const unidadOcupada = await this.repository.checkUnidadActiva(validatedData.unidad_id);
      if (unidadOcupada) throw new Error("La unidad ya tiene una jornada activa.");
      const conductorActivo = await this.repository.checkConductorActivo(validatedData.conductor_id);
      if (conductorActivo) throw new Error("El conductor ya tiene una jornada activa.");
      return await this.repository.create(validatedData);
    } catch (error) {
      console.error("Error en createJornada service:", error);
      throw error;
    }
  }

  async getAllJornadas() {
    return this.repository.findAll();
  }

  async getCurrentJornada(conductorId) {
    if (!conductorId) throw Object.assign(new Error("El conductor_id es requerido."), { statusCode: 400 });
    return await this.repository.findCurrentByConductorId(conductorId);
  }

  async startTurn(body) {
    if (!body?.jornada_id) throw Object.assign(new Error("El jornada_id es requerido."), { statusCode: 400 });
    const jornada = await this.repository.findById(body.jornada_id);
    if (!jornada) throw Object.assign(new Error("Jornada no encontrada."), { statusCode: 404 });
    if (jornada.estado !== "REGISTRADA") throw Object.assign(new Error("Solo se puede iniciar una jornada REGISTRADA."), { statusCode: 400 });
    return await this.repository.startTurn(body.jornada_id);
  }

  async finishTurn(body) {
    if (!body?.jornada_id) throw Object.assign(new Error("El jornada_id es requerido."), { statusCode: 400 });
    const jornada = await this.repository.findById(body.jornada_id);
    if (!jornada) throw Object.assign(new Error("Jornada no encontrada."), { statusCode: 404 });
    if (jornada.estado !== "EN_PROCESO") throw Object.assign(new Error("Solo se puede finalizar una jornada EN_PROCESO."), { statusCode: 400 });
    return await this.repository.finishTurn(body.jornada_id, body.observaciones);
  }
}