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

  // ============================================
  // REGISTRAR FUNCIONES FALTANTES PARA pg-mem
  // ============================================

  // 1. Registrar gen_random_uuid() (pgcrypto)
  db.public.registerFunction({
    name: "gen_random_uuid",
    args: [],
    returns: "uuid",
    implementation: () => {
      // Generar UUID v4 manualmente
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        },
      );
    },
  });

  // 2. Registrar uuid_generate_v4() (uuid-ossp) - por si acaso
  db.public.registerFunction({
    name: "uuid_generate_v4",
    args: [],
    returns: "uuid",
    implementation: () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        },
      );
    },
  });

  // 3. Registrar la extensión pgcrypto para que CREATE EXTENSION no falle
  // Esto hace que pg-mem "finja" que la extensión existe
  db.registerExtension("pgcrypto", (schema) => {
    // La extensión ya tiene las funciones registradas arriba
    // Este callback se ejecuta cuando alguien hace CREATE EXTENSION
  });

  const schemaSql = await loadSql("schema.sql");
  const seedSql = await loadSql("seed.sql");

  // Ejecutar el schema (ahora CREATE EXTENSION no fallará)
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
