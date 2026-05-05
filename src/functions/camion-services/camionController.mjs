import { CamionService } from "./camionService.mjs";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/response/response.mjs";

function resolveCamionError(error) {
  const statusCode =
    /duplicad|existe|obligatorio|requerid|inv[aá]lid|invalido|rango|capacidad|vin|placa|json|combustible/i.test(
      error.message,
    )
      ? 400
      : error.message.includes("no encontrado")
        ? 404
        : 500;

  return errorResponse(error.message, statusCode);
}

export const getAllCamionesController = async (event) => {
  try {
    const camionService = new CamionService();

    const camiones = await camionService.getAllCamiones(
      event.queryStringParameters || {},
    );

    return successResponse(
      camiones,
      "Camiones obtenidos exitosamente",
    );
  } catch (error) {
    console.error("Error en getAllCamionesController:", error);
    return resolveCamionError(error);
  }
};

export const getCamionByIdController = async (event) => {
  try {
    const id = event.pathParameters?.id;

    const camionService = new CamionService();
    const camion = await camionService.getCamionById(id);

    return successResponse(
      camion,
      "Camión obtenido exitosamente.",
    );
  } catch (error) {
    console.error("Error en getCamionByIdController:", error);
    return resolveCamionError(error);
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
      201,
    );
  } catch (error) {
    console.error("Error en createCamionController:", error);
    return resolveCamionError(error);
  }
};

export const getPanelCamionesController = async (event) => {
  try {
    const camionService = new CamionService();

    const panel = await camionService.getPanel(
      event.queryStringParameters || {},
    );

    return successResponse(
      panel,
      "Panel de camiones obtenido exitosamente.",
    );
  } catch (error) {
    console.error("Error en getPanelCamionesController:", error);
    return resolveCamionError(error);
  }
};

export const exportCamionesCsvController = async (event) => {
  try {
    const camionService = new CamionService();

    const csv = await camionService.exportCsv(
      event.queryStringParameters || {},
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
    return resolveCamionError(error);
  }
};