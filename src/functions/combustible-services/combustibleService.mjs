import { CombustibleRepository } from "./combustibleRepository.mjs";
import { CombustibleRegistro } from "./combustibleModel.mjs";

/**
 * Regex flexible para UUID.
 *
 * Se usa una validación compatible con los UUID de prueba del proyecto,
 * incluyendo UUIDs con segmentos en 0000.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;



/**
 * Extensiones permitidas para comprobantes de combustible.
 *
 * La validación pesada de tamaño real del archivo se realiza en la app,
 * porque el backend actualmente recibe URL/base64 o referencia del comprobante.
 */
const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"];


/**
 * Crea un error de dominio para HU15.
 */
function createCombustibleError(
  message,
  statusCode = 400,
  code = "COMBUSTIBLE_ERROR"
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}


/**
 * Valida formato UUID.
 */
function isValidUuid(value) {
  return typeof value === "string" && UUID_REGEX.test(value);
}

/**
 * Convierte un valor a número..
 */
function toNumber(value) {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(value);
}



/**
 * Valida números obligatorios positivos.
 *
 * Aplica a Galones, Costo Total y Kilometraje Actual.
 */
function validatePositiveNumber(value, fieldName, code) {
  const numberValue = toNumber(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw createCombustibleError(
      `El campo ${fieldName} es obligatorio para continuar`,
      400,
      code
    );
  }

  return numberValue;
}


/**
 * Valida que un campo obligatorio exista.
 */
function validateRequired(value, message, code) {
  if (value === null || value === undefined || value === "") {
    throw createCombustibleError(message, 400, code);
  }
}


/**
 * Valida la URL o referencia del comprobante.
 *
 * Cubre:
 * - Campo obligatorio.
 * - Longitud máxima.
 * - Extensión permitida PNG/JPG/JPEG.
 */
function validateImageUrl(value) {
  validateRequired(
    value,
    "El campo Foto del Comprobante es obligatorio para continuar",
    "FOTO_REQUIRED"
  );

  if (typeof value !== "string" || value.length > 500) {
    throw createCombustibleError(
      "La URL del comprobante no es válida.",
      400,
      "INVALID_FOTO_URL"
    );
  }

  const lower = value.toLowerCase();
  const isValidExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) =>
    lower.includes(ext)
  );

  if (!isValidExtension) {
    throw createCombustibleError(
      "Solo se permiten comprobantes en formato PNG o JPG.",
      400,
      "INVALID_IMAGE_FORMAT"
    );
  }

  return value;
}


/**
 * Valida coordenadas GPS opcionales.
 *
 * Si no se reciben coordenadas, retorna null para ambos campos.
 * Si se reciben, valida rangos geográficos.
 */
function validateCoordinates(latitud, longitud) {
  if (latitud === null || latitud === undefined || latitud === "") {
    return { latitud: null, longitud: null };
  }

  const lat = Number(latitud);
  const lng = Number(longitud);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw createCombustibleError(
      "Latitud inválida.",
      400,
      "INVALID_LATITUDE"
    );
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw createCombustibleError(
      "Longitud inválida.",
      400,
      "INVALID_LONGITUDE"
    );
  }

  return { latitud: lat, longitud: lng };
}



/**
 * Servicio de negocio para HU15 - Registro de Abastecimiento de Combustible.
 *
 * Responsabilidades:
 * - Validar datos de entrada.
 * - Validar jornada activa.
 * - Validar incremento de odómetro.
 * - Calcular rendimiento.
 * - Delegar persistencia al repositorio.
 */
export class CombustibleService {
  constructor() {
    this.repository = new CombustibleRepository();
  }



   /**
   * Obtiene el último kilometraje registrado para una unidad.
   */
  async getUltimoKilometraje(unidadId) {
    if (!isValidUuid(unidadId)) {
      throw createCombustibleError(
        "El campo unidad_id debe ser UUID válido.",
        400,
        "INVALID_UNIDAD_ID"
      );
    }

    const ultimoKilometraje = await this.repository.getUltimoKilometraje(
      unidadId
    );

    return {
      unidad_id: unidadId,
      ultimo_kilometraje: ultimoKilometraje,
    };
  }



