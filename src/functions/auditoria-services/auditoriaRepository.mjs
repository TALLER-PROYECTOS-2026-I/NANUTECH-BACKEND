/**
 * Repository: Auditoría de Accesos
 * HU13 - Consultas directas a la tabla auditoria_accesos
 *
 * La tabla tiene esta estructura relevante:
 *   id UUID, usuario_id, correo, rol rol_usuario,
 *   accion, resultado resultado_auditoria,
 *   ip_address INET, user_agent TEXT, dispositivo,
 *   detalle, created_at TIMESTAMP
 *
 * Para obtener el nombre del usuario hacemos JOIN con la tabla usuarios.
 */

import db from '../../shared/config/database.mjs';

/**
 * Retorna todos los registros de auditoría de accesos (LOGIN exitoso).
 * Ordenados por created_at DESC (más recientes primero).
 *
 * @returns {Promise<Array>} filas crudas de la BD
 */
export const findAll = async () => {
  const sql = `
    SELECT
      aa.id,
      aa.correo,
      aa.rol,
      aa.accion,
      aa.resultado,
      aa.ip_address::TEXT   AS ip_address,
      aa.user_agent,
      aa.dispositivo,
      aa.detalle,
      aa.created_at,
      CONCAT(u.nombres, ' ', u.apellidos) AS nombres_completos
    FROM auditoria_accesos aa
    LEFT JOIN usuarios u ON u.id = aa.usuario_id
    ORDER BY aa.created_at DESC
  `;
  const result = await db.query(sql);
  return result.rows;
};

/**
 * Retorna las métricas agregadas de la tabla para las tarjetas del dashboard.
 * Devuelve:
 *   total, hoy, esta_semana, usuarios_unicos, ips_unicas,
 *   count_admin, count_gerente, count_chofer
 */
export const findMetrics = async () => {
  const sql = `
    SELECT
      COUNT(*)                                                         AS total,
      COUNT(*) FILTER (WHERE created_at::DATE = CURRENT_DATE)        AS hoy,
      COUNT(*) FILTER (
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      )                                                               AS esta_semana,
      COUNT(DISTINCT LOWER(correo))                                   AS usuarios_unicos,
      COUNT(DISTINCT ip_address)                                      AS ips_unicas,
      COUNT(*) FILTER (WHERE rol = 'ADMIN')                          AS count_admin,
      COUNT(*) FILTER (WHERE rol = 'GERENTE')                        AS count_gerente,
      COUNT(*) FILTER (WHERE rol = 'CHOFER')                         AS count_chofer
    FROM auditoria_accesos
  `;
  const result = await db.query(sql);
  return result.rows[0] || {};
};

/**
 * Inserta un nuevo registro de auditoría.
 * Llamado desde el handler de login para registrar el intento.
 *
 * @param {Object} params
 * @param {string|null} params.usuarioId
 * @param {string}      params.correo
 * @param {string|null} params.rol        - 'ADMIN' | 'CHOFER' | 'GERENTE'
 * @param {string}      params.accion     - ej. 'LOGIN'
 * @param {string}      params.resultado  - 'EXITOSO' | 'FALLIDO'
 * @param {string|null} params.ipAddress
 * @param {string|null} params.userAgent
 * @param {string|null} params.dispositivo
 * @param {string|null} params.detalle
 * @returns {Promise<Object>} fila insertada
 */
export const insertAuditLog = async ({
  usuarioId   = null,
  correo      = '',
  rol         = null,
  accion      = 'LOGIN',
  resultado   = 'EXITOSO',
  ipAddress   = null,
  userAgent   = null,
  dispositivo = null,
  detalle     = null,
}) => {
  const sql = `
    INSERT INTO auditoria_accesos
      (usuario_id, correo, rol, accion, resultado, ip_address, user_agent, dispositivo, detalle)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, created_at
  `;
  const values = [
    usuarioId,
    correo,
    rol,
    accion,
    resultado,
    ipAddress,
    userAgent,
    dispositivo,
    detalle,
  ];
  const result = await db.query(sql, values);
  return result.rows[0];
};
