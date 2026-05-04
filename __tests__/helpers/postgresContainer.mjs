import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import {
  setPoolForTests,
  resetPoolForTests,
} from "../../src/shared/config/database.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let container = null;
let pool = null;

async function loadSql(fileName) {
  return fs.readFile(path.join(__dirname, "../../db", fileName), "utf8");
}

export async function startPostgresContainer({ seed = true } = {}) {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("nanutech_test")
    .withUsername("test_user")
    .withPassword("test_pass")
    .start();

  process.env.DB_HOST = container.getHost();
  process.env.DB_PORT = String(container.getPort());
  process.env.DB_NAME = container.getDatabase();
  process.env.DB_USER = container.getUsername();
  process.env.DB_PASSWORD = container.getPassword();
  process.env.DB_SSL = "false";

  pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const schemaSql = await loadSql("schema.sql");
  const seedSql = await loadSql("seed.sql");

  await pool.query(schemaSql);

  if (seed) {
    await pool.query(seedSql);
  }

  await setPoolForTests(pool);

  return { container, pool };
}

export async function stopPostgresContainer() {
  await resetPoolForTests();

  if (container) {
    await container.stop();
    container = null;
  }

  pool = null;
}