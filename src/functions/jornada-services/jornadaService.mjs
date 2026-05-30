import { JornadaRepository } from "./jornadaRepository.mjs";
import { Jornada } from "./jornadaModel.mjs";
import { JornadaValidator } from "../../shared/utils/validators/jornadaValidator.mjs";

const ACTIVE_STATES = new Set(["REGISTRADA", "PENDIENTE", "EN_PROCESO"]);

/**
 * Construye un error tipado para el dominio de jornadas.
 *
 * @param {string} message - Mensaje descriptivo del error
 * @param {number} [statusCode=400] - Código HTTP asociado
 * @param {string} [code="JORNADA_ERROR"] - Código de error interno para el cliente
 * @returns {Error} Error enriquecido con statusCode y code
 */
function createJornadaError(message, statusCode = 400, code = "JORNADA_ERROR") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * Escapa un valor para ser incluido de forma segura en un CSV.
 * Envuelve en comillas dobles si el valor contiene comas, comillas o saltos de línea,
 * escapando las comillas internas duplicándolas (RFC 4180).
 *
 * @param {*} value - Valor a escapar (cualquier tipo; se convierte a string)
 * @returns {string} Valor escapado listo para CSV, o cadena vacía si es null/undefined
 */
const escapeCsv = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Servicio de dominio para la gestión de jornadas de conductores.
 * Coordina la validación de datos, las reglas de negocio y el acceso al repositorio.
 */
export class JornadaService {
  constructor() {
    this.repository = new JornadaRepository();
  }

  /**
   * Crea una nueva jornada verificando que ni el conductor ni la unidad
   * tengan una jornada activa o pendiente en el momento del registro.
   *
   * @param {Object} jornadaData - Datos de la nueva jornada (sin validar)
   * @param {number} jornadaData.conductor_id - ID del conductor asignado
   * @param {number} jornadaData.unidad_id - ID de la unidad/camión asignada
   * @param {number} jornadaData.contrato_id - ID del contrato asociado
   * @param {string} [jornadaData.fecha_jornada] - Fecha de la jornada (default: fecha actual del servidor)
   * @param {string} [jornadaData.origen] - Punto de partida
   * @param {string} [jornadaData.destino] - Punto de llegada
   * @param {number} [jornadaData.km_recorridos] - Kilómetros estimados
   * @param {string} [jornadaData.observaciones] - Observaciones iniciales
   * @returns {Promise<Jornada>} La jornada creada mapeada al modelo de dominio
   * @throws {Error} 400 UNIDAD_CON_JORNADA_ACTIVA si la unidad ya está ocupada
   * @throws {Error} 400 CONDUCTOR_CON_JORNADA_ACTIVA si el conductor ya está ocupado
   */
  async createJornada(jornadaData) {
    const validatedData = JornadaValidator.validateCreateJornada(jornadaData);

    const unidadOcupada = await this.repository.checkUnidadActiva(validatedData.unidad_id);
    if (unidadOcupada) {
      throw createJornadaError(
        "La unidad ya tiene una jornada activa o pendiente.",
        400,
        "UNIDAD_CON_JORNADA_ACTIVA"
      );
    }

    const conductorOcupado = await this.repository.checkConductorActivo(validatedData.conductor_id);
    if (conductorOcupado) {
      throw createJornadaError(
        "El conductor ya tiene una jornada activa o pendiente.",
        400,
        "CONDUCTOR_CON_JORNADA_ACTIVA"
      );
    }

    const createdDb = await this.repository.create(validatedData);
    return Jornada.fromDatabase(createdDb);
  }

  /**
   * Obtiene la jornada activa más reciente de un conductor.
   * Solo considera jornadas en estado REGISTRADA, PENDIENTE o EN_PROCESO.
   * Retorna null cuando no existe jornada activa; el dashboard usa este valor
   * para decidir si mostrar o no la sección de jornada actual.
   *
   * @param {string|number} conductorId - ID del conductor a consultar
   * @returns {Promise<Jornada|null>} La jornada activa mapeada al modelo, o null si no existe
   */
  async getCurrentJornada(conductorId) {
    const validatedConductorId = JornadaValidator.validateConductorId(conductorId);
    const jornada = await this.repository.findCurrentByConductorId(validatedConductorId);

    // El dashboard deja de mostrar jornada cuando ya no existe una pendiente o en proceso.
    return jornada ? Jornada.fromDatabase(jornada) : null;
  }

