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

export const createCamionController = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const camionService = new CamionService();
    const camion = await camionService.createCamion(body);

    return successResponse(
      camion,
      "Camión registrado exitosamente.",
      201
    );
  } catch (error) {
    console.error("Error en createCamionController:", error);

    const statusCode =
      /duplicad|existe|obligatorio|requerid|inválid|invalido|rango|capacidad|vin|placa/i.test(
        error.message
      )
        ? 400
        : 500;

    return errorResponse(error.message, statusCode);
  }
};

export const getPanelCamionesController = async (event) => {
  try {
    const camionService = new CamionService();

    const panel = await camionService.getPanel(
      event.queryStringParameters || {}
    );

    return successResponse(
      panel,
      "Panel de camiones obtenido exitosamente."
    );
  } catch (error) {
    console.error("Error en getPanelCamionesController:", error);
    return errorResponse(error.message, 500);
  }
};

export const exportCamionesCsvController = async (event) => {
  try {
    const camionService = new CamionService();

    const csv = await camionService.exportCsv(
      event.queryStringParameters || {}
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="camiones.csv"',
        "Access-Control-Allow-Origin": "*",
      },
      body: csv,
    };
  } catch (error) {
    console.error("Error en exportCamionesCsvController:", error);
    return errorResponse(error.message, 500);
  }
};
