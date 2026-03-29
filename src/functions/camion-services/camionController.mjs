// src/functions/camion-services/camionController.mjs
import { CamionService } from "./camionService.mjs";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/response/response.mjs";
import { SUCCESS_MESSAGES } from "../../shared/constants/successMessages.mjs";

// ❌ ELIMINADO: const camionService = new CamionService();
// Se instancia dentro de cada función para que los mocks funcionen correctamente

export const getAllCamionesController = async (event) => {
  try {
    const camionService = new CamionService();
    const camiones = await camionService.getAllCamiones();
    return successResponse(camiones, SUCCESS_MESSAGES.CAMIONES_RETRIEVED);
  } catch (error) {
    console.error("Error en getAllCamionesController:", error);
    return errorResponse(error.message, 500);
  }
};

export const getCamionByIdController = async (event) => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return errorResponse("El id es requerido", 400);
    }

    const camionService = new CamionService();
    const camion = await camionService.getCamionById(id);
    return successResponse(camion, SUCCESS_MESSAGES.CAMION_RETRIEVED);
  } catch (error) {
    console.error("Error en getCamionByIdController:", error);

    if (error.message.includes("no encontrado")) {
      return errorResponse(error.message, 404);
    }
    if (
      error.message.includes("requerido") ||
      error.message.includes("debe ser")
    ) {
      return errorResponse(error.message, 400);
    }

    return errorResponse(error.message, 500);
  }
};
