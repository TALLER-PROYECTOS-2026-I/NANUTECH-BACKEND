const VALID_CREATE_STATES = new Set(["REGISTRADA", "EN_PROCESO"]);

function requireString(value, fieldName) {
  if (value === undefined || value === null || `${value}`.trim() === "") {
    throw new Error(`El ${fieldName} es requerido`);
  }

  return `${value}`.trim();
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) return null;

  const normalized = `${value}`.trim();
  return normalized === "" ? null : normalized;
}

function normalizeOptionalNumber(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`El ${fieldName} es inválido`);
  }

  return parsed;
}

export class JornadaValidator {
  static validateCreateJornada(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Datos de jornada inválidos");
    }

    const estado = data.estado ? `${data.estado}`.trim().toUpperCase() : "REGISTRADA";
    if (!VALID_CREATE_STATES.has(estado)) {
      throw new Error("El estado de la jornada es inválido");
    }

    return {
      conductor_id: requireString(data.conductor_id, "conductor_id"),
      unidad_id: requireString(data.unidad_id, "unidad_id"),
      contrato_id: requireString(data.contrato_id, "contrato_id"),
      creado_por: requireString(data.creado_por, "creado_por"),
      fecha_jornada: normalizeOptionalString(data.fecha_jornada),
      origen: normalizeOptionalString(data.origen),
      destino: normalizeOptionalString(data.destino),
      km_recorridos: normalizeOptionalNumber(data.km_recorridos, "km_recorridos"),
      observaciones: normalizeOptionalString(data.observaciones),
      estado,
    };
  }

  static validateConductorId(conductorId) {
    return requireString(conductorId, "conductor_id");
  }

  static validateJornadaId(jornadaId) {
    return requireString(jornadaId, "jornada_id");
  }

  static validateStartTurn(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Datos para iniciar turno inválidos");
    }

    return {
      jornada_id: this.validateJornadaId(data.jornada_id),
    };
  }

  static validateFinishTurn(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Datos para finalizar turno inválidos");
    }

    return {
      jornada_id: this.validateJornadaId(data.jornada_id),
      observaciones: normalizeOptionalString(data.observaciones),
    };
  }
}
