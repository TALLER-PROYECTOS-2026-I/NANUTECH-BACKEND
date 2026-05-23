import { CamionService } from "./camionService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";


function resolveCamionError(error) {
  const statusCode =
    /duplicad|existe|obligatorio|requerid|inv[aá]lid|invalido|rango|capacidad|vin|placa|json|combustible/i.test(
      error.message
    )
      ? 400
      : error.message.includes("no encontrado")
        ? 404
        : 500;

  return errorResponse(error.message, statusCode);
}

/**
 * Obtiene el listado completo de camiones registrados.
 *
 * Endpoint utilizado por vistas administrativas
 * y paneles operativos.
 */
/** @see /camiones GET */
export const getAllCamionesController = async (event) => {
  try {
    const camionService = new CamionService();

    const camiones = await camionService.getAllCamiones(event.queryStringParameters || {});

    return successResponse(camiones, "Camiones obtenidos exitosamente");
  } catch (error) {
    console.error("Error en getAllCamionesController:", error);
    return resolveCamionError(error);
  }
};

/**
 * Obtiene el detalle de un camión específico.
 *
 * Valida que el ID exista antes de retornar
 * información operativa y métricas asociadas.
 */
/** @see /camiones/{id} GET */
export const getCamionByIdController = async (event) => {
  try {
    const id = event.pathParameters?.id;

    const camionService = new CamionService();
    const camion = await camionService.getCamionById(id);

    return successResponse(camion, "Camión obtenido exitosamente.");
  } catch (error) {
    console.error("Error en getCamionByIdController:", error);
    return resolveCamionError(error);
  }
};

/**
 * Registra un nuevo camión en el sistema.
 *
 * Recibe la información desde el body HTTP
 * y delega las validaciones al service.
 *
 * Respuestas:
 * - 201 → creación exitosa
 * - 400 → error de validación
 * - 500 → error interno
 */
/** @see /camiones POST */
export const createCamionController = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const camionService = new CamionService();
    const camion = await camionService.createCamion(body);

    return successResponse(camion, "Camión registrado exitosamente.", 201);
  } catch (error) {
    console.error("Error en createCamionController:", error);
    return resolveCamionError(error);
  }
};

/**
 * Obtiene información consolidada para el panel
 * de monitoreo de camiones.
 *
 * Permite visualizar:
 * - estados operativos
 * - métricas GPS
 * - tiempos de actividad
 * - filtros por placa y estado
 */
/** @see /camiones/panel GET */
export const getPanelCamionesController = async (event) => {
  try {
    const camionService = new CamionService();

    const panel = await camionService.getPanel(event.queryStringParameters || {});

    return successResponse(panel, "Panel de camiones obtenido exitosamente.");
  } catch (error) {
    console.error("Error en getPanelCamionesController:", error);
    return resolveCamionError(error);
  }
};

/**
 * Exporta información de camiones en formato CSV.
 *
 * El archivo generado es compatible con Excel
 * y soporta filtros dinámicos.
 */
/** @see /camiones/exportar/csv GET */
export const exportCamionesCsvController = async (event) => {
  try {
    const camionService = new CamionService();

    const csv = await camionService.exportCsv(event.queryStringParameters || {});

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
