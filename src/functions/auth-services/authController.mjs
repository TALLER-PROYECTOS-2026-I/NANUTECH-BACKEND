import {
  successResponse,
  errorResponse,
} from "../../shared/utils/response/response.mjs";
import * as authService from "./authService.mjs";

// T06 - Olvidé contraseña
export const forgotPassword = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email } = body;

    if (!email) {
      return errorResponse("El email es obligatorio");
    }

    const result = await authService.handleForgotPassword(email);

    return successResponse(result, "Correo de recuperación enviado");
  } catch (error) {
    return errorResponse("Error en forgotPassword", error);
  }
};

// T07 - Intentos fallidos
export const loginAttempt = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email, password } = body;

    const result = await authService.handleLoginAttempt(email, password);

    return successResponse(result, "Resultado de login");
  } catch (error) {
    return errorResponse("Error en loginAttempt", error);
  }
};
