import { ContratoService } from "./contratoService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";
import { SUCCESS_MESSAGES } from "../../shared/constants/successMessages.mjs";
import { getCurrentSession } from "../auth-services/authService.mjs";

/**
 * Parsea el body de la solicitud Lambda como JSON.
 *
 * @param {string|null} body - Cuerpo crudo de la solicitud HTTP
 * @returns {Object} Objeto parseado o vacío si no hay body
 * @throws {Error} Con statusCode 400 si el body no es JSON válido
 */
const parseJsonBody = (body) => {
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch (error) {
    const parsingError = new Error("Cuerpo de solicitud inválido");
    parsingError.statusCode = 400;
    parsingError.code = "INVALID_REQUEST_BODY";
    throw parsingError;
  }
};

/**
 * Obtiene todos los contratos actualmente vigentes.
 * Requiere autenticación Bearer válida.
 *
 * Criterios de vigencia aplicados en el repositorio:
 * - activo = TRUE
 * - estado = VIGENTE
 * - fecha_inicio <= hoy
 * - fecha_fin >= hoy o NULL (sin fecha de expiración)
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @returns {Promise<Object>} Respuesta HTTP 200 con lista de contratos vigentes
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 500 si ocurre un error interno al consultar la base de datos
 */
export const getAllVigentesController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const contratoService = new ContratoService();
    const contratos = await contratoService.getAllVigentes();
    return successResponse(contratos, SUCCESS_MESSAGES.CONTRATOS_RETRIEVED);
  } catch (error) {
    console.error("Error en getAllVigentesController:", error);
    return errorResponse(error.message, error.statusCode || 500);
  }
};

/**
 * Registra un nuevo contrato junto con su ruta y reglas de tarifa en una transacción atómica.
 * Requiere autenticación Bearer válida y rol "gerente".
 *
 * La operación crea tres registros relacionados:
 * 1. Contrato principal en la tabla contratos (estado VIGENTE, activo TRUE)
 * 2. Ruta asociada en contrato_rutas
 * 3. Tarifas asociadas en contrato_tarifas
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {string} event.body - JSON con los datos del contrato
 * @param {string} event.body.cliente - Nombre del cliente (no puede estar vacío)
 * @param {string} event.body.ruc - RUC del cliente (exactamente 11 dígitos numéricos)
 * @param {string} event.body.tipo_servicio - Tipo de servicio (POR_VIAJE | POR_HORA | POR_TONELADA | POR_KM | MENSUAL)
 * @param {string} event.body.fecha_inicio - Fecha de inicio del contrato (YYYY-MM-DD)
 * @param {string} [event.body.fecha_fin] - Fecha de fin del contrato (opcional; si se provee, >= fecha_inicio)
 * @param {string} event.body.origen - Punto de partida del recorrido
 * @param {string} event.body.destino - Punto de llegada del recorrido
 * @param {number} event.body.distancia_estimada_km - Distancia estimada en km (debe ser > 0)
 * @param {number} event.body.tarifa_por_km - Tarifa por kilómetro (debe ser > 0)
 * @param {number} event.body.tarifa_por_hora - Tarifa por hora (debe ser >= 0)
 * @param {number} event.body.tarifa_espera - Tarifa por tiempo de espera (debe ser >= 0)
 * @returns {Promise<Object>} Respuesta HTTP 200 con el contrato registrado y todas sus relaciones
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 403 FORBIDDEN_ROLE si el rol autenticado no es "gerente"
 * @throws {Error} 400 si algún campo de validación de negocio falla
 */
export const createContratoController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    const session = await getCurrentSession(authorizationHeader);

    // Validación de seguridad:
    // Solo Gerente de Operaciones puede registrar contratos
    if (session.role !== "gerente") {
      return errorResponse("Solo el Gerente de Operaciones puede registrar contratos", 403, {
        code: "FORBIDDEN_ROLE",
      });
    }

    const body = parseJsonBody(event.body);

    const contratoService = new ContratoService();
    const contrato = await contratoService.createContrato(body);

    return successResponse(contrato, "Contrato registrado correctamente");
  } catch (error) {
    console.error("Error en createContratoController:", error);

    return errorResponse(error.message || "Error al registrar contrato", error.statusCode || 400, {
      code: error.code || "CONTRATO_CREATE_ERROR",
    });
  }
};

