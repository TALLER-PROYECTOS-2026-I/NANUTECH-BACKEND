/**
 * Model: Auditoría de Accesos
 * HU13 - Registro inmutable de inicios de sesión
 */

/**
 * Mapea una fila de la tabla auditoria_accesos al formato esperado por el frontend.
 * El frontend espera: id, usuario, email, rol, fecha, hora, ip, navegador
 * con roles en español: Administrador | Gerente | Conductor
 */
export const mapAuditRow = (row) => {
  if (!row) return null;

  const fecha = row.created_at ? formatFecha(row.created_at) : '';
  const hora  = row.created_at ? formatHora(row.created_at)  : '';

  return {
    id:        formatAuditId(row.id),
    usuario:   row.nombres_completos || row.correo || 'Desconocido',
    email:     row.correo || '',
    rol:       mapRol(row.rol),
    fecha,
    hora,
    ip:        row.ip_address ? String(row.ip_address) : '—',
    navegador: parseUserAgent(row.user_agent),
    // Campos extra para el backend / auditoría avanzada (no mostrados en tabla pero útiles)
    resultado: row.resultado || null,
    accion:    row.accion    || null,
  };
};

// ─── Helpers privados ────────────────────────────────────────────────────────

/**
 * Genera el ID de auditoría visible tipo "AUDIT-177542"
 * Usa los últimos 6 dígitos del UUID para mantener unicidad legible.
 */
const formatAuditId = (uuid) => {
  if (!uuid) return 'AUDIT-000000';
  // Toma los últimos 6 caracteres hex del UUID y los convierte a número
  const hex = uuid.replace(/-/g, '').slice(-8);
  const num = parseInt(hex, 16) % 1000000;
  return `AUDIT-${String(num).padStart(6, '0')}`;
};

/** DD/MM/YYYY */
const formatFecha = (date) => {
  const d = new Date(date);
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/** HH:MM:SS (24h) */
const formatHora = (date) => {
  const d = new Date(date);
  const hh  = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss  = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${min}:${ss}`;
};

/** Mapea el enum de BD al texto en español que espera el frontend */
const mapRol = (rol) => {
  const map = {
    ADMIN:   'Administrador',
    CHOFER:  'Conductor',
    GERENTE: 'Gerente',
  };
  return map[rol] || rol || 'Desconocido';
};

/**
 * Extrae "Navegador - SO" desde el User-Agent.
 * Devuelve algo como "Chrome - Windows", "Safari - iOS", "Firefox - Android".
 * Si no puede determinarlo devuelve el UA crudo truncado.
 */
export const parseUserAgent = (ua) => {
  if (!ua) return '—';

  let browser = 'Otro';
  let os      = 'Desconocido';

  // Browser detection (orden importa — Edge debe ir antes de Chrome)
  if (/Edg\//i.test(ua))          browser = 'Edge';
  else if (/OPR\//i.test(ua))     browser = 'Opera';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Chrome\//i.test(ua))  browser = 'Chrome';
  else if (/Safari\//i.test(ua))  browser = 'Safari';
  else if (/MSIE|Trident/i.test(ua)) browser = 'IE';

  // OS detection
  if (/iPhone|iPad|iOS/i.test(ua))         os = 'iOS';
  else if (/Android/i.test(ua))            os = 'Android';
  else if (/Windows NT/i.test(ua))         os = 'Windows';
  else if (/Mac OS X/i.test(ua))           os = 'macOS';
  else if (/Linux/i.test(ua))              os = 'Linux';

  return `${browser} - ${os}`;
};
