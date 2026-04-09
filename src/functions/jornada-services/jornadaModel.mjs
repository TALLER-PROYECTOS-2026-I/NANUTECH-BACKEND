export class Jornada {
  constructor({
    id,
    conductor_id,
    unidad_id,
    contrato_id,
    creado_por,
    fecha_jornada,
    hora_inicio,
    hora_fin,
    origen,
    destino,
    km_recorridos,
    observaciones,
    estado,
    created_at,
    updated_at,
    duracion_total_segundos = null,
  }) {
    this.id = id;
    this.conductor_id = conductor_id;
    this.unidad_id = unidad_id;
    this.contrato_id = contrato_id;
    this.creado_por = creado_por;
    this.fecha_jornada = fecha_jornada;
    this.hora_inicio = hora_inicio;
    this.hora_fin = hora_fin;
    this.origen = origen;
    this.destino = destino;
    this.km_recorridos = km_recorridos;
    this.observaciones = observaciones;
    this.estado = estado;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.duracion_total_segundos = duracion_total_segundos;
  }

  toJSON() {
    return { ...this };
  }

  static fromDatabase(row) {
    if (!row) return null;
    return new Jornada(row);
  }
}
