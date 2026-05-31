
// gpsController.mjs

import { GpsService } from "./gpsService.mjs";
import { getCsvFromEvent } from "./gpsValidator.mjs";
import { Parser } from "json2csv";
import { getCurrentSession } from "../../shared/services/authService.mjs";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/response/response.mjs";

/**
 * Función auxiliar para validar que el usuario tenga rol de Administrador General.
 */
const validateAdminGeneral = async (event) => {
  /**
   * VALIDACIÓN JWT
   */
  const authorizationHeader =
    event.headers?.Authorization ||
    event.headers?.authorization;

  if (!authorizationHeader) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "Token requerido",
      }),
    };
  }

  // Valida token y obtiene sesión
  const session =
    await getCurrentSession(
      authorizationHeader
    );

  /**
   * VALIDACIÓN DE ROLES
   *
   * Solo ADMINISTRADOR GENERAL puede acceder
   */
  const role = String(
    session?.role || ""
  ).trim().toLowerCase();

  if (
    role !== "admin" &&
    role !== "administrador general" &&
    role !== "administrador_general"
  ) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        message:
          "Solo el Administrador General puede acceder al módulo GPS.",
      }),
    };
  }

  return null;
};

/**
 * Función auxiliar para resolver y estructurar las respuestas de error del módulo.
 */
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
 * Controller encargado de obtener los proveedores GPS soportados por el sistema.
 */
export const getProvidersController = async () => {
  try {
    /**
     * LÓGICA PRINCIPAL
     */
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
 * Controller encargado de generar una plantilla CSV para importación GPS.
 */
export const getTemplateController = async (event) => {
  try {
    /**
     * OBTENER PARÁMETROS
     */
    const service = new GpsService();

    const proveedor =
      event.queryStringParameters?.proveedor ||
      event.pathParameters?.proveedor;

    /**
     * LÓGICA PRINCIPAL
     */
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
 * Controller encargado de validar la estructura y datos de un archivo CSV previo a la importación.
 */
export const validateCsvController = async (event) => {
  try {
    /**
     * LÓGICA PRINCIPAL
     */
    const service = new GpsService();
    const payload = getCsvFromEvent(event);
    const validation = service.validateCsv(payload);

    return successResponse(
      validation,
      validation.importacion_habilitada
        ? "Archivo GPS validado correctamente."
        : "Archivo GPS contains errores de validación.",
    );
  } catch (error) {
    console.error("Error en validateCsvController:", error);
    return resolveError(error, "GPS_CSV_VALIDATION_ERROR");
  }
};

/**
 * Controller encargado de procesar la importación masiva de registros GPS desde un CSV.
 */
export const importCsvController = async (event) => {
  try {
    /**
     * LÓGICA PRINCIPAL
     */
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
 * Controller encargado de obtener métricas resumidas de la actividad GPS general.
 */
export const getSummaryController = async () => {
  try {
    /**
     * LÓGICA PRINCIPAL
     */
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
 * Controller encargado de obtener el resumen de tracking GPS (Requiere rol Admin).
 */
export const getTrackingSummaryController = async (event) => {
  try {
    /**
     * VALIDACIÓN DE AUTENTICACIÓN Y ROLES
     */
    const authError =
      await validateAdminGeneral(event);

    if (authError) {
      return authError;
    }

    /**
     * LÓGICA PRINCIPAL
     */
    const service = new GpsService();

    const summary =
      await service.getTrackingSummary();

    return successResponse(
      summary,
      "Resumen Tracking GPS obtenido exitosamente."
    );
  } catch (error) {
    return resolveError(error);
  }
};

/**
 * Controller encargado de exportar un archivo CSV con el historial de tracking filtrado.
 */
export const exportTrackingCsvController =
  async (event) => {
    try {
      /**
       * VALIDACIÓN DE AUTENTICACIÓN Y ROLES
       */
      const authError =
        await validateAdminGeneral(event);

      if (authError) {
        return authError;
      }
      
      /**
       * LÓGICA PRINCIPAL
       */
      const service = new GpsService();

      const registros =
        await service.exportTrackingCsv(
          event.queryStringParameters || {}
        );

      /**
       * CONFIGURACIÓN DE COLUMNAS CSV
       */
      const fields = [
        "placa",
        "fecha_hora",
        "latitud",
        "longitud",
        "velocidad_kmh",
        "estado",
        "proveedor",
        "distancia_total",
        "exceso_velocidad",
      ];

      const parser = new Parser({
        fields,
      });

      /**
       * PARSEO Y FORMATEO DE CAMPOS (FECHA)
       */
      const csv = parser.parse(
        registros.map((row) => {
          const fecha = new Date(row.fecha_hora);

          const dd = String(
            fecha.getDate()
          ).padStart(2, "0");

          const mm = String(
            fecha.getMonth() + 1
          ).padStart(2, "0");

          const yyyy = fecha.getFullYear();

          const hh = String(
            fecha.getHours()
          ).padStart(2, "0");

          const mi = String(
            fecha.getMinutes()
          ).padStart(2, "0");

          const ss = String(
            fecha.getSeconds()
          ).padStart(2, "0");

          return {
            ...row,
            fecha_hora: `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`,
          };
        })
      );

      /**
       * ESTRUCTURACIÓN DE FECHA PARA EL NOMBRE DEL ARCHIVO
       */
      const now = new Date();

      const dd = String(
        now.getDate()
          ).padStart(2, "0");

      const mm = String(
        now.getMonth() + 1
      ).padStart(2, "0");

      const yyyy = now.getFullYear();

      /**
       * RETORNO DE RESPUESTA EN FORMATO ADJUNTO BINARIO/TEXTO (CSV)
       */
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition":
            `attachment; filename=reporte_tracking_${dd}${mm}${yyyy}.csv`,
        },
        body: csv,
      };
    } catch (error) {
      return resolveError(error);
    }
  };

/**
 * Controller encargado de listar todos los registros GPS almacenados con filtros dinámicos.
 */
export const listRegistrosController = async (event) => {
  try {
    /**
     * VALIDACIÓN DE AUTENTICACIÓN Y ROLES
     */
    const authError =
      await validateAdminGeneral(event);

    if (authError) {
      return authError;
    }

    /**
     * LÓGICA PRINCIPAL
     */
    const service = new GpsService();

    const registros =
      await service.listRegistros(
        event.queryStringParameters || {}
      );

    return successResponse(
      registros,
      "Registros GPS obtenidos exitosamente."
    );
  } catch (error) {
    return resolveError(error);
  }
};