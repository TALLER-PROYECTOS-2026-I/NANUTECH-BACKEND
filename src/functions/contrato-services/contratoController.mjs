import { ContratoService } from "./contratoService.mjs";
import { successResponse, errorResponse } from "../../shared/utils/response/response.mjs";
import { SUCCESS_MESSAGES } from "../../shared/constants/successMessages.mjs";

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
    const result = await contratoService.getAllContratos(
      { q, estado },
      { page, limit, order_by },
    );
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
