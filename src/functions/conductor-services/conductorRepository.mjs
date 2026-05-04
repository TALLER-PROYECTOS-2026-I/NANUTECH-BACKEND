import db from "../../shared/config/database.mjs";

export class ConductorRepository {
  async getAllActive() {
    const result = await db.query(
      `SELECT id, cognito_sub, correo, nombres, apellidos, 
              rol, telefono, dni, activo, estado
       FROM usuarios
       WHERE rol = 'CHOFER'
         AND activo = TRUE
         AND estado = 'ACTIVO'
       ORDER BY apellidos, nombres`
    );
    return result.rows;
  }
}
