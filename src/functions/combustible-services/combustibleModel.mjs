/**
 * Modelo de dominio para los registros de abastecimiento de combustible.
 *
 * Este modelo representa una fila de la tabla `combustible_registros`.
 * Se usa para normalizar datos provenientes de PostgreSQL antes de
 * enviarlos como respuesta HTTP.
 */
export class CombustibleRegistro {
      /**
   * Construye una instancia de CombustibleRegistro.
   *
   - Datos crudos provenientes de BD o del servicio.
   */
  constructor(data) {
    this.id = data.id;
    this.jornada_id = data.jornada_id;
    this.unidad_id = data.unidad_id;
    this.conductor_id = data.conductor_id;
    this.contrato_id = data.contrato_id;
    this.tipo_comprobante = data.tipo_comprobante;
    this.numero_comprobante = data.numero_comprobante;
        // Conversión explícita para que el frontend reciba números reales
    // y no strings numéricos de PostgreSQL.
    this.galones = Number(data.galones);
    this.costo_total = Number(data.costo_total);
    this.kilometraje_actual = Number(data.kilometraje_actual);
    this.kilometraje_anterior = Number(data.kilometraje_anterior);
    this.rendimiento_km_galon =
      data.rendimiento_km_galon !== null
        ? Number(data.rendimiento_km_galon)
        : null;
    this.foto_comprobante_url = data.foto_comprobante_url;
    this.observaciones = data.observaciones;
    this.latitud = data.latitud !== null ? Number(data.latitud) : null;
    this.longitud = data.longitud !== null ? Number(data.longitud) : null;
    this.estado = data.estado;
    this.sincronizado = data.sincronizado;
    this.registrado_at = data.registrado_at;
    this.created_at = data.created_at;
  }

    /**
   * Convierte el modelo a un objeto plano serializable.
   *
   * Objeto listo para respuesta JSON.
   */

  toJSON() {
    return { ...this };
  }

  
  static fromDatabase(row) {
    if (!row) return null;
    return new CombustibleRegistro(row);
  }

  static fromDatabaseList(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => CombustibleRegistro.fromDatabase(row));
  }
}