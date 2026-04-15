import { JornadaRepository } from "./jornadaRepository.mjs";
import { Jornada } from "./jornadaModel.mjs";
import { JornadaValidator } from "../../shared/utils/validators/jornadaValidator.mjs";

const ACTIVE_STATES = new Set(["REGISTRADA", "EN_PROCESO"]);

function createJornadaError(message, statusCode = 400, code = "JORNADA_ERROR") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export class JornadaService {
  constructor() {
    this.repository = new JornadaRepository();
  }

  async createJornada(jornadaData) {
    const validatedData = JornadaValidator.validateCreateJornada(jornadaData);

    const unidadOcupada = await this.repository.checkUnidadActiva(
      validatedData.unidad_id,
    );
    if (unidadOcupada) {
      throw createJornadaError(
        "La unidad ya tiene una jornada activa o pendiente.",
        400,
        "UNIDAD_CON_JORNADA_ACTIVA",
      );
    }

    const conductorOcupado = await this.repository.checkConductorActivo(
      validatedData.conductor_id,
    );
    if (conductorOcupado) {
      throw createJornadaError(
        "El conductor ya tiene una jornada activa o pendiente.",
        400,
        "CONDUCTOR_CON_JORNADA_ACTIVA",
      );
    }

    const createdDb = await this.repository.create(validatedData);
    return Jornada.fromDatabase(createdDb);
  }

  async getCurrentJornada(conductorId) {
    const validatedConductorId = JornadaValidator.validateConductorId(conductorId);
    const jornada = await this.repository.findCurrentByConductorId(
      validatedConductorId,
    );

    // El dashboard deja de mostrar jornada cuando ya no existe una pendiente o en proceso.
    return jornada ? Jornada.fromDatabase(jornada) : null;
  }

  async startTurn(payload) {
    const { jornada_id: jornadaId } = JornadaValidator.validateStartTurn(payload);
    const jornada = await this.repository.findById(jornadaId);

    if (!jornada) {
      throw createJornadaError("La jornada no existe.", 404, "JORNADA_NOT_FOUND");
    }

    // Solo se permite pasar de REGISTRADA a EN_PROCESO y la hora de inicio la fija el servidor.
    if (jornada.estado === "EN_PROCESO") {
      throw createJornadaError(
        "La jornada ya fue iniciada.",
        400,
        "JORNADA_ALREADY_STARTED",
      );
    }

    if (!ACTIVE_STATES.has(jornada.estado)) {
      throw createJornadaError(
        "La jornada no puede iniciarse desde su estado actual.",
        400,
        "JORNADA_INVALID_STATE",
      );
    }

    if (jornada.estado !== "REGISTRADA") {
      throw createJornadaError(
        "La jornada solo puede iniciarse desde REGISTRADA.",
        400,
        "JORNADA_INVALID_STATE",
      );
    }

    const updated = await this.repository.startTurn(jornadaId);
    return Jornada.fromDatabase(updated);
  }

  async finishTurn(payload) {
    const {
      jornada_id: jornadaId,
      observaciones,
    } = JornadaValidator.validateFinishTurn(payload);
    const jornada = await this.repository.findById(jornadaId);

    if (!jornada) {
      throw createJornadaError("La jornada no existe.", 404, "JORNADA_NOT_FOUND");
    }

    // Solo se puede cerrar una jornada EN_PROCESO; el servidor fija la hora_fin y calcula la duración total.
    if (jornada.estado !== "EN_PROCESO") {
      throw createJornadaError(
        "La jornada solo puede finalizarse cuando está EN_PROCESO.",
        400,
        "JORNADA_NOT_IN_PROGRESS",
      );
    }

    const updated = await this.repository.finishTurn(jornadaId, observaciones);
    return Jornada.fromDatabase(updated);
  }
}
