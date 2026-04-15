import { JornadaService } from "./jornadaService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";

function resolveErrorResponse(error) {
  return errorResponse(error.message, error.statusCode || 500, { code: error.code || "JORNADA_ERROR" });
}

export const createJornadaController = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    if (!body.creado_por && event.requestContext?.authorizer) {
      body.creado_por = event.requestContext.authorizer.claims?.sub
        || event.requestContext.authorizer.jwt?.claims?.sub;
    }
    const jornada = await new JornadaService().createJornada(body);
    return successResponse(jornada, "Jornada registrada exitosamente.", 201);
  } catch (error) {
    console.error("Error en createJornadaController:", error);
    return resolveErrorResponse(error);
  }
};

export const getAllJornadasController = async (_event) => {
  try {
    const data = await new JornadaService().getAllJornadas();
    return successResponse(data, "Jornadas obtenidas exitosamente.");
  } catch (error) {
    console.error("Error en getAllJornadasController:", error);
    return resolveErrorResponse(error);
  }
};

export const getCurrentJornadaController = async (event) => {
  try {
    const conductorId = event.pathParameters?.conductorId
      || event.queryStringParameters?.conductor_id;
    const jornada = await new JornadaService().getCurrentJornada(conductorId);
    return successResponse(jornada, "Jornada actual obtenida exitosamente.");
  } catch (error) {
    console.error("Error en getCurrentJornadaController:", error);
    return resolveErrorResponse(error);
  }
};

export const startTurnController = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const jornada = await new JornadaService().startTurn(body);
    return successResponse(jornada, "Turno iniciado exitosamente.");
  } catch (error) {
    console.error("Error en startTurnController:", error);
    return resolveErrorResponse(error);
  }
};

export const finishTurnController = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const jornada = await new JornadaService().finishTurn(body);
    return successResponse(jornada, "Turno finalizado exitosamente.");
  } catch (error) {
    console.error("Error en finishTurnController:", error);
    return resolveErrorResponse(error);
  }
};