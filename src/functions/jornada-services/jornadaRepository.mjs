import { getDbClient } from "../../shared/config/database.mjs";

export class JornadaRepository {
  async create(jornadaData) {
    const client = await getDbClient();
    try {
      const query = `
        INSERT INTO jornadas (id_conductor, id_unidad, id_contrato, estado)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const values = [
        jornadaData.id_conductor,
        jornadaData.id_unidad,
        jornadaData.id_contrato,
        jornadaData.estado,
      ];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async checkUnidadActiva(id_unidad) {
    const client = await getDbClient();
    try {
      const query = `SELECT id FROM jornadas WHERE id_unidad = $1 AND estado = 'ACTIVA' LIMIT 1;`;
      const result = await client.query(query, [id_unidad]);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }
}
