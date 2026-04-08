import { getClient } from "../../shared/config/database.mjs";

export class JornadaRepository {
  async create(jornadaData) {
    const client = await getClient();
    try {
      const query = `
        INSERT INTO jornadas (conductor_id, unidad_id, contrato_id, creado_por, origen, destino, observaciones)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const values = [
        jornadaData.conductor_id,
        jornadaData.unidad_id,
        jornadaData.contrato_id,
        jornadaData.creado_por,
        jornadaData.origen || null,
        jornadaData.destino || null,
        jornadaData.observaciones || null
      ];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async checkUnidadActiva(unidad_id) {
    const client = await getClient();
    try {
      const query = `SELECT id FROM jornadas WHERE unidad_id = $1 AND estado IN ('REGISTRADA', 'EN_PROCESO') LIMIT 1;`;
      const result = await client.query(query, [unidad_id]);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async checkConductorActivo(conductor_id) {
    const client = await getClient();
    try {
      const query = `SELECT id FROM jornadas WHERE conductor_id = $1 AND estado IN ('REGISTRADA', 'EN_PROCESO') LIMIT 1;`;
      const result = await client.query(query, [conductor_id]);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }
}