  /**
   * Inicia el turno de una jornada, cambiando su estado de REGISTRADA o PENDIENTE
   * a EN_PROCESO. La hora de inicio la fija el servidor en el momento de la llamada,
   * sin aceptar valores del cliente.
   *
   * @param {Object} payload - Datos de inicio de turno
   * @param {number} payload.jornada_id - ID de la jornada a iniciar
   * @returns {Promise<Jornada>} La jornada actualizada con hora_inicio y estado EN_PROCESO
   * @throws {Error} 404 JORNADA_NOT_FOUND si la jornada no existe
   * @throws {Error} 400 JORNADA_ALREADY_STARTED si la jornada ya está EN_PROCESO
   * @throws {Error} 400 JORNADA_INVALID_STATE si el estado actual no permite iniciar
   */
  async startTurn(payload) {
    const { jornada_id: jornadaId } = JornadaValidator.validateStartTurn(payload);
    const jornada = await this.repository.findById(jornadaId);

    if (!jornada) {
      throw createJornadaError("La jornada no existe.", 404, "JORNADA_NOT_FOUND");
    }

    // Solo se permite pasar de REGISTRADA/PENDIENTE a EN_PROCESO y la hora de inicio la fija el servidor.
    if (jornada.estado === "EN_PROCESO") {
      throw createJornadaError("La jornada ya fue iniciada.", 400, "JORNADA_ALREADY_STARTED");
    }

    if (!ACTIVE_STATES.has(jornada.estado)) {
      throw createJornadaError(
        "La jornada no puede iniciarse desde su estado actual.",
        400,
        "JORNADA_INVALID_STATE"
      );
    }

    if (!["REGISTRADA", "PENDIENTE"].includes(jornada.estado)) {
      throw createJornadaError(
        "La jornada solo puede iniciarse desde REGISTRADA o PENDIENTE.",
        400,
        "JORNADA_INVALID_STATE"
      );
    }

    const updated = await this.repository.startTurn(jornadaId);
    return Jornada.fromDatabase(updated);
  }

  /**
   * Finaliza el turno de una jornada EN_PROCESO, cambiando su estado a COMPLETADA.
   * El servidor fija la hora de fin y el repositorio calcula la duración total en segundos.
   * Solo se pueden cerrar jornadas que estén exactamente en estado EN_PROCESO.
   *
   * @param {Object} payload - Datos de cierre de turno
   * @param {number} payload.jornada_id - ID de la jornada a finalizar
   * @param {string} [payload.observaciones] - Observaciones finales opcionales del turno
   * @returns {Promise<Jornada>} La jornada finalizada con hora_fin y duración calculada
   * @throws {Error} 404 JORNADA_NOT_FOUND si la jornada no existe
   * @throws {Error} 400 JORNADA_NOT_IN_PROGRESS si la jornada no está EN_PROCESO
   */
  async finishTurn(payload) {
    const { jornada_id: jornadaId, observaciones } = JornadaValidator.validateFinishTurn(payload);
    const jornada = await this.repository.findById(jornadaId);

    if (!jornada) {
      throw createJornadaError("La jornada no existe.", 404, "JORNADA_NOT_FOUND");
    }

    // Solo se puede cerrar una jornada EN_PROCESO; el servidor fija la hora_fin y calcula la duración total.
    if (jornada.estado !== "EN_PROCESO") {
      throw createJornadaError(
        "La jornada solo puede finalizarse cuando está EN_PROCESO.",
        400,
        "JORNADA_NOT_IN_PROGRESS"
      );
    }

    const updated = await this.repository.finishTurn(jornadaId, observaciones);
    return Jornada.fromDatabase(updated);
  }

