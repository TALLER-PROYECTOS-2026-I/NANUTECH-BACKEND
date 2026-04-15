import db from "../../shared/config/database.mjs";

export class UnidadRepository {
  async getAllDisponibles() {
    const result = await db.query(
      `SELECT id, placa, marca, modelo, anio,
              capacidad_ton, estado, activo
       FROM unidades
       WHERE activo = TRUE
         AND estado = 'DISPONIBLE'
       ORDER BY placa`
    );
    return result.rows;
  }
}
