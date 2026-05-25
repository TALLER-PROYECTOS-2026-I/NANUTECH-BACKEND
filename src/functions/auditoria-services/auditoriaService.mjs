/**
 * Service: Auditoría de Accesos
 * HU13 - Lógica de negocio
 *
 * Expone:
 *  - getAuditoriaAccesos()  → lista mapeada para el frontend
 *  - registrarAcceso(...)   → inserta un registro de auditoría (usado por auth)
 */

import { findAll, findMetrics, insertAuditLog } from './auditoriaRepository.mjs';
import { mapAuditRow, parseUserAgent } from './auditoriaModel.mjs';

/**
 * Devuelve la lista completa de registros de auditoría de accesos
 * en el formato que espera el frontend (AuditLogItem[]).
 *
 * El frontend espera exactamente estos campos:
 *   id, usuario, email, rol, fecha, hora, ip, navegador
 *
 * @returns {Promise<AuditLogItem[]>}
 */
export const getAuditoriaAccesos = async () => {
  const rows = await findAll();
  return rows.map(mapAuditRow);
};

/**
 * Registra un acceso en la tabla auditoria_accesos.
 * Debe llamarse desde el handler de auth justo después de un intento
 * de login (exitoso o fallido) para garantizar la inmutabilidad del rastro.
 *
 * @param {Object} params
 * @param {string|null} params.usuarioId
 * @param {string}      params.correo
 * @param {string|null} params.rol       - 'ADMIN' | 'CHOFER' | 'GERENTE'
 * @param {string}      params.resultado - 'EXITOSO' | 'FALLIDO'
 * @param {string|null} params.ipAddress - extraído de los headers del request
 * @param {string|null} params.userAgent - extraído de los headers del request
 * @param {string|null} params.detalle
 */
export const registrarAcceso = async ({
  usuarioId   = null,
  correo      = '',
  rol         = null,
  resultado   = 'EXITOSO',
  ipAddress   = null,
  userAgent   = null,
  detalle     = null,
}) => {
  const dispositivo = parseUserAgent(userAgent);

  await insertAuditLog({
    usuarioId,
    correo,
    rol,
    accion:  'LOGIN',
    resultado,
    ipAddress,
    userAgent,
    dispositivo,
    detalle,
  });
};

/**
 * Helper exportado para que el authHandler pueda registrar el acceso
 * extrayendo IP y UA directamente del evento de API Gateway.
 *
 * @param {Object} event  - Evento Lambda de API Gateway
 * @param {Object} result - Resultado de authService.handleLoginAttempt
 * @param {string} resultado - 'EXITOSO' | 'FALLIDO'
 * @param {string} correo
 */
export const registrarAccesoDesdeEvento = async (event, result, resultado, correo) => {
  const headers    = event.headers || {};
  const ipAddress  = extractIp(headers);
  const userAgent  = headers['User-Agent'] || headers['user-agent'] || null;

  await registrarAcceso({
    usuarioId:  result?.user?.id   || null,
    correo:     result?.user?.email || correo,
    rol:        mapRolInterno(result?.user?.role || result?.role),
    resultado,
    ipAddress,
    userAgent,
    detalle: resultado === 'EXITOSO'
      ? 'Inicio de sesión correcto'
      : 'Credenciales inválidas o error de autenticación',
  });
};

// ─── Helpers privados ────────────────────────────────────────────────────────

/**
 * Extrae la IP real del cliente considerando proxies y API Gateway.
 * Prioridad: X-Forwarded-For → X-Real-IP → sourceIp de requestContext
 */
const extractIp = (headers) => {
  const xff = headers['X-Forwarded-For'] || headers['x-forwarded-for'];
  if (xff) {
    return xff.split(',')[0].trim();
  }
  return headers['X-Real-IP'] || headers['x-real-ip'] || null;
};

/** Convierte el rol interno del sistema (minúsculas) al ENUM de la BD (mayúsculas) */
const mapRolInterno = (role) => {
  const map = {
    admin:   'ADMIN',
    chofer:  'CHOFER',
    gerente: 'GERENTE',
  };
  return map[(role || '').toLowerCase()] || null;
};
