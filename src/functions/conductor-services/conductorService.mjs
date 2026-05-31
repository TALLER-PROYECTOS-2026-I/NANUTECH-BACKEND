// Repository encargado de consultas a BD
import { ConductorRepository } from "./conductorRepository.mjs";
import {
  createConductorUserWithCognito,
  deleteConductorUserWithCognito,
} from "../auth-services/authCognitoProvider.mjs";
// Modelo de entidad Conductor
import { Conductor } from "./conductorModel.mjs";

/**
 * Service encargado de manejar la lógica de negocio relacionada a conductores.
 *
 * Flujo:
 * Controller -> Service -> Repository
 */
export class ConductorService {
  /**
   * Constructor del service.
   *
   * Inicializa el repository utilizado para consultas a base de datos.
   */
  constructor() {
    this.conductorRepository = new ConductorRepository();
  }

  /**
   * Obtiene todos los conductores activos.
   *
   * Flujo:
   * - Consulta datos desde repository
   * - Convierte resultados usando el modelo
   * - Retorna lista estructurada
   */
  async getAllActiveConductores() {
    // Obtiene filas desde BD
    const rows = await this.conductorRepository.getAllActive();

    // Convierte filas en objetos Conductor
    return Conductor.fromDatabaseList(rows);
  }

  /**
   * Realiza redondeo aritmético simple a un decimal.
   *
   * Ejemplos:
   * 12.44 -> 12.4
   * 12.45 -> 12.5
   * 12.46 -> 12.5
   *
   * Utilizado para:
   * - horas totales
   * - promedios de jornada
   */
  roundToOneDecimal(value) {
    return Number(Number(value).toFixed(1));
  }

  /**
   * Obtiene estadísticas agregadas de un conductor específico.
   *
   * Funcionalidades:
   * - Total de jornadas
   * - Jornadas completadas
   * - Jornadas activas
   * - Horas totales trabajadas
   * - Promedio de horas por jornada
   * - Estado actual
   */
  async getConductorStatistics(conductorId) {
    // Obtiene estadísticas desde repository
    const statistics = await this.conductorRepository.getConductorStatistics(conductorId);

    /**
     * Validación:
     * si no existe el conductor se lanza excepción
     */
    if (!statistics) {
      throw new Error("Conductor no encontrado");
    }

    /**
     * Retorna objeto formateado para respuesta de API
     */
    return {
      // UUID del conductor
      conductor_id: statistics.id,

      // Nombre completo
      conductor_nombre: `${statistics.nombres} ${statistics.apellidos}`,

      // Total de jornadas registradas
      total_jornadas: Number(statistics.total_jornadas),

      // Jornadas finalizadas
      jornadas_completadas: Number(statistics.jornadas_completadas),

      // Jornadas actualmente activas
      jornadas_activas: Number(statistics.jornadas_activas),

      /**
       * Horas totales trabajadas redondeadas a 1 decimal
       */
      horas_totales_trabajadas: this.roundToOneDecimal(statistics.horas_totales),

      /**
       * Promedio de horas por jornada completada redondeado a 1 decimal
       */
      promedio_horas_por_jornada: this.roundToOneDecimal(statistics.promedio_horas),

      // Estado operativo actual
      estado_actual: statistics.estado_actual,
    };
  }
  /**
   * =========================================================
   * HU18
   * Obtiene detalle completo del conductor.
   * =========================================================
   */
  async getConductorDetail(conductorId) {
    const conductor = await this.conductorRepository.getConductorDetail(conductorId);

    if (!conductor) {
      throw new Error("Conductor no encontrado");
    }

    return conductor;
  }
  /**
   * =========================================================
   * HU18
   * Actualizar licencia del conductor
   * =========================================================
   */
  async updateLicencia(conductorId, licenciaData) {
    const licenciaActual = await this.conductorRepository.getLicenciaActiva(conductorId);

    if (!licenciaActual) {
      throw new Error("Licencia no encontrada");
    }

    const categorias = ["A-I", "A-IIa", "A-IIb", "A-IIIa", "A-IIIb", "A-IIIc"];

    const categoriaActual = categorias.indexOf(licenciaActual.categoria);

    const categoriaNueva = categorias.indexOf(licenciaData.categoria);

    if (categoriaNueva < categoriaActual) {
      throw new Error(
        "Error: No se permite registrar una categoría vehicular inferior a la actual"
      );
    }

    const fechaVencimiento = new Date(licenciaData.fechaVencimiento);

    if (fechaVencimiento <= new Date()) {
      throw new Error("Error: La fecha de vencimiento ingresada se encuentra expirada");
    }

    return await this.conductorRepository.updateLicencia(conductorId, licenciaData);
  }

