export class JornadaValidator {
  static validateCreateJornada(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Datos de jornada inválidos');
    }
    if (!data.conductor_id) throw new Error('El conductor_id es requerido');
    if (!data.unidad_id) throw new Error('El unidad_id es requerido');
    if (!data.contrato_id) throw new Error('El contrato_id es requerido');
    if (!data.creado_por) throw new Error('El creado_por es requerido (ID del administrador/usuario que registra)');

    return {
      conductor_id: data.conductor_id,
      unidad_id: data.unidad_id,
      contrato_id: data.contrato_id,
      creado_por: data.creado_por,
      origen: data.origen,
      destino: data.destino,
      observaciones: data.observaciones
    };
  }
}
