import { createRequire } from 'module';
import https from 'https';
import http from 'http';
import url from 'url';

const require = createRequire(import.meta.url);
const { default: migrate } = require('node-pg-migrate');
import pg from 'pg';

// Configuración de conexión (igual que en database.mjs)
function getDbConfig() {
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  // Configuración SSL (misma lógica que en database.mjs)
  const explicitSsl = process.env.DB_SSL_ENABLED?.toLowerCase();
  
  if (explicitSsl === 'true') {
    config.ssl = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED?.toLowerCase() === 'true'
    };
    console.log('🔒 SSL habilitado para migrador');
  } else if (explicitSsl === 'false') {
    console.log('🔓 SSL deshabilitado para migrador');
  } else {
    // Por defecto, habilitar SSL para RDS
    config.ssl = {
      rejectUnauthorized: false
    };
    console.log('🔒 SSL habilitado por defecto (modo flexible)');
  }

  return config;
}

/**
 * Envía respuesta a CloudFormation Custom Resource
 */
async function sendCloudFormationResponse(event, context, status, reason, data) {
  const responseUrl = event.ResponseURL;
  
  if (!responseUrl) {
    console.log('⚠️ No ResponseURL encontrada, no es un Custom Resource de CFN');
    return;
  }
  
  const responseBody = JSON.stringify({
    Status: status,
    Reason: reason || `Ver detalles en CloudWatch Logs: ${context.logGroupName}`,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data || { success: status === 'SUCCESS' }
  });
  
  console.log(`📤 Enviando respuesta a CloudFormation: ${status}`);
  
  const parsedUrl = url.parse(responseUrl);
  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.path,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(responseBody)
    }
  };
  
  return new Promise((resolve, reject) => {
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      console.log(`✅ Respuesta enviada a CloudFormation, statusCode: ${res.statusCode}`);
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`CloudFormation respondió con ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`❌ Error enviando respuesta a CloudFormation:`, error);
      reject(error);
    });
    
    req.write(responseBody);
    req.end();
  });
}

/**
 * Ejecuta las migraciones pendientes
 */
async function runMigrations() {
  console.log('🔄 Iniciando migraciones...');
  
  const dbConfig = getDbConfig();
  console.log(`📊 Conectando a: ${dbConfig.host}/${dbConfig.database}`);
  
  // Verificar configuración
  if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
    throw new Error('Configuración de base de datos incompleta. Verifica las variables de entorno.');
  }
  
  let pool = null;
  
  try {
    // Crear pool de conexiones
    pool = new pg.Pool(dbConfig);
    
    // Probar conexión antes de migrar
    const testClient = await pool.connect();
    console.log('✅ Conexión a base de datos exitosa');
    testClient.release();
    
    // Ejecutar migraciones
    await migrate({
      dbClient: pool,
      direction: 'up',
      migrationsTable: 'pgmigrations',
      dir: 'db/migrations',
      count: Infinity,
      verbose: true,
      createMigrationsSchema: true,
    });
    
    console.log('✅ Migraciones completadas exitosamente');
    return { success: true, message: 'Migrations completed successfully' };
    
  } catch (error) {
    console.error('❌ Error en migraciones:', error);
    throw error;
    
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 Pool de conexiones cerrado');
    }
  }
}

/**
 * Handler principal para Lambda
 */
export const handler = async (event, context) => {
  console.log('📥 Event recibido:', JSON.stringify(event, null, 2));
  console.log(`🔧 Function: ${context.functionName}, LogGroup: ${context.logGroupName}`);
  
  let isCloudFormationCustomResource = false;
  let shouldMigrate = false;
  
  try {
    // Caso 1: Custom Resource de CloudFormation
    if (event.RequestType && event.ResponseURL) {
      isCloudFormationCustomResource = true;
      shouldMigrate = event.RequestType === 'Create' || event.RequestType === 'Update';
      console.log(`🔷 Custom Resource - RequestType: ${event.RequestType}, ShouldMigrate: ${shouldMigrate}`);
    }
    
    // Caso 2: Invocación directa desde AWS CLI o SDK
    if (event.action === 'migrate') {
      shouldMigrate = true;
      console.log('🔷 Invocación directa con action=migrate');
    }
    
    // Caso 3: Invocación por defecto (sin parámetros)
    if (!event.action && !event.RequestType) {
      shouldMigrate = true;
      console.log('🔷 Invocación por defecto');
    }
    
    // Ejecutar migraciones si es necesario
    let result;
    if (shouldMigrate) {
      result = await runMigrations();
    } else {
      console.log('ℹ️ No se requiere migración');
      result = { success: true, message: 'No migration needed', skipped: true };
    }
    
    // Si es Custom Resource, enviar respuesta a CloudFormation
    if (isCloudFormationCustomResource) {
      await sendCloudFormationResponse(
        event, 
        context, 
        'SUCCESS', 
        'Migraciones completadas exitosamente',
        result
      );
    }
    
    // Respuesta para invocación directa
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    
    // Si es Custom Resource, enviar fallo a CloudFormation
    if (isCloudFormationCustomResource) {
      try {
        await sendCloudFormationResponse(
          event,
          context,
          'FAILED',
          error.message,
          { error: error.message, success: false }
        );
      } catch (cfnError) {
        console.error('❌ Error enviando respuesta a CloudFormation:', cfnError);
      }
    }
    
    // Respuesta para invocación directa
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
