const VALID_CREATE_STATES = new Set(["REGISTRADA", "EN_PROCESO"]);

const requireString = (value, message) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }

  return value.trim();
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error("Las observaciones deben ser texto");
  }

  const normalized = value.trim();
  return normalized === "" ? null : normalized;
};

const normalizeOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return 0;

  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric < 0) {
    throw new Error("Los kilometros recorridos son invalidos");
  }

  return numeric;
};

export class JornadaValidator {
  static validateCreateJornada(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Datos de jornada invalidos");
    }

    const estado = data.estado ? requireString(data.estado, "El estado es invalido").toUpperCase() : "REGISTRADA";
    if (!VALID_CREATE_STATES.has(estado)) {
      throw new Error("El estado de la jornada es invalido");
    }

    return {
      conductor_id: requireString(data.conductor_id, "El conductor_id es requerido"),
      unidad_id: requireString(data.unidad_id, "El unidad_id es requerido"),
      contrato_id: requireString(data.contrato_id, "El contrato_id es requerido"),
      creado_por: requireString(data.creado_por, "El creado_por es requerido"),
      fecha_jornada: data.fecha_jornada ? requireString(data.fecha_jornada, "La fecha_jornada es invalida") : null,
      origen: data.origen ? requireString(data.origen, "El origen es invalido") : null,
      destino: data.destino ? requireString(data.destino, "El destino es invalido") : null,
      km_recorridos: normalizeOptionalNumber(data.km_recorridos),
      observaciones: normalizeOptionalString(data.observaciones),
      estado,
    };
  }

  static validateConductorId(conductorId) {
    return requireString(conductorId, "El conductor_id es requerido");
  }

  static validateJornadaId(jornadaId) {
    return requireString(jornadaId, "El jornada_id es requerido");
  }

  static validateStartTurn(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Datos de inicio de turno invalidos");
    }

    return {
      jornada_id: this.validateJornadaId(data.jornada_id),
    };
  }

  static validateFinishTurn(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Datos de fin de turno invalidos");
    }

    return {
      jornada_id: this.validateJornadaId(data.jornada_id),
      observaciones: normalizeOptionalString(data.observaciones),
    };
  }
}
