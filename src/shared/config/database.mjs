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
 * Configuración SSL mejorada para RDS
 * Soluciona el error: "no pg_hba.conf entry for host, no encryption"
 */
function getSslConfig() {
  const env = getEnvironmentName();
  const explicitSsl = process.env.DB_SSL_ENABLED?.toLowerCase();
  
  // Para entornos locales o pruebas sin SSL
  if (isLocal && explicitSsl !== "true") {
    console.log(`🔓 [${env}] SSL deshabilitado (entorno local)`);
    return false;
  }

  // Si explícitamente se pide false
  if (explicitSsl === "false") {
    console.log(`🔓 [${env}] SSL deshabilitado por configuración`);
    return false;
  }

  // Configuración SSL para RDS (default o explícitamente true)
  // RDS requiere SSL pero NO necesita verificación estricta del certificado
  // a menos que estés usando certificados personalizados
  const sslConfig = {
    rejectUnauthorized: false, // AWS RDS funciona con rejectUnauthorized: false
    // Para producción con certificados específicos, usar:
    // ca: fs.readFileSync('./rds-ca-2019-root.pem').toString()
  };

  // Si el entorno requiere verificación estricta (solo para seguridad máxima)
  if (process.env.DB_SSL_REJECT_UNAUTHORIZED?.toLowerCase() === "true") {
    sslConfig.rejectUnauthorized = true;
    console.log(`🔒 [${env}] SSL con verificación estricta habilitada`);
  } else {
    console.log(`🔒 [${env}] SSL habilitado (modo flexible para RDS)`);
  }

  return sslConfig;
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
    connectionTimeoutMillis: 10000, // Aumentado a 10 segundos para conexiones SSL
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

  // Agregar configuración SSL si es necesario
  const sslConfig = getSslConfig();
  if (sslConfig) {
    poolConfig.ssl = sslConfig;
    console.log(`🔒 [${env}] SSL configurado para conexión a RDS`);
  } else {
    console.log(`🔓 [${env}] Conexión sin SSL`);
  }

  console.log(
    `🔌 [${env}] Creando pool de conexiones a: ${poolConfig.host}/${poolConfig.database}`,
  );
  
  try {
    pool = new Pool(poolConfig);

    // Eventos de diagnóstico
    pool.on("connect", () => {
      console.log(`✅ [${env}] Nueva conexión establecida${sslConfig ? ' (SSL)' : ''}`);
    });
    
    pool.on("error", (err) => {
      console.error(`❌ [${env}] Error en pool:`, err.message);
    });

    // Probar conexión inicial
    const client = await pool.connect();
    
    // Verificar si la conexión es SSL
    if (client.connection && client.connection.stream) {
      const isSSL = client.connection.stream.encrypted;
      console.log(`✅ [${env}] Conectado exitosamente a ${poolConfig.database}${isSSL ? ' 🔒 SSL activo' : ' 🔓 SSL inactivo'}`);
    } else {
      console.log(`✅ [${env}] Conectado exitosamente a ${poolConfig.database}`);
    }
    
    client.release();
  } catch (error) {
    console.error(`❌ [${env}] Error de conexión inicial:`, error.message);
    
    // Si el error es relacionado con SSL, dar una sugerencia
    if (error.message.includes("SSL") || error.message.includes("encryption")) {
      console.error(`💡 [${env}] Sugerencia: Verifica la configuración SSL en RDS.`);
      console.error(`   - Si RDS requiere SSL, asegúrate que DB_SSL_ENABLED=true`);
      console.error(`   - Si RDS NO requiere SSL, asegúrate que DB_SSL_ENABLED=false`);
    }
    
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
    console.error(`   Query:`, text.substring(0, 200));
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
export default { query, getClient, closePool, getPool, setPoolForTests, resetPoolForTests };

// Funciones auxiliares para tests (mantener igual)
export async function setPoolForTests(externalPool) {
  if (pool && pool !== externalPool && typeof pool.end === "function") {
    try {
      await pool.end();
    } catch (error) {
      console.warn("⚠️ Error cerrando pool anterior de tests:", error.message);
    }
  }

  pool = externalPool;
  console.log(`🧪 [${getEnvironmentName()}] Pool de pruebas inyectado`);
}

export async function resetPoolForTests() {
  if (pool && typeof pool.end === "function") {
    try {
      await pool.end();
    } catch (error) {
      console.warn("⚠️ Error cerrando pool en reset:", error.message);
    }
  }

  pool = null;
  console.log(`🧪 [${getEnvironmentName()}] Pool de pruebas reseteado`);
}
