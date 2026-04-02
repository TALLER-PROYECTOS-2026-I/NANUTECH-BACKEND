export class JornadaValidator {
  static validateCreateJornada(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Datos de jornada inválidos");
    }
    if (!data.id_conductor) throw new Error("El id_conductor es requerido");
    if (!data.id_unidad) throw new Error("El id_unidad (camión) es requerido");
    if (!data.id_contrato) throw new Error("El id_contrato es requerido");

    return {
      id_conductor: data.id_conductor,
      id_unidad: data.id_unidad,
      id_contrato: data.id_contrato,
      estado: data.estado || "ACTIVA",
    };
  }
}
