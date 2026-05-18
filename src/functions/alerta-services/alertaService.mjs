import { AlertaRepository } from "./alertaRepository.mjs";
import { Alerta } from "./alertaModel.mjs";

/**
 * Estados válidos para la transición vía PATCH /alertas/{id}/estado.
 * Solo se permite EN_PROCESO o RESUELTA en este endpoint.
 *
 * @type {Set<string>}
 */
const ESTADOS_VALIDOS_AUXILIO = new Set(["EN_PROCESO", "RESUELTA"]);

/**
 * Construye un error tipado para el dominio de alertas.
 *
 * @param {string} message - Mensaje descriptivo del error
 * @param {number} [statusCode=400] - Código HTTP asociado
 * @param {string} [code="ALERTA_ERROR"] - Código de error interno para el cliente
 * @returns {Error} Error enriquecido con statusCode y code
 */
function createAlertaError(message, statusCode = 400, code = "ALERTA_ERROR") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * Servicio de dominio para la gestión de alertas y emergencias.
 * Coordina las reglas de negocio, validaciones y el acceso al repositorio.
 *
 * @class AlertaService
 */
export class AlertaService {
  constructor() {
    this.repository = new AlertaRepository();
  }

  /**
   * Obtiene los indicadores agregados del panel de alertas.
   * Retorna contadores de pánico activo, auxilios pendientes,
   * alertas resueltas y la bandera de pánico activo.
   *
   * @returns {Promise<Object>} Objeto plano con 4 campos:
   *   panico_activas, auxilio_pendientes, total_resueltas, tiene_panico_activo
   */
  async getIndicadores() {
    return this.repository.getIndicadores();
  }

  /**
   * Obtiene todas las alertas no resueltas con sus relaciones de
   * conductor y unidad, aplicando filtros opcionales.
   *
   * @param {Object} [filtros={}] - Criterios de filtrado
   * @param {string} [filtros.tipo] - Tipo de alerta a filtrar
   * @param {string} [filtros.estado] - Estado operativo a filtrar
   * @returns {Promise<Alerta[]>} Lista de alertas mapeadas al modelo de dominio
   */
  async getAlertasActivas(filtros = {}) {
    const rows = await this.repository.findActivas(filtros);
    return Alerta.fromDatabaseList(rows);
  }

  /**
   * Resuelve una alerta cambiando su estado a RESUELTA.
   * Valida que la alerta exista y que no haya sido resuelta previamente.
   *
   * @param {string} id - UUID de la alerta
   * @param {Object} [data={}] - Datos opcionales de resolución
   * @param {string} [data.detalle_resolucion] - Detalle de cómo se resolvió
   * @param {string} [data.servicio_tecnico_realizado] - Servicio técnico aplicado
   * @returns {Promise<Alerta>} Alerta actualizada mapeada al modelo de dominio
   * @throws {Error} 404 ALERTA_NOT_FOUND si la alerta no existe
   * @throws {Error} 400 ALERTA_YA_RESUELTA si la alerta ya está resuelta
   */
  async resolverAlerta(id, data = {}) {
    const alerta = await this.repository.findById(id);

    if (!alerta) {
      throw createAlertaError("Alerta no encontrada.", 404, "ALERTA_NOT_FOUND");
    }

    if (alerta.estado === "RESUELTA") {
      throw createAlertaError(
        "La alerta ya fue resuelta.",
        400,
        "ALERTA_YA_RESUELTA"
      );
    }

    const updated = await this.repository.resolverAlerta(id, data);
    return Alerta.fromDatabase(updated);
  }

  /**
   * Actualiza el estado operativo de una alerta de auxilio mecánico.
   * Solo aplica para alertas de tipo AUXILIO_MECANICO y estados
   * permitidos: EN_PROCESO o RESUELTA.
   *
   * @param {string} id - UUID de la alerta
   * @param {string} nuevoEstado - Estado objetivo (EN_PROCESO | RESUELTA)
   * @returns {Promise<Alerta>} Alerta actualizada mapeada al modelo de dominio
   * @throws {Error} 404 ALERTA_NOT_FOUND si la alerta no existe
   * @throws {Error} 400 SOLO_AUXILIO_MECANICO si el tipo no es AUXILIO_MECANICO
   * @throws {Error} 400 ESTADO_INVALIDO si el estado no es EN_PROCESO ni RESUELTA
   */
  async actualizarEstado(id, nuevoEstado) {
    const alerta = await this.repository.findById(id);

    if (!alerta) {
      throw createAlertaError("Alerta no encontrada.", 404, "ALERTA_NOT_FOUND");
    }

    if (alerta.tipo !== "AUXILIO_MECANICO") {
      throw createAlertaError(
        "Solo aplica para auxilios mecánicos.",
        400,
        "SOLO_AUXILIO_MECANICO"
      );
    }

    if (!ESTADOS_VALIDOS_AUXILIO.has(nuevoEstado)) {
      throw createAlertaError(
        "Estado inválido. Solo se permite EN_PROCESO o RESUELTA.",
        400,
        "ESTADO_INVALIDO"
      );
    }

    const updated = await this.repository.actualizarEstado(id, nuevoEstado);
    return Alerta.fromDatabase(updated);
  }
}
