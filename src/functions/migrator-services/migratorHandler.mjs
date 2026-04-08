import { createRequire } from 'module';
import https from 'https';
import http from 'http';
import url from 'url';

const require = createRequire(import.meta.url);
const { default: migrate } = require('node-pg-migrate');
import pg from 'pg';

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
      'Content-Type': '',   // ← VACÍO: requerido por S3 pre-signed URL
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

    req.on('timeout', () => {
      req.destroy(new Error('Timeout enviando respuesta a CloudFormation (10s)'));
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

  const dbConfig = getDbConfig();
  console.log(`📊 Conectando a: ${dbConfig.host}/${dbConfig.database}`);

  if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
    throw new Error('Configuración de base de datos incompleta. Verifica las variables de entorno.');
  }

  let pool = null;

  try {
    pool = new pg.Pool(dbConfig);

    const testClient = await pool.connect();
    console.log('✅ Conexión a base de datos exitosa');
    testClient.release();

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

    let result;
    if (shouldMigrate) {
      result = await runMigrations();
    } else {
      console.log('ℹ️ No se requiere migración (RequestType: Delete)');
      result = { success: true, message: 'No migration needed', skipped: true };
    }

    if (isCloudFormationCustomResource) {
      await sendCloudFormationResponse(event, context, 'SUCCESS', 'Migraciones completadas exitosamente', result);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Error fatal:', error);

    if (isCloudFormationCustomResource) {
      try {
        await sendCloudFormationResponse(event, context, 'FAILED', error.message, { error: error.message, success: false });
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
