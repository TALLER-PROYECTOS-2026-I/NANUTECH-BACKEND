export class LicenciaValidator {
  static validateConductorId(id) {
    const uuidRegex = /^[0-9a-fA-F-]{36}$/;

    if (!uuidRegex.test(id)) {
      throw new Error("ID de conductor inválido");
    }
  }

  static validateUpdateLicencia(data) {
    const { numeroLicencia, categoria, fechaEmision, fechaVencimiento, autoridadEmisora } = data;

    if (!numeroLicencia || !categoria || !fechaEmision || !fechaVencimiento || !autoridadEmisora) {
      throw new Error("Todos los campos son obligatorios");
    }

    const emision = new Date(fechaEmision);

    const vencimiento = new Date(fechaVencimiento);

    if (vencimiento <= emision) {
      throw new Error("La fecha de vencimiento debe ser posterior a la fecha de emisión");
    }

    return {
      numeroLicencia,
      categoria,
      fechaEmision,
      fechaVencimiento,
      autoridadEmisora,
    };
  }
}
