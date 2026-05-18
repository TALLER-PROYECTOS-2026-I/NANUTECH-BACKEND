import { errorResponse, successResponse } from "../../shared/utils/response/response.mjs";
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
/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Solicitar recuperación de contraseña
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@test.com
 *     responses:
 *       200:
 *         description: Correo de recuperación enviado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Email inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const forgotPassword = async (event) => {
  try {
    const body = parseJsonBody(event.body);
    const result = await authService.handleForgotPassword(body.email);

    return successResponse(result, "Correo de recuperacion enviado");
  } catch (error) {
    return resolveErrorResponse(error);
  }
};
/**
 * @openapi
 * /auth/forgot-password/confirm:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Confirmar nueva contraseña con código
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@test.com
 *               code:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 example: "NuevaPass123"
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Código de recuperación inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const confirmForgotPassword = async (event) => {
  try {
    const body = parseJsonBody(event.body);
    const result = await authService.handleConfirmForgotPassword(
      body.email,
      body.code,
      body.newPassword
    );

    return successResponse(result, "Contrasena actualizada");
  } catch (error) {
    return resolveErrorResponse(error);
  }
};
/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@test.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *                 session:
 *                   $ref: '#/components/schemas/SessionInfo'
 *                 role:
 *                   type: string
 *                   example: admin
 *                 nextRoute:
 *                   type: string
 *                   example: /dashboard/admin
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       423:
 *         description: Cuenta bloqueada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const loginAttempt = async (event) => {
  try {
    const body = parseJsonBody(event.body);
    const result = await authService.handleLoginAttempt(body.email, body.password);

    return successResponse(result, "Resultado de login");
  } catch (error) {
    return resolveErrorResponse(error);
  }
};
/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Obtener sesión activa del usuario
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión válida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *                 session:
 *                   $ref: '#/components/schemas/SessionInfo'
 *                 role:
 *                   type: string
 *                   example: admin
 *                 nextRoute:
 *                   type: string
 *                   example: /dashboard/admin
 *       401:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Usuario no provisionado o inactivo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getCurrentSessionController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    const result = await authService.getCurrentSession(authorizationHeader);

    return successResponse(result, "Sesion valida");
  } catch (error) {
    return resolveErrorResponse(error);
  }
};