/**
 * Obtiene los indicadores agregados del módulo de contratos.
 * Incluye totales, distribución por estado, distribución por tipo de servicio,
 * contratos próximos a vencer (próximos 30 días) y camiones asignados.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @returns {Promise<Object>} Respuesta HTTP 200 con objeto de métricas agregadas
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 500 si ocurre un error interno al consultar la base de datos
 */
export const getIndicadoresController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const contratoService = new ContratoService();
    const indicadores = await contratoService.getIndicadores();
    return successResponse(indicadores, "Indicadores de contratos obtenidos exitosamente.");
  } catch (error) {
    console.error("Error en getIndicadoresController:", error);
    return errorResponse(error.message, error.statusCode || 500);
  }
};

/**
 * Obtiene todos los contratos con filtros opcionales y paginación.
 * Incluye campos calculados de vencimiento: dias_para_vencer, proximo_a_vencer y camiones_asignados.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {Object} [event.queryStringParameters] - Parámetros de consulta opcionales
 * @param {string} [event.queryStringParameters.q] - Texto libre para buscar por código o cliente
 * @param {string} [event.queryStringParameters.estado] - Filtrar por estado (VIGENTE, VENCIDO, etc.)
 * @param {string|number} [event.queryStringParameters.page] - Número de página (default: 1)
 * @param {string|number} [event.queryStringParameters.limit] - Registros por página (default: 10, máx: 100)
 * @param {string} [event.queryStringParameters.order_by] - Campo de ordenamiento (fecha_fin | fecha_inicio | cliente | codigo | estado | created_at)
 * @returns {Promise<Object>} Respuesta HTTP 200 con { data: contratos[], meta: { total, page, limit, total_pages } }
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 500 si ocurre un error interno
 */
export const getAllContratosController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const { q, estado, page, limit, order_by } = event.queryStringParameters || {};
    const contratoService = new ContratoService();
    const result = await contratoService.getAllContratos({ q, estado }, { page, limit, order_by });
    return successResponse(result, SUCCESS_MESSAGES.CONTRATOS_RETRIEVED);
  } catch (error) {
    console.error("Error en getAllContratosController:", error);
    return errorResponse(error.message, error.statusCode || 500);
  }
};

/**
 * Obtiene el detalle completo de un contrato por su ID.
 * Incluye unidades activas asignadas, campos de vencimiento calculados y estado proximo_a_vencer.
 * Requiere autenticación Bearer válida.
 *
 * @param {Object} event - Evento de AWS Lambda
 * @param {Object} event.headers - Headers HTTP de la solicitud
 * @param {string} [event.headers.Authorization] - Token Bearer de autenticación
 * @param {Object} event.pathParameters - Parámetros de ruta
 * @param {string} event.pathParameters.id - ID del contrato a consultar
 * @returns {Promise<Object>} Respuesta HTTP 200 con el contrato completo, o 404 si no existe
 * @throws {Error} 401 si el token es inválido o está ausente
 * @throws {Error} 400 si no se provee el parámetro id en la ruta
 * @throws {Error} 404 si el contrato con el ID indicado no existe
 */
export const getContratoByIdController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    await getCurrentSession(authorizationHeader);

    const { id } = event.pathParameters || {};
    if (!id) {
      return errorResponse("El id del contrato es requerido.", 400);
    }
    const contratoService = new ContratoService();
    const contrato = await contratoService.getContratoById(id);
    if (!contrato) {
      return errorResponse("Contrato no encontrado.", 404);
    }
    return successResponse(contrato, SUCCESS_MESSAGES.CONTRATO_RETRIEVED);
  } catch (error) {
    console.error("Error en getContratoByIdController:", error);
    return errorResponse(error.message, error.statusCode || 500);
  }
};
