import { JornadaService } from "./jornadaService.mjs";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/response/response.mjs";

export const createJornadaController = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const jornadaService = new JornadaService();

    const jornada = await jornadaService.createJornada(body);

    return successResponse(jornada, "Jornada registrada exitosamente.");
  } catch (error) {
    console.error("Error en createJornadaController:", error);
    if (
      error.message.includes("requerido") ||
      error.message.includes("activa") ||
      error.message.includes("inválidos")
    ) {
      return errorResponse(error.message, 400);
    }
    return errorResponse("Error en el servidor al registrar la jornada", 500);
  }
};
