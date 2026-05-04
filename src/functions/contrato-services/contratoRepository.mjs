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

  async createContrato(data) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const codigo = this.generateCodigoContrato();
      const totalReferencial = this.calculateTotalReferencial(data);

      // 1. Insertar contrato principal
      const contratoResult = await client.query(
        `
      INSERT INTO contratos (
        codigo,
        cliente,
        ruc,
        descripcion,
        tipo_servicio,
        fecha_inicio,
        fecha_fin,
        tarifa,
        moneda,
        estado,
        activo
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'VIGENTE',TRUE)
      RETURNING *
      `,
        [
          codigo,
          data.cliente.trim(),
          data.ruc,
          data.descripcion || null,
          data.tipo_servicio,
          data.fecha_inicio,
          data.fecha_fin || null,
          totalReferencial,
          data.moneda || "PEN",
        ],
      );

      const contrato = contratoResult.rows[0];

      // 2. Ruta
      await client.query(
        `
      INSERT INTO contrato_rutas (
        contrato_id,
        origen,
        destino,
        distancia_estimada_km
      )
      VALUES ($1,$2,$3,$4)
      `,
        [
          contrato.id,
          data.origen.trim(),
          data.destino.trim(),
          Number(data.distancia_estimada_km).toFixed(2),
        ],
      );

      // 3. Tarifas
      await client.query(
        `
      INSERT INTO contrato_tarifas (
        contrato_id,
        tarifa_por_km,
        tarifa_por_hora,
        tarifa_espera,
        total_referencial
      )
      VALUES ($1,$2,$3,$4,$5)
      `,
        [
          contrato.id,
          Number(data.tarifa_por_km).toFixed(2),
          Number(data.tarifa_por_hora || 0).toFixed(2),
          Number(data.tarifa_espera || 0).toFixed(2),
          totalReferencial,
        ],
      );

      const fullResult = await this.getFullContratoByIdWithClient(
        client,
        contrato.id,
      );

      await client.query("COMMIT");

      return fullResult;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }


  async getFullContratoByIdWithClient(client, id) {
    const result = await client.query(
      `SELECT 
          c.id,
          c.codigo,
          c.cliente,
          c.ruc,
          c.descripcion,
          c.tipo_servicio,
          c.fecha_inicio,
          c.fecha_fin,
          c.tarifa,
          c.moneda,
          c.estado,
          c.activo,
          cr.origen,
          cr.destino,
          cr.distancia_estimada_km,
          ct.tarifa_base,
          ct.tarifa_por_km,
          ct.tarifa_por_hora,
          ct.tarifa_por_tonelada,
          ct.tarifa_espera,
          ct.total_referencial
       FROM contratos c
       JOIN contrato_rutas cr ON cr.contrato_id = c.id
       JOIN contrato_tarifas ct ON ct.contrato_id = c.id
       WHERE c.id = $1`,
      [id],
    );

    return result.rows[0];
  }

  generateCodigoContrato() {
    return `CONT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  calculateTotalReferencial(data) {
    const distancia = Number(data.distancia_estimada_km || 0);
    const tarifaPorKm = Number(data.tarifa_por_km || 0);

    return Number((distancia * tarifaPorKm).toFixed(2));
  }
}
