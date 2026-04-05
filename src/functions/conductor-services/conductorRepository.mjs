import db from "../../shared/config/database.mjs";

export class ConductorRepository {
  async getAllActive() {
    const result = await db.query(
      `SELECT id, nombre, dni, licencia, telefono, estado 
       FROM conductores 
       WHERE estado = 'activo' 
       ORDER BY nombre`
    );
    return result.rows;
  }
}