  /**
   * Obtiene todas las jornadas aplicando los filtros indicados.
   * Delega directamente en el repositorio sin transformar al modelo Jornada,
   * ya que esta vista incluye campos calculados y de JOIN no presentes en el modelo base.
   *
   * @param {Object} [filtros={}] - Criterios de búsqueda
   * @param {string} [filtros.q] - Texto libre (busca en placa y nombre del conductor)
   * @param {string} [filtros.conductor_id] - ID exacto del conductor
   * @param {string} [filtros.fecha_desde] - Fecha mínima de jornada (YYYY-MM-DD)
   * @param {string} [filtros.fecha_hasta] - Fecha máxima de jornada (YYYY-MM-DD)
   * @returns {Promise<Object[]>} Lista de jornadas con campos enriquecidos (conductor, camión, contrato, horario)
   */
  async getAllJornadas(filtros = {}) {
    return this.repository.findAll(filtros);
  }
  /**
   * Obtiene el historial gerencial de jornadas con métricas operativas,
   * alertas registradas y observaciones para auditoría.
   * Permite filtrar por conductor, estado de alerta,
   * rango de fechas y observaciones.
   *
   * Métricas incluidas:
   * - Total de jornadas
   * - Total de alertas de pánico
   * - Total de alertas de auxilio mecánico
   * - Jornadas con observaciones
   * - Kilometraje promedio
   *
   * @param {Object} [filtros={}] - Filtros de búsqueda
   * @param {string} [filtros.conductor] - Nombre del conductor
   * @param {string} [filtros.estado_alerta] - Tipo de alerta (PANICO | AUXILIO)
   * @param {string} [filtros.fecha_desde] - Fecha mínima de jornada
   * @param {string} [filtros.fecha_hasta] - Fecha máxima de jornada
   * @param {string} [filtros.observaciones] - Texto libre de observaciones
   * @returns {Promise<Object>} Resumen gerencial y listado detallado
   */
  async getManagerHistory(filtros = {}) {
    const summary = await this.repository.getManagerSummary(filtros);
    const details = await this.repository.getManagerHistory(filtros);

    return {
      resumen: {
        total_jornadas: Number(summary.total_jornadas || 0),
        alertas_panico: Number(summary.alertas_panico || 0),
        auxilios_mecanicos: Number(summary.auxilios_mecanicos || 0),
        jornadas_con_observaciones: Number(summary.jornadas_con_observaciones || 0),
        km_promedio: Number(summary.km_promedio || 0),
      },
      registros: details,
    };
  }
  /**
   * Genera el contenido de un archivo CSV con todas las jornadas que coincidan
   * con los filtros aplicados. Los campos se escapan según RFC 4180.
   *
   * Columnas del CSV: ID Jornada, Fecha, Conductor, Placa del Camion, Contrato,
   * Hora Inicio, Hora Fin, Duracion Total, KM Recorridos, Estado, Observaciones.
   *
   * @param {Object} [filtros={}] - Filtros de exportación (mismos parámetros que getAllJornadas)
   * @param {string} [filtros.q] - Texto libre
   * @param {string} [filtros.conductor_id] - ID del conductor
   * @param {string} [filtros.fecha_desde] - Fecha inicio del rango (YYYY-MM-DD)
   * @param {string} [filtros.fecha_hasta] - Fecha fin del rango (YYYY-MM-DD)
   * @returns {Promise<string>} Contenido CSV listo para escribir en el body de la respuesta HTTP
   */
  async generateCsv(filtros = {}) {
    const rows = await this.repository.exportAll(filtros);

    const header =
      "ID Jornada,Fecha,Conductor,Placa del Camion,Contrato,Hora Inicio,Hora Fin,Duracion Total,KM Recorridos,Estado,Observaciones";

    const csvRows = rows.map((row) =>
      [
        escapeCsv(row.id),
        escapeCsv(row.fecha),
        escapeCsv(row.conductor),
        escapeCsv(row.placa),
        escapeCsv(row.contrato),
        escapeCsv(row.hora_inicio),
        escapeCsv(row.hora_fin),
        escapeCsv(row.duracion_total),
        escapeCsv(row.km_recorridos),
        escapeCsv(row.estado),
        escapeCsv(row.observaciones),
      ].join(",")
    );

    return [header, ...csvRows].join("\n");
  }
  /**
   * Obtiene métricas del historial gerencial.
   */
  async getHistorialMetrics(filtros = {}) {
    return this.repository.getHistorialMetrics(filtros);
  }

  /**
   * Obtiene detalle de alerta por jornada.
   */
  async getAlertDetail(jornadaId) {
    return this.repository.getAlertDetail(jornadaId);
  }

  /**
   * Obtiene el historial de jornadas completadas del conductor autenticado.
   * El conductor_id se注入 desde el token (filtros.conductor_id).
   * Valida que el período sea válido (semana|mes|todas).
   *
   * @param {Object} filtros - Criterios de búsqueda
   * @param {string} filtros.conductor_id - ID del conductor (del token)
   * @param {string} [filtros.periodo] - 'semana' | 'mes' | 'todas'
   * @param {string} [filtros.observaciones] - 'todas' | 'con' | 'sin'
   * @returns {Promise<Object[]>} Lista de jornadas del conductor
   * @throws {Error} 400 si el período es inválido
   */
  async getDriverHistory(filtros) {
    const { conductor_id, periodo, observaciones } = filtros;

    if (periodo && !["semana", "mes", "todas"].includes(periodo)) {
      throw createJornadaError(
        "El período debe ser: semana, mes o todas.",
        400,
        "INVALID_PERIOD"
      );
    }

    if (observaciones && !["todas", "con", "sin"].includes(observaciones)) {
      throw createJornadaError(
        "El filtro de observaciones debe ser: todas, con o sin.",
        400,
        "INVALID_OBSERVACIONES_FILTER"
      );
    }

    return this.repository.findDriverHistory({
      conductor_id,
      periodo: periodo || "todas",
      observaciones: observaciones || "todas",
    });
  }

  /**
   * Obtiene las métricas de resumen del conductor autenticado.
   * El conductor_id se inyecta desde el token.
   * Valida que el período sea válido (semana|mes|todas).
   *
   * @param {Object} filtros - Criterios de búsqueda
   * @param {string} filtros.conductor_id - ID del conductor (del token)
   * @param {string} [filtros.periodo] - 'semana' | 'mes' | 'todas'
   * @returns {Promise<Object>} Métricas del conductor
   * @throws {Error} 400 si el período es inválido
   */
  async getDriverMetrics(filtros) {
    const { conductor_id, periodo } = filtros;

    if (periodo && !["semana", "mes", "todas"].includes(periodo)) {
      throw createJornadaError(
        "El período debe ser: semana, mes o todas.",
        400,
        "INVALID_PERIOD"
      );
    }

    const metrics = await this.repository.getDriverMetrics({
      conductor_id,
      periodo: periodo || "todas",
    });

    return {
      total_jornadas: Number(metrics.total_jornadas || 0),
      horas_trabajadas: Number(metrics.horas_trabajadas || 0),
      km_recorridos: Number(metrics.km_recorridos || 0),
      con_observaciones: Number(metrics.con_observaciones || 0),
    };
  }
}
