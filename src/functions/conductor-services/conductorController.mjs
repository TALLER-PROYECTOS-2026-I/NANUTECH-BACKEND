import { ConductorService } from "./conductorService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";
import { SUCCESS_MESSAGES } from "../../shared/constants/successMessages.mjs";

export const getAllConductoresController = async (event) => {
  try {
    const conductorService = new ConductorService();
    const conductores = await conductorService.getAllActiveConductores();
    return successResponse(conductores, SUCCESS_MESSAGES.CONDUCTORES_RETRIEVED);
  } catch (error) {
    console.error("Error en getAllConductoresController:", error);
    return errorResponse(error.message, 500);
  }
};
