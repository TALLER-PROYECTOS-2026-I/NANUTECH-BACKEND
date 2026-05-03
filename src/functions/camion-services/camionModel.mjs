export class Camion {
  constructor({
    id,
    placa,
    marca,
    modelo,
    anio = null,
    capacidad_ton = null,
    estado = "DISPONIBLE",
    gps_habilitado = false,
    vin = null,
    color = null,
    tipo_combustible = null,
    kilometraje_actual = 0,
    fecha_registro = null,
    ultima_fecha_mantenimiento = null,
    proxima_fecha_mantenimiento = null,
    horas_movimiento = 0,
    horas_detenido = 0,
    horas_totales = 0,
    kilometros_totales = 0,
    ultimo_gps_at = null,
    activo = true,
  }) {
    this.id = id;
    this.placa = placa;
    this.marca = marca;
    this.modelo = modelo;
    this.anio = anio;
    this.capacidad_ton = capacidad_ton;
    this.estado = estado;
    this.gps_habilitado = gps_habilitado;
    this.vin = vin;
    this.color = color;
    this.tipo_combustible = tipo_combustible;
    this.kilometraje_actual = kilometraje_actual;
    this.fecha_registro = fecha_registro;
    this.ultima_fecha_mantenimiento = ultima_fecha_mantenimiento;
    this.proxima_fecha_mantenimiento = proxima_fecha_mantenimiento;
    this.horas_movimiento = horas_movimiento;
    this.horas_detenido = horas_detenido;
    this.horas_totales = horas_totales;
    this.kilometros_totales = kilometros_totales;
    this.ultimo_gps_at = ultimo_gps_at;
    this.activo = activo;
  }

  toJSON() {
    return {
      id: this.id,
      placa: this.placa,
      marca: this.marca,
      modelo: this.modelo,
      anio: this.anio,
      capacidad_ton: Number(this.capacidad_ton || 0),
      estado: this.estado,
      gps_habilitado: Boolean(this.gps_habilitado),
      vin: this.vin,
      color: this.color,
      tipo_combustible: this.tipo_combustible,
      kilometraje_actual: Number(this.kilometraje_actual || 0),
      fecha_registro: this.fecha_registro,
      ultima_fecha_mantenimiento: this.ultima_fecha_mantenimiento,
      proxima_fecha_mantenimiento: this.proxima_fecha_mantenimiento,
      horas_movimiento: Number(this.horas_movimiento || 0),
      horas_detenido: Number(this.horas_detenido || 0),
      horas_totales: Number(this.horas_totales || 0),
      kilometros_totales: Number(this.kilometros_totales || 0),
      ultimo_gps_at: this.ultimo_gps_at,
      activo: Boolean(this.activo),
    };
  }

  static fromDatabase(row) {
    if (!row) return null;

    return new Camion({
      id: row.id,
      placa: row.placa,
      marca: row.marca,
      modelo: row.modelo,
      anio: row.anio,
      capacidad_ton: row.capacidad_ton,
      estado: row.estado,
      gps_habilitado: row.gps_habilitado,
      vin: row.vin,
      color: row.color,
      tipo_combustible: row.tipo_combustible,
      kilometraje_actual: row.kilometraje_actual,
      fecha_registro: row.fecha_registro,
      ultima_fecha_mantenimiento: row.ultima_fecha_mantenimiento,
      proxima_fecha_mantenimiento: row.proxima_fecha_mantenimiento,
      horas_movimiento: row.horas_movimiento,
      horas_detenido: row.horas_detenido,
      horas_totales: row.horas_totales,
      kilometros_totales: row.kilometros_totales,
      ultimo_gps_at: row.ultimo_gps_at,
      activo: row.activo,
    });
  }

  static fromDatabaseList(rows = []) {
    return rows.map((row) => Camion.fromDatabase(row));
  }
}