import { closePool, getClient } from "../src/shared/config/database.mjs";
import { schemaSQL } from "../db/schema.mjs";
import { seedSQL } from "../db/seed.mjs";

const resetSQL = `
DROP VIEW IF EXISTS vw_seguimiento_jornadas CASCADE;
DROP TABLE IF EXISTS ubicaciones_jornada CASCADE;
DROP TABLE IF EXISTS alertas_jornada CASCADE;
DROP TABLE IF EXISTS jornadas CASCADE;
DROP TABLE IF EXISTS contratos CASCADE;
DROP TABLE IF EXISTS unidades CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP FUNCTION IF EXISTS fn_set_updated_at() CASCADE;
DROP TYPE IF EXISTS tipo_registro_ubicacion CASCADE;
DROP TYPE IF EXISTS tipo_alerta CASCADE;
DROP TYPE IF EXISTS estado_jornada CASCADE;
DROP TYPE IF EXISTS estado_contrato CASCADE;
DROP TYPE IF EXISTS estado_unidad CASCADE;
DROP TYPE IF EXISTS estado_usuario CASCADE;
DROP TYPE IF EXISTS rol_usuario CASCADE;
`;

const showHelp = () => {
  console.log(`
Uso:
  node scripts/db-init-local.mjs [--no-reset]

Variables requeridas:
  DB_HOST
  DB_USER
  DB_PASSWORD
  DB_NAME
  DB_PORT

Opcionales:
  DB_SSL_ENABLED=false   Recomendado para PostgreSQL local
`);
};

const run = async () => {
  if (process.argv.includes("--help")) {
    showHelp();
    return;
  }

  const shouldReset = !process.argv.includes("--no-reset");
  let client;

  try {
    console.log("==> Inicializando base local para HU01");
    client = await getClient();

    await client.query("BEGIN");
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

    if (shouldReset) {
      console.log("==> Limpiando esquema previo");
      await client.query(resetSQL);
    }

    console.log("==> Aplicando schema");
    await client.query(schemaSQL);

    console.log("==> Aplicando seed");
    await client.query(seedSQL);

    await client.query("COMMIT");
    console.log("==> Base local inicializada correctamente");
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("==> Error inicializando la base local:", error.message);
    process.exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }
    await closePool();
  }
};

await run();
