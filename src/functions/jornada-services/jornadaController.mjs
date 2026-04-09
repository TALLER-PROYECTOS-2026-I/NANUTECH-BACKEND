import { JornadaService } from "./jornadaService.mjs";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/response/response.mjs";

function parseJsonBody(event) {
  if (!event.body) return {};

  try {
    return JSON.parse(event.body);
  } catch {
    const error = new Error("El cuerpo de la solicitud no es un JSON válido.");
    error.statusCode = 400;
    error.code = "INVALID_REQUEST_BODY";
    throw error;
  }
}

function resolveErrorResponse(error) {
  return errorResponse(error.message, error.statusCode || 500, {
    code: error.code || "JORNADA_ERROR",
  });
}

export const createJornadaController = async (event) => {
  try {
    const body = parseJsonBody(event);

    // NOTA: Obtener 'creado_por' desde el authorizer (Cognito) si no viene
    if (
      !body.creado_por &&
      event.requestContext &&
      event.requestContext.authorizer
    ) {
      // Asumiendo JWT claims basicos, ajustable según el Cognito mapping
      body.creado_por =
        event.requestContext.authorizer.claims?.sub ||
        event.requestContext.authorizer.jwt?.claims?.sub;
    }

    const jornadaService = new JornadaService();
    const jornada = await jornadaService.createJornada(body);

    return successResponse(jornada, "Jornada registrada exitosamente.", 201);
  } catch (error) {
    console.error("Error en createJornadaController:", error);
    return resolveErrorResponse(error);
  }
};

export const getCurrentJornadaController = async (event) => {
  try {
    const jornadaService = new JornadaService();
    const conductorId =
      event.pathParameters?.conductorId ||
      event.queryStringParameters?.conductor_id;

    const jornada = await jornadaService.getCurrentJornada(conductorId);
    return successResponse(jornada, "Jornada actual obtenida exitosamente.");
  } catch (error) {
    console.error("Error en getCurrentJornadaController:", error);
    return resolveErrorResponse(error);
  }
};

export const startTurnController = async (event) => {
  try {
    const body = parseJsonBody(event);
    const jornadaService = new JornadaService();
    const jornada = await jornadaService.startTurn(body);

    return successResponse(jornada, "Turno iniciado exitosamente.");
  } catch (error) {
    console.error("Error en startTurnController:", error);
    return resolveErrorResponse(error);
  }
};

export const finishTurnController = async (event) => {
  try {
    const body = parseJsonBody(event);
    const jornadaService = new JornadaService();
    const jornada = await jornadaService.finishTurn(body);

    return successResponse(jornada, "Turno finalizado exitosamente.");
  } catch (error) {
    console.error("Error en finishTurnController:", error);
    return resolveErrorResponse(error);
  }
};
