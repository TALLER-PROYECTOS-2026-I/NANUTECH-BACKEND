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
      const validatedData = CamionValidator.validateCreateCamion(camionData);

      // Verificar si placa ya existe
      const existingByPlaca = await this.repository.getByPlaca(
        validatedData.placa,
      );
      if (existingByPlaca) throw new Error(ERROR_MESSAGES.CAMION_PLACA_EXISTS);

      const newCamion = new Camion(
        null, // id es SERIAL, lo genera la BD
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
}