    /**
   * Lista registros de combustible asociados a una jornada.
   */
  async getRegistrosPorJornada(jornadaId) {
    if (!isValidUuid(jornadaId)) {
      throw createCombustibleError(
        "El campo jornada_id debe ser UUID válido.",
        400,
        "INVALID_JORNADA_ID"
      );
    }

    const rows = await this.repository.findByJornada(jornadaId);
    return CombustibleRegistro.fromDatabaseList(rows);
  }



    /**
   * Registra un abastecimiento de combustible.
   *
   * Reglas HU15:
   * - Jornada debe estar EN_PROCESO.
   * - Galones, costo, kilometraje y foto son obligatorios.
   * - Foto debe ser PNG/JPG/JPEG.
   * - Kilometraje actual debe ser mayor al último registrado.
   * - Rendimiento = (kilometraje_actual - kilometraje_anterior) / galones.
   */
  async registrarCombustible(data = {}) {
    const {
      jornada_id,
      conductor_id,
      galones,
      costo_total,
      kilometraje_actual,
      foto_comprobante_url,
      tipo_comprobante = "TICKET",
      numero_comprobante = null,
      observaciones = null,
      latitud = null,
      longitud = null,
      created_offline = false,
      timestamp_local = null,
    } = data;

    if (!isValidUuid(jornada_id)) {
      throw createCombustibleError(
        "El campo jornada_id debe ser UUID válido.",
        400,
        "INVALID_JORNADA_ID"
      );
    }

    if (!isValidUuid(conductor_id)) {
      throw createCombustibleError(
        "El campo conductor_id debe ser UUID válido.",
        400,
        "INVALID_CONDUCTOR_ID"
      );
    }

    const galonesNumber = validatePositiveNumber(
      galones,
      "Galones",
      "GALONES_REQUIRED"
    );

    const costoTotalNumber = validatePositiveNumber(
      costo_total,
      "Costo Total",
      "COSTO_TOTAL_REQUIRED"
    );

    const kilometrajeActualNumber = validatePositiveNumber(
      kilometraje_actual,
      "Kilometraje",
      "KILOMETRAJE_REQUIRED"
    );

    const fotoUrl = validateImageUrl(foto_comprobante_url);

    const jornada = await this.repository.findJornadaEnProceso(
      jornada_id,
      conductor_id
    );

    if (!jornada) {
      throw createCombustibleError(
        "El registro de combustible solo puede realizarse con una jornada en estado EN_PROCESO.",
        409,
        "JORNADA_NOT_IN_PROGRESS"
      );
    }

    const kilometrajeAnterior = await this.repository.getUltimoKilometraje(
      jornada.unidad_id
    );

    if (kilometrajeActualNumber <= kilometrajeAnterior) {
      throw createCombustibleError(
        "El kilometraje debe ser mayor al último registro de la unidad",
        400,
        "KILOMETRAJE_INVALIDO"
      );
    }

    const rendimiento =
      (kilometrajeActualNumber - kilometrajeAnterior) / galonesNumber;

    const coords = validateCoordinates(latitud, longitud);

    const registeredAt = timestamp_local
      ? new Date(timestamp_local).toISOString()
      : new Date().toISOString();

    const row = await this.repository.createRegistro({
      jornada_id,
      unidad_id: jornada.unidad_id,
      conductor_id,
      contrato_id: jornada.contrato_id,
      tipo_comprobante,
      numero_comprobante,
      galones: galonesNumber,
      costo_total: costoTotalNumber,
      kilometraje_actual: kilometrajeActualNumber,
      kilometraje_anterior: kilometrajeAnterior,
      rendimiento_km_galon: Number(rendimiento.toFixed(2)),
      foto_comprobante_url: fotoUrl,
      observaciones,
      latitud: coords.latitud,
      longitud: coords.longitud,
      estado: created_offline ? "PENDIENTE_SINCRONIZACION" : "SINCRONIZADO",
      sincronizado: !created_offline,
      registrado_at: registeredAt,
    });

    const registro = CombustibleRegistro.fromDatabase(row);

    return {
      ...registro.toJSON(),
      placa: jornada.placa,
      mensaje: `¡Combustible registrado exitosamente! Rendimiento calculado: ${Number(
        rendimiento.toFixed(1)
      )} km/gal`,
    };
  }
}