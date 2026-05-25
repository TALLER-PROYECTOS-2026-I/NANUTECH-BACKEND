import { getCurrentSession } from "../auth-services/authService.mjs";
import { obtenerResumenAuditoria, obtenerRegistrosAuditoria, generarCsvAuditoria } from "./auditoriaService.mjs";

/**
 * Middleware utilitario para validar que el usuario que realiza la petición
 * sea Administrador. Utiliza el token JWT provisto en las cabeceras.
 *
 * @param {Object} event - Evento de API Gateway con las cabeceras HTTP.
 * @throws {Error} Si no hay token o si el rol no coincide con "admin".
 */
const validarAccesoAdministrador = async (event) => {
  // Extraer token de autorización manejando posibles variaciones de mayúsculas
  const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!authorizationHeader) throw new Error("Acceso denegado: Token requerido");
  
  // Validar y obtener los datos de la sesión mapeados del token
  const session = await getCurrentSession(authorizationHeader);
  
  // Validar que el rol corresponda a un "Admin"
  if (!["admin"].includes(session.role.toLowerCase())) {
    throw new Error("Acceso denegado: Se requiere rol de Administrador");
  }
};

/**
 * Controlador para la ruta `GET /auditoria/resumen`.
 * Retorna las métricas y un resumen estadístico de todos los accesos en el sistema.
 */
export const getAuditoriaResumenController = async (event) => {
  try {
    // 1. Verificamos permisos antes de ejecutar la lógica de base de datos
    await validarAccesoAdministrador(event);

    // 2. Comunicarnos con el servicio para los datos de negocio
    const data = await obtenerResumenAuditoria();
    
    // 3. Responder de forma estandarizada en formato JSON
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true, data })
    };
  } catch (error) {
    // Si contiene "Acceso denegado" es de autorización (403), si no es error de código (500)
    const status = error.message.includes("Acceso denegado") ? 403 : 500;
    return {
      statusCode: status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};

/**
 * Controlador para la ruta `GET /auditoria/registros`.
 * Retorna la tabla/historial paginado y/o filtrado de registros de inicio de sesión.
 */
export const getAuditoriaRegistrosController = async (event) => {
  try {
    // 1. Verificamos permisos de acceso Administrador
    await validarAccesoAdministrador(event);

    // 2. Extraer parámetros query de la URL para realizar filtros de búsqueda
    const search = event.queryStringParameters?.search || "";
    const rol = event.queryStringParameters?.rol || "";

    // 3. Obtener el arreglo de registros procesados desde el servicio
    const data = await obtenerRegistrosAuditoria(search, rol);
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true, data })
    };
  } catch (error) {
    const status = error.message.includes("Acceso denegado") ? 403 : 500;
    return {
      statusCode: status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};

/**
 * Controlador para la ruta `GET /auditoria/exportar/csv`.
 * Descarga directamente un archivo .CSV que puede ser leído por MS Excel con los registros filtrados.
 */
export const exportAuditoriaCsvController = async (event) => {
  try {
    // 1. Verificamos permisos de la sesión
    await validarAccesoAdministrador(event);

    // 2. Extrear parámetros para replicar los filtros actuales que tiene el usuario en la interfaz
    const search = event.queryStringParameters?.search || "";
    const rol = event.queryStringParameters?.rol || "";

    // 3. Obtener los datos formateados estrictamente como texto multilínea separado por comas (CSV)
    const csvData = await generarCsvAuditoria(search, rol);
    
    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "text/csv; charset=utf-8",
        // Force attachment causará que el navegador intente descargar el archivo
        "Content-Disposition": "attachment; filename=reporte_auditoria.csv",
        "Access-Control-Allow-Origin": "*" 
      },
      body: csvData
    };
  } catch (error) {
    const status = error.message.includes("Acceso denegado") ? 403 : 500;
    return {
      statusCode: status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};
