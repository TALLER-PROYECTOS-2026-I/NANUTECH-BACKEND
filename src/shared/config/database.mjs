import pg from "pg";

const { Pool } = pg;
let pool = null;

// Detectar entorno local
const isLocal =
  process.env.NODE_ENV === "development" ||
  process.env.AWS_SAM_LOCAL === "true" ||
  !process.env.AWS_EXECUTION_ENV; // Lambda no tiene esta variable

/**
 * Obtener nombre del entorno actual para logging
 */
function getEnvironmentName() {
  if (isLocal) return "LOCAL";
  if (process.env.NODE_ENV === "testing") return "TESTING";
  if (process.env.NODE_ENV === "production") return "PRODUCTION";
  return "UNKNOWN";
}

/**
 * Obtener pool de conexiones
 * Las variables de entorno vienen de GitHub Environments:
 * - Rama testing → Environment: testing (variables de testing en AWS)
 * - Rama main → Environment: production (variables de producción en AWS)
 */
async function getPool() {
  if (pool) {
    return pool;
  }

  const env = getEnvironmentName();

  // Las variables de entorno ya están inyectadas por GitHub Environments
  const poolConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || "5432"),
    max: 20, // Máximo de conexiones en el pool
    idleTimeoutMillis: 30000, // Tiempo que una conexión inactiva permanece
    connectionTimeoutMillis: 5000,
  };

  // Validar que todas las variables necesarias existan
  if (
    !poolConfig.host ||
    !poolConfig.user ||
    !poolConfig.password ||
    !poolConfig.database
  ) {
    console.error(`❌ [${env}] Faltan variables de entorno de base de datos:`, {
      host: !!poolConfig.host,
      user: !!poolConfig.user,
      password: !!poolConfig.password,
      database: !!poolConfig.database,
    });
    throw new Error("Configuración de base de datos incompleta");
  }

  // SSL solo en la nube (testing y production)
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };

  console.log(
    `🔌 [${env}] Creando pool de conexiones a: ${poolConfig.host}/${poolConfig.database}`,
  );
  pool = new Pool(poolConfig);

  // Eventos de diagnóstico
  pool.on("connect", () =>
    console.log(`✅ [${env}] Nueva conexión establecida`),
  );
  pool.on("error", (err) => console.error(`❌ [${env}] Error en pool:`, err));

  // Probar conexión inicial
  try {
    const client = await pool.connect();
    console.log(`✅ [${env}] Conectado exitosamente a ${poolConfig.database}`);
    client.release();
  } catch (error) {
    console.error(`❌ [${env}] Error de conexión inicial:`, error.message);
    pool = null;
    throw error;
  }

  return pool;
}

/**
 * Ejecutar query
 */
export async function query(text, params = []) {
  const start = Date.now();
  const poolInstance = await getPool();
  const env = getEnvironmentName();

  try {
    const result = await poolInstance.query(text, params);
    const duration = Date.now() - start;

    // Log solo en desarrollo o debug
    if (isLocal || process.env.LOG_LEVEL === "debug") {
      console.log(
        `📊 [${env}] Query (${duration}ms): ${text.substring(0, 100)}`,
      );
      if (result.rowCount !== undefined) {
        console.log(`   Filas: ${result.rowCount}`);
      }
    }

    return result;
  } catch (error) {
    console.error(`❌ [${env}] Error en query:`, error.message);
    console.error(`   Query:`, text);
    throw error;
  }
}

/**
 * Obtener cliente para transacciones
 */
export async function getClient() {
  const poolInstance = await getPool();
  return await poolInstance.connect();
}

/**
 * Cerrar pool (útil para tests o graceful shutdown)
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log(`🔌 [${getEnvironmentName()}] Pool de conexiones cerrado`);
  }
}

// Exportar todo
export default { query, getClient, closePool, getPool };
