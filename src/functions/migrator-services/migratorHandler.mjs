import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { default: migrate } = require('node-pg-migrate');
const pg = require('pg');

// Configuración de conexión
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL_ENABLED === 'true' ? {
    rejectUnauthorized: false
  } : false
};

/**
 * Ejecuta las migraciones pendientes
 */
async function runMigrations() {
  console.log('🔄 Iniciando migraciones...');
  console.log(`📊 Conectando a: ${dbConfig.host}/${dbConfig.database}`);
  
  try {
    // Crear pool de conexiones
    const pool = new pg.Pool(dbConfig);
    
    // Ejecutar migraciones
    await migrate({
      dbClient: pool,
      direction: 'up',
      migrationsTable: 'pgmigrations',
      dir: 'db/migrations',
      count: Infinity, // Ejecuta todas las migraciones pendientes
      verbose: true,
      createMigrationsSchema: true,
    });
    
    // Cerrar pool
    await pool.end();
    
    console.log('✅ Migraciones completadas exitosamente');
    return { success: true, message: 'Migrations completed successfully' };
  } catch (error) {
    console.error('❌ Error en migraciones:', error);
    throw error;
  }
}

/**
 * Handler principal para Lambda
 */
export const handler = async (event) => {
  console.log('📥 Event recibido:', JSON.stringify(event, null, 2));
  
  // Soporte para diferentes tipos de invocación
  let shouldMigrate = false;
  
  // Caso 1: Invocación directa desde AWS CLI o SDK
  if (event.action === 'migrate') {
    shouldMigrate = true;
  }
  
  // Caso 2: Custom Resource de CloudFormation
  if (event.RequestType && event.ResourceType) {
    shouldMigrate = event.RequestType === 'Create' || event.RequestType === 'Update';
  }
  
  // Caso 3: Invocación por defecto (siempre ejecutar)
  if (!event.action && !event.RequestType) {
    shouldMigrate = true;
  }
  
  if (!shouldMigrate) {
    console.log('ℹ️ No se requiere migración');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'No migration needed' })
    };
  }
  
  try {
    const result = await runMigrations();
    
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error.message,
        error: error.toString()
      })
    };
  }
};
