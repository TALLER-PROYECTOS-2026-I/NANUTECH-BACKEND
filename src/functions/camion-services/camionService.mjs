import { CamionRepository } from "./camionRepository.mjs";
import { Camion } from "./camionModel.mjs";
import { CamionValidator } from "../../shared/utils/validators/camionValidator.mjs";
import { ERROR_MESSAGES } from "../../shared/constants/errorMessages.mjs";

export class CamionService {
  constructor() {
    this.repository = new CamionRepository();
  }

  async getAllCamiones() {
    try {
      const camiones = await this.repository.getAll();
      return Camion.fromDatabaseList(camiones);
    } catch (error) {
      console.error("Error en getAllCamiones service:", error);
      throw error;
    }
  }

  async getCamionById(id) {
    try {
      const validatedId = CamionValidator.validateId(id);
      const camion = await this.repository.getById(validatedId);

      if (!camion) throw new Error(ERROR_MESSAGES.CAMION_NOT_FOUND);

      return Camion.fromDatabase(camion);
    } catch (error) {
      console.error("Error en getCamionById service:", error);
      throw error;
    }
  }

  async createCamion(camionData) {
    try {
      const isHu11Payload =
        camionData.anio !== undefined ||
        camionData.capacidad_ton !== undefined ||
        camionData.capacidadTon !== undefined ||
        camionData.vin !== undefined ||
        camionData.color !== undefined ||
        camionData.combustible !== undefined ||
        camionData.gps !== undefined;

      if (isHu11Payload) {
        return this.createCamionHu11(camionData);
      }

      const validatedData = CamionValidator.validateCreateCamion(camionData);

      const existingByPlaca = await this.repository.getByPlaca(
        validatedData.placa,
      );

      if (existingByPlaca) {
        throw new Error(ERROR_MESSAGES.CAMION_PLACA_EXISTS);
      }

      const newCamion = new Camion(
        null,
        validatedData.placa,
        validatedData.marca,
        validatedData.modelo,
        validatedData.estado,
      );

      const created = await this.repository.create(newCamion.toJSON());
      return Camion.fromDatabase(created);
    } catch (error) {
      console.error("Error en createCamion service:", error);
      throw error;
    }
  }

  async createCamionHu11(camionData) {
    try {
      const validatedData = this.validateCreateCamionHu11(camionData);

      const existingByPlaca = await this.repository.getByPlacaHu11(
        validatedData.placa,
      );

      if (existingByPlaca) {
        throw new Error("Ya existe un camión con esta placa");
      }

      const existingByVin = await this.repository.getByVinHu11(
        validatedData.vin,
      );

      if (existingByVin) {
        throw new Error("Ya existe un camión con este VIN");
      }

      const created = await this.repository.createHu11(validatedData);

      return {
        ...created,
        confirmacion: {
          message: "¡Camión registrado con éxito!",
          placa: created.placa,
          modelo: created.modelo,
        },
      };
    } catch (error) {
      console.error("Error en createCamionHu11 service:", error);
      throw error;
    }
  }

  async updateCamion(id, updateData) {
    try {
      const validatedId = CamionValidator.validateId(id);

      const existingCamion = await this.repository.getById(validatedId);
      if (!existingCamion) throw new Error(ERROR_MESSAGES.CAMION_NOT_FOUND);

      const validatedUpdates = CamionValidator.validateUpdateCamion(updateData);

      if (validatedUpdates.placa) {
        const existingByPlaca = await this.repository.getByPlaca(
          validatedUpdates.placa,
        );

        if (existingByPlaca && existingByPlaca.id !== validatedId) {
          throw new Error(ERROR_MESSAGES.CAMION_PLACA_EXISTS);
        }
      }

      const updated = await this.repository.update(
        validatedId,
        validatedUpdates,
      );

      return Camion.fromDatabase(updated);
    } catch (error) {
      console.error("Error en updateCamion service:", error);
      throw error;
    }
  }

  async deleteCamion(id) {
    try {
      const validatedId = CamionValidator.validateId(id);

      const existingCamion = await this.repository.getById(validatedId);
      if (!existingCamion) throw new Error(ERROR_MESSAGES.CAMION_NOT_FOUND);

      await this.repository.delete(validatedId);
      return { id: validatedId, deleted: true };
    } catch (error) {
      console.error("Error en deleteCamion service:", error);
      throw error;
    }
  }

  async getPanel(filters = {}) {
    return this.repository.getPanelHu11(filters);
  }

  async exportCsv(filters = {}) {
    return this.repository.exportCsvHu11(filters);
  }

  validateCreateCamionHu11(data = {}) {
    const requiredFields = [
      "placa",
      "marca",
      "modelo",
      "anio",
      "capacidad_ton",
      "vin",
      "color",
      "combustible",
      "gps",
    ];

    for (const field of requiredFields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ""
      ) {
        throw new Error(`El campo ${field} es obligatorio`);
      }
    }

    const placa = String(data.placa).trim().toUpperCase();

    if (!placa) {
      throw new Error("La placa no puede estar vacía");
    }

    const marca = String(data.marca).trim();

    if (!marca) {
      throw new Error("La marca no puede estar vacía");
    }

    const modelo = String(data.modelo).trim();

    if (!modelo) {
      throw new Error("El modelo no puede estar vacío");
    }

    const anio = Number(data.anio);
    const currentYear = new Date().getFullYear();

    if (!Number.isInteger(anio) || anio < 1990 || anio > currentYear + 1) {
      throw new Error("Año fuera del rango permitido");
    }

    const capacidadTon = Number(data.capacidad_ton);

    if (Number.isNaN(capacidadTon) || capacidadTon <= 0) {
      throw new Error("La capacidad debe ser mayor a 0 toneladas");
    }

    const vin = String(data.vin).trim().toUpperCase();

    if (!vin) {
      throw new Error("El VIN es obligatorio");
    }

    const color = String(data.color).trim();

    if (!color) {
      throw new Error("El color es obligatorio");
    }

    const tipoCombustible = String(data.combustible).trim().toUpperCase();

    if (!tipoCombustible) {
      throw new Error("El combustible es obligatorio");
    }

    return {
      placa,
      marca,
      modelo,
      anio,
      capacidad_ton: capacidadTon,
      vin,
      color,
      tipo_combustible: tipoCombustible,
      gps_habilitado: Boolean(data.gps),
      estado: "DISPONIBLE",
      kilometraje_actual: Number(data.kilometraje_actual || 0),
      fecha_registro: new Date().toISOString().slice(0, 10),
      ultima_fecha_mantenimiento: data.ultimo_mantenimiento || null,
      proxima_fecha_mantenimiento: data.proximo_mantenimiento || null,
    };
  }
}