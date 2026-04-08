import { JornadaService } from "./jornadaService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";

export const createJornadaController = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    
    // NOTA: Obtener 'creado_por' desde el authorizer (Cognito) si no viene
    if (!body.creado_por && event.requestContext && event.requestContext.authorizer) {
        // Asumiendo JWT claims basicos, ajustable según el Cognito mapping
        body.creado_por = event.requestContext.authorizer.claims?.sub || event.requestContext.authorizer.jwt?.claims?.sub;
    }

    const jornadaService = new JornadaService();
    const jornada = await jornadaService.createJornada(body);

    return successResponse(jornada, "Jornada registrada exitosamente.", 201);
  } catch (error) {
    console.error("Error en createJornadaController:", error);
    
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes("requerido") ||
      errorMessage.includes("inválidos") ||
      errorMessage.includes("proceso o registrada")
    ) {
      return errorResponse(error.message, 400);
    }

    return errorResponse("Error en el servidor al registrar la jornada", 500);
  }
};
