import { ContratoRepository } from "./contratoRepository.mjs";
import { Contrato } from "./contratoModel.mjs";
import { ContratoValidator } from "../../shared/utils/validators/contratoValidator.mjs";

export class ContratoService {
  constructor() {
    this.contratoRepository = new ContratoRepository();
  }
  async getAllVigentes() {
    const rows = await this.contratoRepository.getAllVigentes();
    return Contrato.fromDatabaseList(rows);
  }

  /**
   * Registra un nuevo contrato.
   *
   * Flujo:
   * 1. Valida reglas de negocio.
   * 2. Envía información al Repository.
   * 3. Retorna contrato transformado.
   */
  async createContrato(data) {
    // Aplica validaciones de negocio
    ContratoValidator.validateContrato(data);

    // Registra contrato en base de datos
    const row = await this.contratoRepository.createContrato(data);

    // Transforma respuesta usando el modelo Contrato
    return Contrato.fromDatabase(row);
  }
}