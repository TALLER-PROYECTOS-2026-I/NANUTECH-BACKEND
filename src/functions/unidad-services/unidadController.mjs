import { UnidadService } from "./unidadService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";
import { SUCCESS_MESSAGES } from "../../shared/constants/successMessages.mjs";

export const getAllDisponiblesController = async (event) => {
  try {
    const unidadService = new UnidadService();
    const unidades = await unidadService.getAllDisponibles();
    return successResponse(unidades, SUCCESS_MESSAGES.UNIDADES_RETRIEVED);
  } catch (error) {
    console.error("Error en getAllDisponiblesController:", error);
    return errorResponse(error.message, 500);
  }
};
