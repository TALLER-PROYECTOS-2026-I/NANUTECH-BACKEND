import { ContratoService } from "./contratoService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";
import { SUCCESS_MESSAGES } from "../../shared/constants/successMessages.mjs";
import { getCurrentSession } from "../auth-services/authService.mjs";

/**
 * =========================================================
 * Módulo: Contrato Controller
 * HU: HU14 - Registro de Nuevo Contrato y Reglas de Tarifa
 * Rol permitido: GERENTE
 *
 * Responsabilidades:
 * - Obtener contratos vigentes
 * - Registrar nuevos contratos
 * - Validar autorización por rol
 * - Parsear request body
 *
 * Endpoints:
 * GET /contratos/vigentes
 * POST /contratos
 * =========================================================
 */


/**
 * Convierte el body recibido por Lambda en un objeto JSON.
 * Si el body viene mal formado, retorna un error controlado 400.
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
 * Obtiene todos los contratos vigentes activos.
 *
 * Reglas:
 * - activo = TRUE
 * - estado = VIGENTE
 * - fecha_inicio <= hoy
 * - fecha_fin >= hoy o NULL
 *
 * Response:
 * 200 OK
 * 500 Internal Server Error
 */
export const getAllVigentesController = async (event) => {
  try {
    const contratoService = new ContratoService();
    const contratos = await contratoService.getAllVigentes();
    return successResponse(contratos, SUCCESS_MESSAGES.CONTRATOS_RETRIEVED);
  } catch (error) {
    console.error("Error en getAllVigentesController:", error);
    return errorResponse(error.message, 500);
  }
};

/**
 * Endpoint:
 * POST /contratos
 *
 * Responsabilidad:
 * - Validar que el usuario autenticado tenga rol GERENTE.
 * - Procesar el body recibido desde frontend o Postman.
 * - Delegar la lógica de negocio al ContratoService.
 * - Retornar una respuesta controlada al cliente.
 */
export const createContratoController = async (event) => {
  try {
    // Obtiene el token enviado en el header Authorization.
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;

    // Valida el token y obtiene la sesión actual del usuario.
    const session = await getCurrentSession(authorizationHeader);

    // Regla de seguridad: solo el Gerente de Operaciones puede registrar contratos.
    if (session.role !== "gerente") {
      return errorResponse("Solo el Gerente de Operaciones puede registrar contratos", 403, {
        code: "FORBIDDEN_ROLE",
      });
    }

    // Convierte el body del request de string JSON a objeto JavaScript.
    const body = parseJsonBody(event.body);

    // Instancia el servicio donde se aplican las reglas de negocio de la HU14.
    const contratoService = new ContratoService();
    
    // Registra el contrato usando la capa Service.
    const contrato = await contratoService.createContrato(body);

    // Retorna respuesta exitosa al cliente.
    return successResponse(contrato, "Contrato registrado correctamente");
  } catch (error) {
    console.error("Error en createContratoController:", error);

    // Retorna errores controlados de validación, autorización o procesamiento.
    return errorResponse(error.message || "Error al registrar contrato", error.statusCode || 400, {
      code: error.code || "CONTRATO_CREATE_ERROR",
    });
  }
};

export const getIndicadoresController = async (_event) => {
  try {
    const contratoService = new ContratoService();
    const indicadores = await contratoService.getIndicadores();
    return successResponse(indicadores, "Indicadores de contratos obtenidos exitosamente.");
  } catch (error) {
    console.error("Error en getIndicadoresController:", error);
    return errorResponse(error.message, 500);
  }
};

export const getAllContratosController = async (event) => {
  try {
    const { q, estado, page, limit, order_by } = event.queryStringParameters || {};
    const contratoService = new ContratoService();
    const result = await contratoService.getAllContratos({ q, estado }, { page, limit, order_by });
    return successResponse(result, SUCCESS_MESSAGES.CONTRATOS_RETRIEVED);
  } catch (error) {
    console.error("Error en getAllContratosController:", error);
    return errorResponse(error.message, 500);
  }
};

export const getContratoByIdController = async (event) => {
  try {
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
    return errorResponse(error.message, 500);
  }
};
