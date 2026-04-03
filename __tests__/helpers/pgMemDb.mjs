import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { newDb } from "pg-mem";
import {
  setPoolForTests,
  resetPoolForTests,
} from "../../src/shared/config/database.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadSql(fileName) {
  return fs.readFile(path.join(__dirname, "../../db", fileName), "utf8");
}

export async function startPgMem({ seed = true } = {}) {
  const db = newDb({ autoCreateForeignKeyIndices: true });

  const schemaSql = await loadSql("schema.sql");
  const seedSql = await loadSql("seed.sql");

  db.public.none(schemaSql);

  if (seed) {
    db.public.none(seedSql);
  }

  const { Pool } = db.adapters.createPg();
  const pool = new Pool();

  await setPoolForTests(pool);

  return { db, pool };
}

export async function stopPgMem() {
  await resetPoolForTests();
}