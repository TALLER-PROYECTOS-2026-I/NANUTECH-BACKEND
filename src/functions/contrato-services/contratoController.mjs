import { ContratoService } from "./contratoService.mjs";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/response/response.mjs";
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


export const createContratoController = async (event) => {
  try {
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

    const session = await getCurrentSession(authorizationHeader);

    // Validación de seguridad:
    // Solo Gerente de Operaciones puede registrar contratos
    if (session.role !== "gerente") {
      return errorResponse(
        "Solo el Gerente de Operaciones puede registrar contratos",
        403,
        { code: "FORBIDDEN_ROLE" },
      );
    }

    const body = parseJsonBody(event.body);

    const contratoService = new ContratoService();
    const contrato = await contratoService.createContrato(body);

    return successResponse(contrato, "Contrato registrado correctamente");
  } catch (error) {
    console.error("Error en createContratoController:", error);

    return errorResponse(
      error.message || "Error al registrar contrato",
      error.statusCode || 400,
      { code: error.code || "CONTRATO_CREATE_ERROR" },
    );
  }
};
