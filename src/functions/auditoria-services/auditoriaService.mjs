import { insertAuditoriaAcceso } from "./auditoriaRepository.mjs";

/**
 * Procesa y registra la informaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de acceso de manera asÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ncrona.
 * Funciona como "hook/interceptor" dentro del servicio de Auth.
 * Evita romper el login si falla la inserciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de auditorÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a atrapando el error sin lanzarlo.
 *
 * @param {Object} event - Evento original de APIGateway (requerido para rastrear headers)
 * @param {Object} user - Objeto de usuario que acaba de logearse
 */
export const registrarAcceso = async (event, user) => {
  try {
    if (!user || !user.id) return;
    
    const headers = event.headers || {};
    
    // AWS API Gateway provee la IP del cliente real en 'X-Forwarded-For'
    const xForwardedFor = headers['X-Forwarded-For'] || headers['x-forwarded-for'] || '';
    
    // Tomamos la primera IP disponible que identifique al cliente final o fallback al contexto de identidad
    const direccionIp = xForwardedFor.split(',')[0] || event.requestContext?.identity?.sourceIp || 'Desconocida';
    
    // Extraer User Agent para conocer desde quÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© navegador OS o Dispositivo entrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³
    const navegador = headers['User-Agent'] || headers['user-agent'] || 'Desconocido';

    // Disparar escritura asÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ncrona hacia la base de datos
    await insertAuditoriaAcceso(user.id, direccionIp, navegador);
    
    console.log(`[AuditorÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a] Login registrado para ${user.email} desde IP: ${direccionIp}`);
  } catch (error) {
    // La auditorÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a no debe romper el flujo de login si llega a fallar. (Fail-safeth)
    console.error("[AuditorÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a] Error al registrar acceso:", error.message);
  }
};

import { getResumenAccesosDB, getRegistrosDB } from "./auditoriaRepository.mjs";

/**
 * FunciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n utilitaria para transformar Fechas formato ISO Date
 * en una representaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n separada de { fecha, hora } para la interfaz.
 */
const formatearFechaHora = (fechaIso) => {
  const d = new Date(fechaIso);
  const pad = (n) => n.toString().padStart(2, '0');
  
  return {
    fecha: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  };
};

/**
 * Orquesta la captura de los resÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºmenes estadÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­sticos llamando al repositorio.
 * Mapea la informaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n consolidada lista para ser pintada en los "Kpis" del admin.
 */
export const obtenerResumenAuditoria = async () => {
  const data = await getResumenAccesosDB();
  
  // Inicializamos un objeto por defecto de los roles existentes para asegurar consistencia
  const progresoRoles = {
    ADMINISTRADOR: 0,
    GERENTE: 0,
    CHOFER: 0
  };

  // Re-asignamos las cantidades segÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºn lo contabilizado en DB
  data.roles.forEach(r => {
    if (progresoRoles[r.rol] !== undefined) {
      progresoRoles[r.rol] = parseInt(r.cantidad, 10);
    }
  });

  return {
    metricas: {
      total_accesos: parseInt(data.metricas.total_accesos || 0, 10),
      accesos_hoy: parseInt(data.metricas.accesos_hoy || 0, 10),
      accesos_semana: parseInt(data.metricas.accesos_semana || 0, 10),
      usuarios_unicos: parseInt(data.metricas.usuarios_unicos || 0, 10),
      ips_unicas: parseInt(data.metricas.ips_unicas || 0, 10)
    },
    progreso_roles: progresoRoles
  };
};

/**
 * Solicita los registros puntuales a BBDD y los adapta como Data Transfer Object (DTO)
 * para limpiar nulos y formatear la fecha correctamente usando nuestra utilidad.
 */
export const obtenerRegistrosAuditoria = async (search, rol) => {
  const rows = await getRegistrosDB(search, rol);
  
  return rows.map(r => {
    const { fecha, hora } = formatearFechaHora(r.fecha_hora);
    return {
      id: r.id,
      usuario: r.usuario,
      email: r.email,
      rol: (() => { const m = { ADMIN: 'Administrador', CHOFER: 'Conductor', GERENTE: 'Gerente' }; return m[r.rol] || r.rol || 'Desconocido'; })(),
      fecha,
      hora,
      ip: r.direccion_ip,
      navegador: r.navegador
    };
  });
};

/**
 * Encargado de construir el string .CSV basÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ndose en los registros existentes.
 * ActÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºa iterando las filas y uniÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©ndolas junto con las cabeceras estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ndar.
 */
export const generarCsvAuditoria = async (search, rol) => {
  const registros = await obtenerRegistrosAuditoria(search, rol);
  
  // Header principal del archivo CSV
  let csv = "ID Registro,Usuario,Email,Rol,Fecha,Hora,Direccion IP,Navegador/SO\n";
  
  // Agregar cada registro aplicando el escape respectivo de comillas dobles en caso sea necesario
  registros.forEach(r => {
    const navEscapado = `"${(r.navegador || '').replace(/"/g, '""')}"`;
    csv += `${r.id},${r.usuario},${r.email},${r.rol},${r.fecha},${r.hora},${r.ip},${navEscapado}\n`;
  });
  
  return csv;
};
