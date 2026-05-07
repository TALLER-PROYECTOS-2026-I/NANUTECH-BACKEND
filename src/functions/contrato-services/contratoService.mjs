import { ContratoRepository } from "./contratoRepository.mjs";
import { Contrato } from "./contratoModel.mjs";

/**
 * Servicio de dominio para la gestión de contratos de transporte.
 * Centraliza la validación de reglas de negocio y coordina el acceso al repositorio.
 */
export class ContratoService {
  constructor() {
    this.contratoRepository = new ContratoRepository();
  }

  /**
   * Obtiene todos los contratos actualmente vigentes.
   * Delega el filtrado al repositorio y mapea las filas al modelo de dominio Contrato.
   *
   * @returns {Promise<Contrato[]>} Lista de contratos vigentes como instancias del modelo
   */
  async getAllVigentes() {
    const rows = await this.contratoRepository.getAllVigentes();
    return Contrato.fromDatabaseList(rows);
  }

  /**
   * Crea un nuevo contrato validando las reglas de negocio antes de persistir.
   * La persistencia incluye contrato principal, ruta y tarifas en una transacción atómica.
   *
   * @param {Object} data - Datos del contrato a registrar
   * @param {string} data.cliente - Nombre del cliente
   * @param {string} data.ruc - RUC del cliente (11 dígitos numéricos)
   * @param {string} data.tipo_servicio - Tipo de servicio (POR_VIAJE | POR_HORA | POR_TONELADA | POR_KM | MENSUAL)
   * @param {string} data.fecha_inicio - Fecha de inicio (YYYY-MM-DD)
   * @param {string} [data.fecha_fin] - Fecha de fin (opcional; si se provee, no puede ser anterior a fecha_inicio)
   * @param {string} data.origen - Punto de partida del recorrido
   * @param {string} data.destino - Punto de llegada del recorrido
   * @param {number} data.distancia_estimada_km - Distancia estimada en km (debe ser > 0)
   * @param {number} data.tarifa_por_km - Tarifa por kilómetro (debe ser > 0)
   * @param {number} data.tarifa_por_hora - Tarifa por hora (debe ser >= 0)
   * @param {number} data.tarifa_espera - Tarifa de espera (debe ser >= 0)
   * @returns {Promise<Contrato>} El contrato creado con todas sus relaciones mapeado al modelo
   * @throws {Error} Con mensaje descriptivo en español si alguna validación de negocio falla
   */
  async createContrato(data) {
    this.validateContrato(data);

    const row = await this.contratoRepository.createContrato(data);

    return Contrato.fromDatabase(row);
  }

