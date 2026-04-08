import { JornadaService } from "./jornadaService.mjs";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/response/response.mjs";

const parseJsonBody = (body) => {
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch (error) {
    const parsingError = new Error("Cuerpo de solicitud invalido");
    parsingError.statusCode = 400;
    parsingError.code = "INVALID_REQUEST_BODY";
    throw parsingError;
  }
};

const resolveErrorResponse = (error) =>
  errorResponse(error.message, error.statusCode || 500, {
    code: error.code || "JORNADA_ERROR",
  });

export const createJornadaController = async (event) => {
  try {
    const body = parseJsonBody(event.body);
    const jornadaService = new JornadaService();
    const jornada = await jornadaService.createJornada(body);

    return successResponse(jornada, "Jornada registrada exitosamente.");
  } catch (error) {
    console.error("Error en createJornadaController:", error);
    return resolveErrorResponse(error);
  }
};

export const getCurrentJornadaController = async (event) => {
  try {
    const conductorId =
      event.pathParameters?.conductorId ||
      event.queryStringParameters?.conductor_id;
    const jornadaService = new JornadaService();
    const jornada = await jornadaService.getCurrentJornada(conductorId);

    return successResponse(jornada, "Jornada actual obtenida exitosamente.");
  } catch (error) {
    console.error("Error en getCurrentJornadaController:", error);
    return resolveErrorResponse(error);
  }
};

export const startTurnController = async (event) => {
  try {
    const body = parseJsonBody(event.body);
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
    const body = parseJsonBody(event.body);
    const jornadaService = new JornadaService();
    const jornada = await jornadaService.finishTurn(body);

    return successResponse(jornada, "Turno finalizado exitosamente.");
  } catch (error) {
    console.error("Error en finishTurnController:", error);
    return resolveErrorResponse(error);
  }
};
