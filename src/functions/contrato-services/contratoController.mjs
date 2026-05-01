import { ContratoService } from "./contratoService.mjs";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/response/response.mjs";
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
// HU07 - Obtener detalle
export const getDetalleController = async (event) => {
  try {
    const service = new ContratoService();
    const id = event.pathParameters.id;

    const data = await service.getDetalleContrato(id);

    return successResponse(data, "Detalle de contrato obtenido");
  } catch (error) {
    return errorResponse(error.message, 500);
  }
};

// HU07 - Actualizar contrato
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

// HU07 - Asignar unidades
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
