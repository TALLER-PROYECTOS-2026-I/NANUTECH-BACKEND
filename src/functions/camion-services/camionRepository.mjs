import db from "../../shared/config/database.mjs";

export class CamionRepository {
  async getAll() {
    try {
      const result = await db.query(`
        SELECT id, placa, marca, modelo, estado
        FROM camiones 
        ORDER BY id
      `);
      return result.rows;
    } catch (error) {
      console.error("Error en getAll repository:", error);
      throw new Error(`Error al obtener camiones: ${error.message}`);
    }
  }

  async getById(id) {
    try {
      const result = await db.query(
        `SELECT id, placa, marca, modelo, estado
         FROM camiones 
         WHERE id = $1`,
        [id],
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error en getById repository:`, error);
      throw new Error(`Error al obtener camión: ${error.message}`);
    }
  }

  async exists(id) {
    try {
      const result = await db.query(
        "SELECT EXISTS(SELECT 1 FROM camiones WHERE id = $1) as exists",
        [id],
      );
      return result.rows[0].exists;
    } catch (error) {
      console.error("Error en exists:", error);
      return false;
    }
  }

  async getByPlaca(placa) {
    try {
      const result = await db.query(
        `SELECT id, placa, marca, modelo, estado
         FROM camiones 
         WHERE placa = $1`,
        [placa],
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error en getByPlaca:", error);
      throw new Error(`Error al obtener por placa: ${error.message}`);
    }
  }

  async create(data) {
    const { placa, marca, modelo, estado } = data;

    try {
      const result = await db.query(
        `INSERT INTO camiones (placa, marca, modelo, estado)
         VALUES ($1, $2, $3, $4)
         RETURNING id, placa, marca, modelo, estado`,
        [placa, marca, modelo, estado || "activo"],
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error en create:", error);
      throw new Error(`Error al crear camión: ${error.message}`);
    }
  }

  async update(id, data) {
    const { placa, marca, modelo, estado } = data;

    try {
      const result = await db.query(
        `UPDATE camiones 
         SET placa = $1, marca = $2, modelo = $3, estado = $4
         WHERE id = $5
         RETURNING id, placa, marca, modelo, estado`,
        [placa, marca, modelo, estado, id],
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error en update:", error);
      throw new Error(`Error al actualizar: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const result = await db.query(
        "DELETE FROM camiones WHERE id = $1 RETURNING id",
        [id],
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error en delete:", error);
      throw new Error(`Error al eliminar: ${error.message}`);
    }
  }
}

export default new CamionRepository();
