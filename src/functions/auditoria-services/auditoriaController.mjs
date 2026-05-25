/**
 * Controller: Auditoría de Accesos
 * HU13 - Capa HTTP: valida token, verifica rol ADMIN y despacha al service.
 *
 * Reutiliza el mismo patrón de autenticación que el resto de servicios:
 *   - Provider "cognito" → getCognitoSession
 *   - Provider "local"   → verifyLocalAccessToken
 */

import { successResponse, errorResponse } from '../../shared/utils/response/response.mjs';
import { getAuditoriaAccesos } from './auditoriaService.mjs';
import { extractBearerToken } from '../auth-services/authValidator.mjs';
import { verifyLocalAccessToken } from '../auth-services/authToken.mjs';
import { getAuthProvider } from '../auth-services/authConfig.mjs';
import * as cognitoProvider from '../auth-services/authCognitoProvider.mjs';

// ─── Roles permitidos para este endpoint ─────────────────────────────────────
const ROLES_PERMITIDOS = ['admin'];

// ─── Helper: verificar token y extraer rol ───────────────────────────────────

/**
 * Verifica el token Bearer del request y devuelve el rol del usuario.
 * Lanza error si el token es inválido, expirado o el rol no está permitido.
 *
 * @param {Object} event - Evento Lambda de API Gateway
 * @returns {Promise<{role: string, email: string}>}
 */
const verificarTokenYRol = async (event) => {
  const headers     = event.headers || {};
  const authHeader  = headers['Authorization'] || headers['authorization'];
  const token       = extractBearerToken(authHeader); // lanza 401 si no hay token

  let role  = null;
  let email = null;

  if (getAuthProvider() === 'cognito') {
    const sessionResult = await cognitoProvider.getCognitoSession(token);
    role  = sessionResult?.user?.role   || null;
    email = sessionResult?.user?.email  || null;
  } else {
    // Modo local/desarrollo
    const payload = verifyLocalAccessToken(token); // lanza 401 si inválido/expirado
    role  = payload.role  || null;
    email = payload.email || null;
  }

  // Verificar que el rol tenga acceso a este endpoint
  if (!role || !ROLES_PERMITIDOS.includes(role.toLowerCase())) {
    const err = new Error('No tienes permisos para acceder a este recurso');
    err.statusCode = 403;
    err.code       = 'FORBIDDEN';
    throw err;
  }

  return { role, email };
};

// ─── Controller principal ────────────────────────────────────────────────────

/**
 * GET /dashboard/auditoria
 * Solo accesible por usuarios con rol ADMIN.
 *
 * Response body:
 * {
 *   success: true,
 *   data: AuditLogItem[],   ← formato exacto que consume el frontend
 *   message: "..."
 * }
 */
export const getAuditoria = async (event) => {
  try {
    await verificarTokenYRol(event);

    const logs = await getAuditoriaAccesos();

    return successResponse(logs, 'Registros de auditoría obtenidos correctamente');
  } catch (error) {
    return errorResponse(
      error.message,
      error.statusCode || 500,
      { code: error.code || 'AUDITORIA_ERROR' },
    );
  }
};
