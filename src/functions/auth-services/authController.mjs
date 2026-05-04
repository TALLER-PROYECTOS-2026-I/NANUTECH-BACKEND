import {
  errorResponse,
  successResponse,
} from "../../shared/utils/response/response.mjs";
import * as authService from "./authService.mjs";

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
    code: error.code || "AUTH_ERROR",
  });

export const forgotPassword = async (event) => {
  try {
    const body = parseJsonBody(event.body);
    const result = await authService.handleForgotPassword(body.email);

    return successResponse(result, "Correo de recuperacion enviado");
  } catch (error) {
    return resolveErrorResponse(error);
  }
};

export const confirmForgotPassword = async (event) => {
  try {
    const body = parseJsonBody(event.body);
    const result = await authService.handleConfirmForgotPassword(
      body.email,
      body.code,
      body.newPassword,
    );

    return successResponse(result, "Contrasena actualizada");
  } catch (error) {
    return resolveErrorResponse(error);
  }
};

export const loginAttempt = async (event) => {
  try {
    const body = parseJsonBody(event.body);
    const result = await authService.handleLoginAttempt(
      body.email,
      body.password,
    );

    return successResponse(result, "Resultado de login");
  } catch (error) {
    return resolveErrorResponse(error);
  }
};

export const getCurrentSessionController = async (event) => {
  try {
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;
    const result = await authService.getCurrentSession(authorizationHeader);

    return successResponse(result, "Sesion valida");
  } catch (error) {
    return resolveErrorResponse(error);
  }
};
