import db from "../../shared/config/database.mjs";

export class UnidadRepository {
  async getAllDisponibles() {
    const result = await db.query(
      `SELECT id, placa, marca, modelo, estado
       FROM camiones
       WHERE estado = 'activo'
         AND id NOT IN (
           SELECT camion_id FROM jornadas WHERE estado = 'iniciada'
         )
       ORDER BY placa`
    );
    return result.rows;
  }
}
