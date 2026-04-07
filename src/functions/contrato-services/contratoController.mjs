import { ContratoService } from "./contratoService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";
import { SUCCESS_MESSAGES } from "../../shared/constants/successMessages.mjs";

export const getAllVigentesController = async (event) => {
  try {
    const contratoService = new ContratoService();
    const contratos = await contratoService.getAllVigentes();
    return successResponse(contratos, SUCCESS_MESSAGES.CONTRATOS_RETRIEVED);
  } catch (error) {
    console.error("Error en getAllVigentesController:", error);
    return errorResponse(error.message, 500);
  }
};
