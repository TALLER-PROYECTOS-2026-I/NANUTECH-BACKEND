import https from 'https';
import http from 'http';
import url from 'url';
import pg from 'pg';
import { default as migrate } from 'node-pg-migrate';

// Timeout de 6 minutos (360 segundos)
const MIGRATION_TIMEOUT_MS = 360000; // 6 minutos

function getDbConfig() {
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  const explicitSsl = process.env.DB_SSL_ENABLED?.toLowerCase();

  if (explicitSsl === 'true') {
    config.ssl = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED?.toLowerCase() === 'true'
    };
    console.log('🔒 SSL habilitado para migrador');
  } else if (explicitSsl === 'false') {
    console.log('🔓 SSL deshabilitado para migrador');
  } else {
    config.ssl = { rejectUnauthorized: false };
    console.log('🔒 SSL habilitado por defecto (modo flexible)');
  }

  return config;
}

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
    timeout: 10000,
    headers: {
      'Content-Type': '',
      'Content-Length': Buffer.byteLength(responseBody)
    }
  };

  return new Promise((resolve, reject) => {
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      console.log(`✅ Respuesta enviada a CloudFormation, statusCode: ${res.statusCode}`);
      resolve();
    });

    req.on('error', (error) => {
      console.error('❌ Error enviando respuesta a CloudFormation:', error);
      reject(error);
    });

    req.write(responseBody);
    req.end();
  });
}

async function runMigrations() {
  console.log('🔄 Iniciando migraciones...');
  const startTime = Date.now();

  const dbConfig = getDbConfig();
  console.log(`📊 Conectando a: ${dbConfig.host}/${dbConfig.database}`);

  if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
    throw new Error('Configuración de base de datos incompleta');
  }

  let pool = null;

  try {
    pool = new pg.Pool(dbConfig);

    // Timeout para conexión inicial (30 segundos)
    const connectionPromise = pool.connect();
    const connectionTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout conectando a la base de datos (30s)')), 30000);
    });
    
    const testClient = await Promise.race([connectionPromise, connectionTimeout]);
    console.log('✅ Conexión exitosa');
    testClient.release();

    // Ejecutar migraciones con timeout de 6 minutos
    const migrationPromise = migrate({
      dbClient: pool,
      direction: 'up',
      migrationsTable: 'pgmigrations',
      dir: 'db/migrations',
      count: Infinity,
      verbose: true,
      createMigrationsSchema: true,
    });

    const migrationTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout: Migraciones tomaron más de ${MIGRATION_TIMEOUT_MS / 1000} segundos`)), MIGRATION_TIMEOUT_MS);
    });

    await Promise.race([migrationPromise, migrationTimeout]);

    const duration = Date.now() - startTime;
    console.log(`✅ Migraciones completadas en ${duration / 1000} segundos`);
    return { success: true, message: `Migrations completed in ${duration / 1000}s` };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error después de ${duration / 1000}s:`, error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

export const handler = async (event, context) => {
  console.log('📥 Event recibido:', JSON.stringify(event, null, 2));
  console.log(`🔧 Function: ${context.functionName}, LogGroup: ${context.logGroupName}`);
  
  // Timeout global de 6 minutos
  let timeoutId = null;
  
  let isCloudFormationCustomResource = false;
  let shouldMigrate = false;

  try {
    // Detectar si es Custom Resource de CloudFormation
    if (event.RequestType && event.ResponseURL) {
      isCloudFormationCustomResource = true;
      shouldMigrate = event.RequestType === 'Create' || event.RequestType === 'Update';
      console.log(`🔷 Custom Resource - RequestType: ${event.RequestType}, ShouldMigrate: ${shouldMigrate}`);
    }

    // Invocación directa con action=migrate
    if (event.action === 'migrate') {
      shouldMigrate = true;
      console.log('🔷 Invocación directa con action=migrate');
    }

    // Invocación por defecto
    if (!event.action && !event.RequestType) {
      shouldMigrate = true;
      console.log('🔷 Invocación por defecto');
    }

    // Configurar timeout global
    if (isCloudFormationCustomResource) {
      timeoutId = setTimeout(async () => {
        console.error(`❌ Timeout de ${MIGRATION_TIMEOUT_MS / 1000} segundos alcanzado`);
        await sendCloudFormationResponse(event, context, 'FAILED', 
          `Migration timeout after ${MIGRATION_TIMEOUT_MS / 1000} seconds`, 
          { error: 'timeout', success: false });
      }, MIGRATION_TIMEOUT_MS);
    }

    let result;
    if (shouldMigrate) {
      result = await runMigrations();
    } else {
      console.log('ℹ️ No se requiere migración (RequestType: Delete)');
      result = { success: true, message: 'No migration needed', skipped: true };
    }

    // Limpiar timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Enviar respuesta exitosa a CloudFormation
    if (isCloudFormationCustomResource) {
      await sendCloudFormationResponse(event, context, 'SUCCESS', 'Migraciones completadas exitosamente', result);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Error fatal:', error);
    
    // Limpiar timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Enviar respuesta de fallo a CloudFormation
    if (isCloudFormationCustomResource) {
      try {
        await sendCloudFormationResponse(event, context, 'FAILED', error.message, { 
          error: error.message, 
          success: false,
          timeout: MIGRATION_TIMEOUT_MS / 1000
        });
      } catch (cfnError) {
        console.error('❌ Error enviando respuesta FAILED a CloudFormation:', cfnError);
      }
    }

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
