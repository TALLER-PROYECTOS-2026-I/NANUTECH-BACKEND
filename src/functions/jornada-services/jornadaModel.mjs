export class Jornada {
  constructor(
    id,
    id_conductor,
    id_unidad,
    id_contrato,
    estado,
    fecha_registro,
  ) {
    this.id = id;
    this.id_conductor = id_conductor;
    this.id_unidad = id_unidad;
    this.id_contrato = id_contrato;
    this.estado = estado;
    this.fecha_registro = fecha_registro;
  }

  toJSON() {
    return {
      id: this.id,
      id_conductor: this.id_conductor,
      id_unidad: this.id_unidad,
      id_contrato: this.id_contrato,
      estado: this.estado,
      fecha_registro: this.fecha_registro,
    };
  }

  static fromDatabase(row) {
    if (!row) return null;
    return new Jornada(
      row.id,
      row.id_conductor,
      row.id_unidad,
      row.id_contrato,
      row.estado,
      row.fecha_registro,
    );
  }
}
