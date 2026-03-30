import { ERROR_MESSAGES } from "../../constants/errorMessages.mjs";

export class CamionValidator {
  static validateId(id) {
    // El id viene como string desde la URL, convertir a número
    const parsed = parseInt(id);
    if (!id || isNaN(parsed) || parsed <= 0) {
      throw new Error(ERROR_MESSAGES.CAMION_ID_REQUIRED);
    }
    return parsed;
  }

  static validatePlaca(placa) {
    if (!placa) throw new Error(ERROR_MESSAGES.CAMION_PLACA_REQUIRED);
    if (typeof placa !== "string") throw new Error("La placa debe ser texto");
    if (placa.trim() === "") throw new Error("La placa no puede estar vacía");
    return placa.trim().toUpperCase();
  }

  static validateMarca(marca) {
    if (!marca) throw new Error("La marca es requerida");
    if (typeof marca !== "string") throw new Error("La marca debe ser texto");
    if (marca.trim() === "") throw new Error("La marca no puede estar vacía");
    return marca.trim();
  }

  static validateModelo(modelo) {
    if (!modelo) throw new Error(ERROR_MESSAGES.CAMION_MODELO_REQUIRED);
    if (typeof modelo !== "string") throw new Error("El modelo debe ser texto");
    if (modelo.trim() === "") throw new Error("El modelo no puede estar vacío");
    return modelo.trim();
  }

  static validateEstado(estado) {
    if (!estado) return "activo";
    const estadosValidos = ["activo", "inactivo", "mantenimiento"];
    if (!estadosValidos.includes(estado.toLowerCase())) {
      throw new Error(ERROR_MESSAGES.CAMION_ESTADO_INVALID);
    }
    return estado.toLowerCase();
  }

  static validateCreateCamion(camionData) {
    const errors = [];
    let validatedData = {};

    try {
      validatedData.placa = this.validatePlaca(camionData.placa);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      validatedData.marca = this.validateMarca(camionData.marca);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      validatedData.modelo = this.validateModelo(camionData.modelo);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      validatedData.estado = this.validateEstado(camionData.estado);
    } catch (e) {
      errors.push(e.message);
    }

    if (errors.length > 0) {
      throw new Error(`Errores de validación: ${errors.join(", ")}`);
    }

    return validatedData;
  }

  static validateUpdateCamion(updateData) {
    const validatedUpdates = {};
    const errors = [];

    if (updateData.placa !== undefined) {
      try {
        validatedUpdates.placa = this.validatePlaca(updateData.placa);
      } catch (e) {
        errors.push(e.message);
      }
    }

    if (updateData.marca !== undefined) {
      try {
        validatedUpdates.marca = this.validateMarca(updateData.marca);
      } catch (e) {
        errors.push(e.message);
      }
    }

    if (updateData.modelo !== undefined) {
      try {
        validatedUpdates.modelo = this.validateModelo(updateData.modelo);
      } catch (e) {
        errors.push(e.message);
      }
    }

    if (updateData.estado !== undefined) {
      try {
        validatedUpdates.estado = this.validateEstado(updateData.estado);
      } catch (e) {
        errors.push(e.message);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Errores de validación: ${errors.join(", ")}`);
    }

    if (Object.keys(validatedUpdates).length === 0) {
      throw new Error("No hay campos válidos para actualizar");
    }

    return validatedUpdates;
  }

  static validateRequestBody(body) {
    if (!body) throw new Error(ERROR_MESSAGES.INVALID_REQUEST_BODY);
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error(
        `${ERROR_MESSAGES.INVALID_REQUEST_BODY}: ${error.message}`,
      );
    }
  }
}
