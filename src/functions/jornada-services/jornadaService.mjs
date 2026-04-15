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

      if (unidadOcupada) {
        throw {
          message: "La unidad ya tiene una jornada activa o pendiente.",
          code: "UNIDAD_CON_JORNADA_ACTIVA",
        };
      }

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
    if (!conductorId) {
      throw {
        message: "El conductor_id es requerido.",
        statusCode: 400,
      };
    }

    return await this.repository.findCurrentByConductorId(conductorId);
  }

  async startTurn(body) {
    if (!body?.jornada_id) {
      throw {
        message: "El jornada_id es requerido.",
        statusCode: 400,
      };
    }

    const jornada = await this.repository.findById(body.jornada_id);

    if (!jornada) {
      throw {
        message: "Jornada no encontrada.",
        statusCode: 404,
      };
    }

    // 🔥 CAMBIO CLAVE AQUÍ
    if (jornada.estado !== "REGISTRADA") {
      throw {
        message: "La jornada ya fue iniciada.",
        code: "JORNADA_ALREADY_STARTED",
      };
    }

    return await this.repository.startTurn(body.jornada_id);
  }

  async finishTurn(body) {
    if (!body?.jornada_id) {
      throw {
        message: "El jornada_id es requerido.",
        statusCode: 400,
      };
    }

    const jornada = await this.repository.findById(body.jornada_id);

    if (!jornada) {
      throw {
        message: "Jornada no encontrada.",
        statusCode: 404,
      };
    }

    // 🔥 CAMBIO CLAVE AQUÍ
    if (jornada.estado !== "EN_PROCESO") {
      throw {
        message: "La jornada solo puede finalizarse cuando está EN_PROCESO.",
        code: "JORNADA_NOT_IN_PROGRESS",
      };
    }

    return await this.repository.finishTurn(body.jornada_id, body.observaciones);
  }
}