/**
 * Modelo de dominio para la entidad Alerta del panel de emergencias.
 * Representa una fila de la tabla alertas_jornada con sus relaciones
 * anidadas a conductor y unidad.
 *
 * @module alertaModel
 */

/**
 * Representa una alerta de emergencia dentro del sistema de jornadas.
 * Incluye metadatos de ubicación, estado operativo, severidad y
 * relaciones con conductor y unidad.
 */
export class Alerta {
  /**
   * Crea una instancia de Alerta.
   *
   * @param {Object} data - Datos brutos de la alerta
   * @param {string} data.id - UUID de la alerta
   * @param {string} [data.codigo] - Código legible (ej. ALT-001)
   * @param {string} data.jornada_id - UUID de la jornada asociada
   * @param {string} data.tipo - Tipo de alerta (PANICO | AUXILIO_MECANICO | OBSERVACION)
   * @param {string} data.estado - Estado operativo (ACTIVA | EN_PROCESO | RESUELTA | FALSA_ALARMA)
   * @param {string} data.severidad - Severidad (BAJA | MEDIA | ALTA | CRITICA)
   * @param {string} [data.detalle] - Descripción libre de la alerta
   * @param {string} [data.tipo_falla_mecanica] - Clasificación de falla cuando aplica
   * @param {number} data.latitud - Latitud geográfica (-90 a 90)
   * @param {number} data.longitud - Longitud geográfica (-180 a 180)
   * @param {string} [data.direccion] - Dirección textual aproximada
   * @param {string} data.fecha_hora - ISO 8601 del momento de la alerta
   * @param {boolean} data.bloqueo_sos_activo - Indica si el SOS sigue activo
   * @param {Object} [data.conductor] - Datos del conductor anidados
   * @param {string} [data.conductor.id] - UUID del conductor
   * @param {string} [data.conductor.nombre_completo] - Nombres y apellidos concatenados
   * @param {string} [data.conductor.telefono] - Teléfono de contacto
   * @param {string} [data.conductor.dni] - Documento de identidad
   * @param {Object} [data.unidad] - Datos de la unidad anidados (puede ser null)
   * @param {string} [data.unidad.id] - UUID de la unidad
   * @param {string} [data.unidad.placa] - Placa del vehículo
   * @param {string} [data.unidad.marca] - Marca del vehículo
   * @param {string} [data.unidad.modelo] - Modelo del vehículo
   */
  constructor({
    id,
    codigo,
    jornada_id,
    tipo,
    estado,
    severidad,
    detalle,
    tipo_falla_mecanica,
    latitud,
    longitud,
    direccion,
    fecha_hora,
    bloqueo_sos_activo,
    conductor,
    unidad,
  }) {
    this.id = id;
    this.codigo = codigo;
    this.jornada_id = jornada_id;
    this.tipo = tipo;
    this.estado = estado;
    this.severidad = severidad;
    this.detalle = detalle;
    this.tipo_falla_mecanica = tipo_falla_mecanica;
    this.latitud = latitud;
    this.longitud = longitud;
    this.direccion = direccion;
    this.fecha_hora = fecha_hora;
    this.bloqueo_sos_activo = bloqueo_sos_activo;
    this.conductor = conductor;
    this.unidad = unidad;
  }

  /**
   * Serializa la instancia a un objeto plano JSON.
   * Útil para respuestas HTTP sin exponer métodos internos.
   *
   * @returns {Object} Copia superficial de todos los atributos de la alerta
   */
  toJSON() {
    return { ...this };
  }

  /**
   * Mapea una fila cruda de PostgreSQL (con posibles prefijos de JOIN)
   * a una instancia del modelo Alerta.
   *
   * @param {Object|null} row - Fila devuelta por node-postgres, o null
   * @returns {Alerta|null} Instancia del modelo, o null si row es null
   */
  static fromDatabase(row) {
    if (!row) return null;

    return new Alerta({
      id: row.id,
      codigo: row.codigo ?? null,
      jornada_id: row.jornada_id,
      tipo: row.tipo,
      estado: row.estado,
      severidad: row.severidad,
      detalle: row.detalle ?? null,
      tipo_falla_mecanica: row.tipo_falla_mecanica ?? null,
      latitud: row.latitud,
      longitud: row.longitud,
      direccion: row.direccion ?? null,
      fecha_hora: row.fecha_hora,
      bloqueo_sos_activo: row.bloqueo_sos_activo ?? false,
      conductor: row.conductor_id
        ? {
            id: row.conductor_id,
            nombre_completo: row.conductor_nombre_completo ?? null,
            telefono: row.conductor_telefono ?? null,
            dni: row.conductor_dni ?? null,
          }
        : null,
      unidad: row.unidad_id
        ? {
            id: row.unidad_id,
            placa: row.unidad_placa ?? null,
            marca: row.unidad_marca ?? null,
            modelo: row.unidad_modelo ?? null,
          }
        : null,
    });
  }

  /**
   * Mapea un arreglo de filas de PostgreSQL a un arreglo de instancias Alerta.
   *
   * @param {Object[]} rows - Filas devueltas por node-postgres
   * @returns {Alerta[]} Lista de instancias del modelo
   */
  static fromDatabaseList(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => Alerta.fromDatabase(row));
  }
}
