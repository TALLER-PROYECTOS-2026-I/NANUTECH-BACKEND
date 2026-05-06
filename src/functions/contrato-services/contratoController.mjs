import { ContratoService } from "./contratoService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";
import { SUCCESS_MESSAGES } from "../../shared/constants/successMessages.mjs";
import { getCurrentSession } from "../auth-services/authService.mjs";

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

export const getAllVigentesController = async (event) => {
  try {
    const contratoService = new ContratoService();
    const contratos = await contratoService.getAllVigentes();
    return successResponse(contratos, SUCCESS_MESSAGES.CONTRATOS_RETRIEVED);
  } catch (error) {
    return errorResponse(error.message, 500);
  }
};

// ✅ SE MANTIENE (develop - HU14)
export const createContratoController = async (event) => {
  try {
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;

    const session = await getCurrentSession(authorizationHeader);

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
    return errorResponse(error.message || "Error al registrar contrato", error.statusCode || 400);
  }
};

export const getIndicadoresController = async () => {
  try {
    const contratoService = new ContratoService();
    const indicadores = await contratoService.getIndicadores();
    return successResponse(indicadores, "Indicadores de contratos obtenidos exitosamente.");
  } catch (error) {
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
    return errorResponse(error.message, 500);
  }
};

export const getContratoByIdController = async (event) => {
  try {
    const { id } = event.pathParameters || {};

    if (!id) return errorResponse("El id del contrato es requerido.", 400);

    const contratoService = new ContratoService();
    const contrato = await contratoService.getContratoById(id);

    if (!contrato) return errorResponse("Contrato no encontrado.", 404);

    return successResponse(contrato, SUCCESS_MESSAGES.CONTRATO_RETRIEVED);
  } catch (error) {
    return errorResponse(error.message, 500);
  }
};

// 🔥 HU07 (SE MANTIENE)
export const updateContratoController = async (event) => {
  try {
    const service = new ContratoService();
    const id = event.pathParameters.id;
    const body = JSON.parse(event.body);
    const ip = event.requestContext.http.sourceIp;

    const data = await service.updateContrato(id, body, ip);

    return successResponse(data, "Contrato actualizado");
  } catch (error) {
    return errorResponse(error.message, 500);
  }
};

// 🔥 HU07 (SE MANTIENE)
export const assignUnidadesController = async (event) => {
  try {
    const service = new ContratoService();
    const id = event.pathParameters.id;
    const body = JSON.parse(event.body);

    const data = await service.assignUnidades(id, body.unidades);

    return successResponse(data, "Unidades asignadas");
  } catch (error) {
    return errorResponse(error.message, 500);
  }
};
