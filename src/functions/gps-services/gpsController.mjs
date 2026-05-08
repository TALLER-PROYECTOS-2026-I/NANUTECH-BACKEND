import { GpsService } from "./gpsService.mjs";
import { getCsvFromEvent } from "./gpsValidator.mjs";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/response/response.mjs";

function resolveError(error, defaultCode = "GPS_ERROR") {
  const statusCode =
    error.statusCode ||
    (/inv[aá]lido|obligatorio|permiten|csv|proveedor/i.test(error.message)
      ? 400
      : 500);

  return errorResponse(error.message, statusCode, {
    code: error.code || defaultCode,
  });
}

/**
 * Obtiene proveedores GPS soportados por el sistema.
 */

export const getProvidersController = async () => {
  try {
    const service = new GpsService();
    const providers = service.getProviders();

    return successResponse(
      providers,
      "Proveedores GPS obtenidos exitosamente.",
    );
  } catch (error) {
    console.error("Error en getProvidersController:", error);
    return resolveError(error);
  }
};

/**
 * Genera una plantilla CSV para importación GPS.
 */

export const getTemplateController = async (event) => {
  try {
    const service = new GpsService();

    const proveedor =
      event.queryStringParameters?.proveedor ||
      event.pathParameters?.proveedor;

    const template = service.getTemplate(proveedor);

    return successResponse(
      template,
      "Plantilla GPS generada exitosamente.",
    );
  } catch (error) {
    console.error("Error en getTemplateController:", error);
    return resolveError(error);
  }
};

/**
 * Valida un archivo CSV previo a la importación.
 */

export const validateCsvController = async (event) => {
  try {
    const service = new GpsService();
    const payload = getCsvFromEvent(event);
    const validation = service.validateCsv(payload);

    return successResponse(
      validation,
      validation.importacion_habilitada
        ? "Archivo GPS validado correctamente."
        : "Archivo GPS contiene errores de validación.",
    );
  } catch (error) {
    console.error("Error en validateCsvController:", error);
    return resolveError(error, "GPS_CSV_VALIDATION_ERROR");
  }
};

/**
 * Procesa la importación masiva de registros GPS.
 */

export const importCsvController = async (event) => {
  try {
    const service = new GpsService();
    const payload = getCsvFromEvent(event);
    const result = await service.importCsv(payload);

    const statusCode = result.estado === "RECHAZADA" ? 400 : 201;

    return successResponse(
      result,
      "Importación GPS procesada exitosamente.",
      statusCode,
    );
  } catch (error) {
    console.error("Error en importCsvController:", error);
    return resolveError(error, "GPS_IMPORT_ERROR");
  }
};

/**
 * Obtiene métricas resumidas de actividad GPS.
 */

export const getSummaryController = async () => {
  try {
    const service = new GpsService();
    const summary = await service.getSummary();

    return successResponse(
      summary,
      "Resumen GPS obtenido exitosamente.",
    );
  } catch (error) {
    console.error("Error en getSummaryController:", error);
    return resolveError(error);
  }
};

/**
 * Lista registros GPS almacenados.
 */

export const listRegistrosController = async (event) => {
  try {
    const service = new GpsService();

    const registros = await service.listRegistros({
      proveedor: event.queryStringParameters?.proveedor,
      placa: event.queryStringParameters?.placa,
    });

    return successResponse(
      registros,
      "Registros GPS obtenidos exitosamente.",
    );
  } catch (error) {
    console.error("Error en listRegistrosController:", error);
    return resolveError(error);
  }
};