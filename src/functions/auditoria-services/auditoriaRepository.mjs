import { query } from "../../shared/config/database.mjs";

/**
 * Registra un nuevo acceso en la base de datos de auditoria.
 * @param {string} usuarioId - UUID del usuario
 * @param {string} ip - Dirección IP desde la cual se conectó 
 * @param {string} navegador - Información del User-Agent
 * @returns {Promise<void>}
 */
export const insertAuditoriaAcceso = async (usuarioId, ip, navegador) => {
  const sql = `
    INSERT INTO auditoria_accesos (usuario_id, direccion_ip, navegador)
    VALUES ($1, $2, $3)
  `;
  await query(sql, [usuarioId, ip, navegador]);
};

export const getResumenAccesosDB = async () => {
  const qResumen = `
    SELECT
      (SELECT COUNT(*) FROM auditoria_accesos) as total_accesos,
      (SELECT COUNT(*) FROM auditoria_accesos WHERE DATE(fecha_hora AT TIME ZONE 'UTC') = CURRENT_DATE) as accesos_hoy,
      (SELECT COUNT(*) FROM auditoria_accesos WHERE fecha_hora >= CURRENT_DATE - INTERVAL '7 days') as accesos_semana,
      (SELECT COUNT(DISTINCT usuario_id) FROM auditoria_accesos) as usuarios_unicos,
      (SELECT COUNT(DISTINCT direccion_ip) FROM auditoria_accesos) as ips_unicas
  `;
  
  const qRoles = `
    SELECT u.rol, COUNT(a.id) as cantidad
    FROM auditoria_accesos a
    JOIN usuarios u ON a.usuario_id = u.id
    GROUP BY u.rol
  `;

  const [res, roles] = await Promise.all([
    query(qResumen),
    query(qRoles)
  ]);

  return { metricas: res.rows[0], roles: roles.rows };
};

export const getRegistrosDB = async (search = "", rol = "") => {
  let sql = `
    SELECT 
      a.codigo as id_registro,
      u.nombres || ' ' || u.apellidos as usuario,
      u.email,
      u.rol,
      a.fecha_hora,
      a.direccion_ip,
      a.navegador
    FROM auditoria_accesos a
    JOIN usuarios u ON a.usuario_id = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (search) {
    sql += ` AND (u.nombres ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR a.codigo ILIKE $${paramIndex} OR u.apellidos ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (rol && rol.toLowerCase() !== "todos") {
    sql += ` AND u.rol = $${paramIndex}`;
    params.push(rol.toUpperCase());
    paramIndex++;
  }

  sql += ` ORDER BY a.fecha_hora DESC LIMIT 500`;
  const { rows } = await query(sql, params);
  return rows;
};