  /**
   * Valida los datos del contrato contra las reglas de negocio del dominio.
   * Lanza un Error con mensaje descriptivo al encontrar la primera violación.
   *
   * Reglas aplicadas en orden:
   * - cliente no puede estar vacío
   * - RUC: obligatorio, exactamente 11 dígitos numéricos, no puede ser 00000000000
   * - tipo_servicio: debe ser uno de los cinco valores permitidos
   * - fecha_inicio es obligatoria
   * - fecha_fin, si se provee, no puede ser anterior a fecha_inicio
   * - origen y destino no pueden estar vacíos
   * - distancia_estimada_km debe ser mayor a 0
   * - tarifa_por_km debe ser mayor a 0
   * - tarifa_por_hora es obligatoria y debe ser >= 0
   * - tarifa_espera es obligatoria y debe ser >= 0
   *
   * @param {Object} data - Datos a validar (misma estructura que createContrato)
   * @throws {Error} Con mensaje descriptivo si alguna regla es violada
   */
  validateContrato(data) {
    if (!data.cliente || data.cliente.trim() === "") {
      throw new Error("El nombre del cliente no puede estar vacío");
    }

    const ruc = String(data.ruc || "").trim();

    if (!ruc) {
      throw new Error("El RUC es obligatorio");
    }

    if (ruc.length !== 11) {
      throw new Error("El RUC debe tener exactamente 11 dígitos");
    }

    if (!/^\d{11}$/.test(ruc)) {
      throw new Error("El RUC debe contener solo dígitos numéricos");
    }

    if (ruc === "00000000000") {
      throw new Error("El RUC ingresado no es válido");
    }

    if (!data.tipo_servicio) {
      throw new Error("Tipo de Servicio es obligatorio");
    }

    const tiposPermitidos = [
      "POR_VIAJE",
      "POR_HORA",
      "POR_TONELADA",
      "POR_KM",
      "MENSUAL",
    ];

    if (!tiposPermitidos.includes(data.tipo_servicio)) {
      throw new Error("El tipo de servicio no es válido");
    }

    if (!data.fecha_inicio) {
      throw new Error("La fecha de inicio es obligatoria");
    }

    if (data.fecha_fin && data.fecha_fin < data.fecha_inicio) {
      throw new Error("La fecha fin no puede ser menor que la fecha inicio");
    }

    if (!data.origen || data.origen.trim() === "") {
      throw new Error("El punto de partida es obligatorio");
    }

    if (!data.destino || data.destino.trim() === "") {
      throw new Error("El punto de llegada es obligatorio");
    }

    if (
      data.distancia_estimada_km === undefined ||
      data.distancia_estimada_km === null ||
      data.distancia_estimada_km === "" ||
      Number(data.distancia_estimada_km) <= 0
    ) {
      throw new Error("La distancia debe ser mayor a 0");
    }

    if (
      data.tarifa_por_km === undefined ||
      data.tarifa_por_km === null ||
      data.tarifa_por_km === "" ||
      Number(data.tarifa_por_km) <= 0
    ) {
      throw new Error("La tarifa debe ser un valor positivo");
    }

    if (
      data.tarifa_por_hora === undefined ||
      data.tarifa_por_hora === null ||
      data.tarifa_por_hora === ""
    ) {
      throw new Error("La tarifa por hora es obligatoria");
    }

    if (Number(data.tarifa_por_hora) < 0) {
      throw new Error("La tarifa por hora debe ser mayor o igual a 0");
    }

    if (
      data.tarifa_espera === undefined ||
      data.tarifa_espera === null ||
      data.tarifa_espera === ""
    ) {
      throw new Error("La tarifa por espera es obligatoria");
    }

    if (Number(data.tarifa_espera) < 0) {
      throw new Error("La tarifa por espera debe ser mayor o igual a 0");
    }
  }

  /**
   * Obtiene los indicadores agregados del módulo de contratos mediante CTEs en SQL.
   * Incluye totales por estado, por tipo de servicio, camiones asignados activos
   * y contratos con fecha_fin dentro de los próximos 30 días.
   *
   * @returns {Promise<Object>} Objeto con todas las métricas agregadas del módulo
   */
  async getIndicadores() {
    return this.contratoRepository.getIndicadores();
  }

  /**
   * Obtiene contratos paginados con filtros opcionales.
   * Normaliza los parámetros de paginación y retorna metadatos junto con los datos.
   *
   * @param {Object} [filtros={}] - Filtros de búsqueda
   * @param {string} [filtros.q] - Texto libre (busca en código y cliente)
   * @param {string} [filtros.estado] - Estado exacto del contrato (VIGENTE, VENCIDO, etc.)
   * @param {Object} [pagination={}] - Parámetros de paginación y ordenamiento
   * @param {string|number} [pagination.page=1] - Número de página actual
   * @param {string|number} [pagination.limit=10] - Registros por página (máx: 100)
   * @param {string} [pagination.order_by='fecha_fin'] - Campo para ordenar (ver ALLOWED_ORDER_FIELDS en repositorio)
   * @returns {Promise<{ data: Object[], meta: { total: number, page: number, limit: number, total_pages: number } }>}
   */
  async getAllContratos(filtros = {}, pagination = {}) {
    const { rows, total, page, limit } = await this.contratoRepository.findAll(filtros, pagination);
    return {
      data: rows,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene el detalle completo de un contrato por su ID.
   * Incluye unidades activas asignadas, campos calculados de vencimiento
   * y el flag proximo_a_vencer (vence dentro de los próximos 30 días).
   *
   * @param {string|number} id - ID del contrato a consultar
   * @returns {Promise<Object|null>} Detalle completo del contrato o null si no existe
   */
  async getContratoById(id) {
    return this.contratoRepository.findById(id);
  }
}
