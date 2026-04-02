import db from "../../shared/config/database.mjs";

export class ContratoRepository {
  async getAllVigentes() {
    const result = await db.query(
      `SELECT id, codigo, empresa, tipo_servicio, tarifa, moneda,
              fecha_inicio, fecha_fin, estado, descripcion
       FROM contratos
       WHERE estado = 'activo'
         AND fecha_inicio <= CURRENT_DATE
         AND fecha_fin >= CURRENT_DATE
       ORDER BY empresa`
    );
    return result.rows;
  }
}
