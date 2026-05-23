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
 * HU21 - Tipos de falla permitidos para Auxilio Mecánico.
 *
 * Esta lista viene directamente del criterio de aceptación de HU21,
 * donde el chofer debe seleccionar una falla antes de confirmar
 * la solicitud de auxilio.
 */
const FALLAS_VALIDAS = new Set([
  "Falla de Motor",
  "Pinchazo/Llantas",
  "Fallo en frenos",
  "Problema eléctrico",
  "Falta de combustible",
  "Problema de transmisión",
  "Otro",
]);

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function validateRequired(value, field) {
  if (value === undefined || value === null || value === "") {
    throw createAlertaError(
      `El campo ${field} es requerido.`,
      400,
      "FIELD_REQUIRED"
    );
  }
}

function validateCoordinates(latitud, longitud) {
  const lat = Number(latitud);
  const lng = Number(longitud);

  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    throw createAlertaError("La latitud es inválida.", 400, "INVALID_LATITUDE");
  }

  if (Number.isNaN(lng) || lng < -180 || lng > 180) {
    throw createAlertaError("La longitud es inválida.", 400, "INVALID_LONGITUDE");
  }

  return { latitud: lat, longitud: lng };
}

function buildCodigo(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}





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

  /**
   * HU21 - Registra una alerta SOS desde la app móvil.
   *
   * Reglas:
   * - Solo se permite si la jornada está EN_PROCESO.
   * - Debe guardar coordenadas GPS.
   * - Debe quedar como PANICO, ACTIVA y CRITICA.
   * - Activa bloqueo del sistema por seguridad.
   *
   * @param {Object} data - Payload enviado por la app.
   * @returns {Promise<Object>} Alerta creada con mensaje de bloqueo.
   */
  async registrarSos(data) {
    validateRequired(data.jornada_id, "jornada_id");
    validateRequired(data.conductor_id, "conductor_id");
    validateRequired(data.latitud, "latitud");
    validateRequired(data.longitud, "longitud");

    if (!isValidUuid(data.jornada_id)) {
      throw createAlertaError(
        "El campo jornada_id debe ser UUID válido.",
        400,
        "INVALID_JORNADA_ID"
      );
    }

    if (!isValidUuid(data.conductor_id)) {
      throw createAlertaError(
        "El campo conductor_id debe ser UUID válido.",
        400,
        "INVALID_CONDUCTOR_ID"
      );
    }

    const jornada = await this.repository.findJornadaEnProceso(
      data.jornada_id,
      data.conductor_id
    );

    if (!jornada) {
      throw createAlertaError(
        "La alerta SOS solo puede registrarse con una jornada en estado EN_PROCESO.",
        409,
        "JORNADA_NOT_IN_PROGRESS"
      );
    }

    const coords = validateCoordinates(data.latitud, data.longitud);

    const alerta = await this.repository.createAlerta({
      codigo: data.event_id_cliente || buildCodigo("SOS"),
      jornada_id: data.jornada_id,
      tipo: "PANICO",
      estado: "ACTIVA",
      severidad: "CRITICA",
      detalle:
        data.detalle ||
        "Alerta SOS generada desde la app móvil del chofer.",
      tipo_falla_mecanica: null,
      latitud: coords.latitud,
      longitud: coords.longitud,
      direccion: data.direccion || null,
      fecha_hora: data.timestamp_local || null,
      bloqueo_sos_activo: true,
    });

    return {
      ...alerta,
      conductor_id: data.conductor_id,
      unidad_placa: jornada.unidad_placa,
      sistema_bloqueado: true,
      mensaje_bloqueo:
        "¡ALERTA SOS! Ubicación enviada al administrador. Sistema bloqueado por seguridad.",
    };
  }

  /**
   * HU21 - Registra una solicitud de Auxilio Mecánico desde la app móvil.
   *
   * Reglas:
   * - Solo se permite si la jornada está EN_PROCESO.
   * - Debe registrar tipo de falla.
   * - Debe guardar coordenadas GPS.
   * - No bloquea el sistema como el SOS.
   *
   * @param {Object} data - Payload enviado por la app.
   * @returns {Promise<Object>} Alerta de auxilio creada.
   */
  async registrarAuxilio(data) {
    validateRequired(data.jornada_id, "jornada_id");
    validateRequired(data.conductor_id, "conductor_id");
    validateRequired(data.tipo_falla_mecanica, "tipo_falla_mecanica");
    validateRequired(data.latitud, "latitud");
    validateRequired(data.longitud, "longitud");

    if (!isValidUuid(data.jornada_id)) {
      throw createAlertaError(
        "El campo jornada_id debe ser UUID válido.",
        400,
        "INVALID_JORNADA_ID"
      );
    }

    if (!isValidUuid(data.conductor_id)) {
      throw createAlertaError(
        "El campo conductor_id debe ser UUID válido.",
        400,
        "INVALID_CONDUCTOR_ID"
      );
    }

    if (!FALLAS_VALIDAS.has(data.tipo_falla_mecanica)) {
      throw createAlertaError(
        "Tipo de falla inválido.",
        400,
        "INVALID_FAILURE_TYPE"
      );
    }

    const jornada = await this.repository.findJornadaEnProceso(
      data.jornada_id,
      data.conductor_id
    );

    if (!jornada) {
      throw createAlertaError(
        "El auxilio mecánico solo puede registrarse con una jornada en estado EN_PROCESO.",
        409,
        "JORNADA_NOT_IN_PROGRESS"
      );
    }

    const coords = validateCoordinates(data.latitud, data.longitud);

    const alerta = await this.repository.createAlerta({
      codigo: data.event_id_cliente || buildCodigo("AUX"),
      jornada_id: data.jornada_id,
      tipo: "AUXILIO_MECANICO",
      estado: "ACTIVA",
      severidad: "ALTA",
      detalle:
        data.detalle ||
        "Solicitud de auxilio mecánico generada desde la app móvil.",
      tipo_falla_mecanica: data.tipo_falla_mecanica,
      latitud: coords.latitud,
      longitud: coords.longitud,
      direccion: data.direccion || null,
      fecha_hora: data.timestamp_local || null,
      bloqueo_sos_activo: false,
    });

    return {
      ...alerta,
      conductor_id: data.conductor_id,
      unidad_placa: jornada.unidad_placa,
      mensaje: "Auxilio Mecánico Solicitado. Tu solicitud ha sido enviada.",
    };
  }


}
