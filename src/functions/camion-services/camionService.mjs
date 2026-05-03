import { CamionRepository } from "./camionRepository.mjs";
import { Camion } from "./camionModel.mjs";

const ESTADOS_VALIDOS = [
  "DISPONIBLE",
  "EN_JORNADA",
  "EN_AUXILIO",
  "MANTENIMIENTO",
  "INACTIVA",
];

const COMBUSTIBLES_VALIDOS = [
  "DIESEL",
  "GASOLINA",
  "GNV",
  "GLP",
  "ELECTRICO",
  "HIBRIDO",
];

function normalizeEstado(estado) {
  if (!estado) return "DISPONIBLE";

  const value = String(estado).trim().toUpperCase().replaceAll(" ", "_");

  if (value === "EN_USO") return "EN_JORNADA";

  if (!ESTADOS_VALIDOS.includes(value)) {
    throw new Error("Estado de camión inválido");
  }

  return value;
}

export class CamionService {
  constructor() {
    this.repository = new CamionRepository();
  }

  async getAllCamiones(filters = {}) {
    const camiones = await this.repository.getAll(filters);
    return Camion.fromDatabaseList(camiones);
  }

  async getCamionById(id) {
    if (!id) {
      throw new Error("El id es requerido");
    }

    const camion = await this.repository.getById(id);

    if (!camion) {
      throw new Error("Camión no encontrado");
    }

    return Camion.fromDatabase(camion);
  }

  async createCamion(camionData = {}) {
    const validatedData = this.validateCreateCamion(camionData);

    const existingByPlaca = await this.repository.getByPlaca(
      validatedData.placa,
    );

    if (existingByPlaca) {
      throw new Error("Ya existe un camión con esta placa");
    }

    const existingByVin = await this.repository.getByVin(validatedData.vin);

    if (existingByVin) {
      throw new Error("Ya existe un camión con este VIN");
    }

    const created = await this.repository.create(validatedData);
    const camion = Camion.fromDatabase(created).toJSON();

    return {
      ...camion,
      confirmacion: {
        message: "¡Camión registrado con éxito!",
        placa: camion.placa,
        modelo: camion.modelo,
      },
    };
  }

  async getPanel(filters = {}) {
    return this.repository.getPanel(filters);
  }

  async exportCsv(filters = {}) {
    return this.repository.exportCsv(filters);
  }

  validateCreateCamion(data = {}) {
    const requiredFields = [
      "placa",
      "marca",
      "modelo",
      "anio",
      "capacidad_ton",
      "vin",
      "color",
      "combustible",
      "gps",
    ];

    for (const field of requiredFields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ""
      ) {
        throw new Error(`El campo ${field} es obligatorio`);
      }
    }

    const placa = String(data.placa).trim().toUpperCase();

    if (!placa) {
      throw new Error("La placa no puede estar vacía");
    }

    const marca = String(data.marca).trim();

    if (!marca) {
      throw new Error("La marca no puede estar vacía");
    }

    const modelo = String(data.modelo).trim();

    if (!modelo) {
      throw new Error("El modelo no puede estar vacío");
    }

    const anio = Number(data.anio);
    const currentYear = new Date().getFullYear();

    if (!Number.isInteger(anio) || anio < 1990 || anio > currentYear + 1) {
      throw new Error("Año fuera del rango permitido");
    }

    const capacidadTon = Number(data.capacidad_ton);

    if (Number.isNaN(capacidadTon) || capacidadTon <= 0) {
      throw new Error("La capacidad debe ser mayor a 0 toneladas");
    }

    const vin = String(data.vin).trim().toUpperCase();

    if (!vin) {
      throw new Error("El VIN es obligatorio");
    }

    const color = String(data.color).trim();

    if (!color) {
      throw new Error("El color es obligatorio");
    }

    const tipoCombustible = String(data.combustible).trim().toUpperCase();

    if (!COMBUSTIBLES_VALIDOS.includes(tipoCombustible)) {
      throw new Error(
        `Combustible inválido. Use: ${COMBUSTIBLES_VALIDOS.join(", ")}`,
      );
    }

    return {
      placa,
      marca,
      modelo,
      anio,
      capacidad_ton: capacidadTon,
      vin,
      color,
      tipo_combustible: tipoCombustible,
      gps_habilitado: Boolean(data.gps),
      estado: normalizeEstado(data.estado),
      kilometraje_actual: Number(data.kilometraje_actual || 0),
      fecha_registro: data.fecha_registro || new Date().toISOString().slice(0, 10),
      ultima_fecha_mantenimiento:
        data.ultima_fecha_mantenimiento || data.ultimo_mantenimiento || null,
      proxima_fecha_mantenimiento:
        data.proxima_fecha_mantenimiento || data.proximo_mantenimiento || null,
      notas: data.notas || null,
    };
  }
}