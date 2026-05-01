import db from "../../shared/config/database.mjs";

export class ContratoRepository {
  async getAllVigentes() {
    const result = await db.query(
      `SELECT id, codigo, cliente, descripcion,
              fecha_inicio, fecha_fin, tarifa, moneda, estado, activo
       FROM contratos
       WHERE activo = TRUE
         AND estado = 'VIGENTE'
         AND fecha_inicio <= CURRENT_DATE
         AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
       ORDER BY cliente`,
    );
    return result.rows;
  }
  // HU07 - Criterio 1: Obtener detalle de contrato
  async getById(id) {
    const result = await db.query(`SELECT * FROM contratos WHERE id = $1`, [
      id,
    ]);
    return result.rows[0];
  }

  // HU07 - Obtener tarifas del contrato
  async getTarifasByContrato(id) {
    const result = await db.query(
      `SELECT * FROM contrato_tarifas WHERE contrato_id = $1`,
      [id],
    );
    return result.rows[0];
  }

  // HU07 - Actualizar contrato (fechas, tipo servicio)
  async updateContrato(id, data) {
    await db.query(
      `UPDATE contratos
     SET fecha_inicio = $1,
         fecha_fin = $2,
         tipo_servicio = $3
     WHERE id = $4`,
      [data.fecha_inicio, data.fecha_fin, data.tipo_servicio, id],
    );
  }

  // HU07 - Actualizar tarifas
  async updateTarifas(id, tarifas) {
    await db.query(
      `UPDATE contrato_tarifas
     SET tarifa_base = $1,
         tarifa_por_hora = $2,
         tarifa_por_tonelada = $3
     WHERE contrato_id = $4`,
      [tarifas.base, tarifas.hora, tarifas.tonelada, id],
    );
  }

  // HU07 - Insertar historial
  async insertHistorial(data) {
    await db.query(
      `INSERT INTO contratos_historial
     (contrato_id, accion, campo, valor_anterior, valor_nuevo, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.contrato_id,
        "UPDATE",
        data.campo,
        data.anterior,
        data.nuevo,
        data.ip,
      ],
    );
  }

  // HU07 - Asignar unidades
  async insertUnidad(contrato_id, unidad_id) {
    await db.query(
      `INSERT INTO contrato_unidades (contrato_id, unidad_id)
     VALUES ($1, $2)`,
      [contrato_id, unidad_id],
    );
  }

  // HU07 - Limpiar unidades
  async deleteUnidades(contrato_id) {
    await db.query(`DELETE FROM contrato_unidades WHERE contrato_id = $1`, [
      contrato_id,
    ]);
  }
}
