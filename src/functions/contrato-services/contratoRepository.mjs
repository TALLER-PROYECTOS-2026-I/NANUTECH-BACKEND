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
       ORDER BY cliente`
    );
    return result.rows;
  }
}
