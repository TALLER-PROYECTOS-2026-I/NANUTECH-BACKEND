import https from 'https';
import http from 'http';
import url from 'url';
import pg from 'pg';
import { default as migrate } from 'node-pg-migrate';

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

  return config;  // ← Este return debe estar DENTRO de la función
}

async function sendCloudFormationResponse(event, context, status, reason, data) {
  const responseUrl = event.ResponseURL;

  if (!responseUrl) {
    console.log('⚠️ No ResponseURL encontrada');
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
      console.log(`✅ Respuesta enviada, statusCode: ${res.statusCode}`);
      resolve();
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error);
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
    throw new Error('Configuración de base de datos incompleta');
  }

  let pool = null;

  try {
    pool = new pg.Pool(dbConfig);

    const testClient = await pool.connect();
    console.log('✅ Conexión exitosa');
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

    console.log('✅ Migraciones completadas');
    return { success: true, message: 'Migrations completed' };

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

export const handler = async (event, context) => {
  console.log('📥 Event recibido:', JSON.stringify(event, null, 2));

  let isCloudFormationCustomResource = false;
  let shouldMigrate = false;

  try {
    if (event.RequestType && event.ResponseURL) {
      isCloudFormationCustomResource = true;
      shouldMigrate = event.RequestType === 'Create' || event.RequestType === 'Update';
    }

    if (event.action === 'migrate') {
      shouldMigrate = true;
    }

    let result;
    if (shouldMigrate) {
      result = await runMigrations();
    } else {
      result = { success: true, message: 'No migration needed' };
    }

    if (isCloudFormationCustomResource) {
      await sendCloudFormationResponse(event, context, 'SUCCESS', 'OK', result);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Error fatal:', error);

    if (isCloudFormationCustomResource) {
      await sendCloudFormationResponse(event, context, 'FAILED', error.message, { error: error.message });
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};