  /**
   * Valida los datos obligatorios enviados
   * desde el formulario de registro de conductor.
   *
   * Reglas:
   * - Todos los campos son obligatorios
   * - Nombre: solo letras y espacios
   * - DNI: exactamente 8 dígitos
   * - Teléfono: exactamente 9 dígitos
   * - Email: formato válido
   */
  validarRegistroConductor(data) {
    const { nombreCompleto, email, dni, telefono, numeroLicencia, categoria, fechaVencimiento } =
      data;

    /**
     * Valida que todos los campos requeridos
     * hayan sido enviados por el cliente.
     */
    if (
      !nombreCompleto ||
      !email ||
      !dni ||
      !telefono ||
      !numeroLicencia ||
      !categoria ||
      !fechaVencimiento
    ) {
      const error = new Error("Todos los campos obligatorios deben completarse");
      error.statusCode = 400;
      throw error;
    }

    /**
     * Valida que el nombre completo
     * contenga únicamente letras,
     * tildes, eñes y espacios.
     */
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(nombreCompleto)) {
      const error = new Error("El nombre solo debe contener letras y espacios");
      error.statusCode = 400;
      throw error;
    }

    /**
     * Valida que el DNI tenga
     * exactamente 8 dígitos numéricos.
     */
    if (!/^\d{8}$/.test(dni)) {
      const error = new Error("El DNI debe tener exactamente 8 dígitos");
      error.statusCode = 400;
      throw error;
    }

    /**
     * Valida que el teléfono tenga
     * exactamente 9 dígitos numéricos.
     */
    if (!/^\d{9}$/.test(telefono)) {
      const error = new Error("El teléfono debe tener exactamente 9 dígitos");
      error.statusCode = 400;
      throw error;
    }

    /**
     * Valida el formato del correo electrónico.
     */
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const error = new Error("El email corporativo no tiene un formato válido");
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Registra un nuevo conductor.
   *
   * Flujo:
   * - Valida formato de datos
   * - Verifica duplicados en BD
   * - Registra conductor
   * - Crea usuario en AWS Cognito
   */

  async registrarNuevoConductor(data) {
    /**
     * Ejecuta validaciones de negocio
     * antes de registrar información.
     */
    this.validarRegistroConductor(data);

    /**
     * Verifica que no exista otro conductor
     * con el mismo DNI, correo o licencia.
     */
    const duplicado = await this.conductorRepository.validarDuplicadosConductor({
      dni: data.dni,
      email: data.email,
      numeroLicencia: data.numeroLicencia,
    });

    /**
     * Si existe un registro previo,
     * se interrumpe el proceso.
     */
    if (duplicado) {
      const error = new Error("El DNI, email o número de licencia ya se encuentra registrado");
      error.statusCode = 409;
      throw error;
    }
    
    /**
     * Registra el conductor en PostgreSQL
     * y posteriormente crea sus credenciales
     * en AWS Cognito.
     *
     * Si Cognito falla,
     * el Repository ejecuta rollback.
     */
    return await this.conductorRepository.registrarNuevoConductor(
      data,
      {
        crearUsuarioConductor: createConductorUserWithCognito,
        eliminarUsuarioConductor: deleteConductorUserWithCognito,
      }
    );
  }
}
