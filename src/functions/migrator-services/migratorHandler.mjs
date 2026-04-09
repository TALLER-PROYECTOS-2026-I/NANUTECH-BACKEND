import https from 'https';
import http from 'http';
import url from 'url';
import pg from 'pg';
import pgMigrate from 'node-pg-migrate';

// Timeout de 6 minutos
const MIGRATION_TIMEOUT_MS = 360000;

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

/**
 * Limpia completamente la base de datos eliminando todas las tablas,
 * tipos ENUM, funciones y triggers en el orden correcto
 */
async function cleanDatabase() {
  console.log('🧹 Iniciando limpieza completa de la base de datos...');
  const startTime = Date.now();
  
  const dbConfig = getDbConfig();
  let pool = null;
  let client = null;
  
  try {
    pool = new pg.Pool(dbConfig);
    client = await pool.connect();
    
    console.log('📡 Conexión establecida para limpieza');
    
    // Deshabilitar temporalmente las restricciones para evitar errores de dependencias circulares
    await client.query('SET session_replication_role = replica;');
    console.log('🔓 Restricciones deshabilitadas temporalmente');
    
    // 1. Eliminar vistas
    const viewsQuery = `
      SELECT tablename 
      FROM pg_views 
      WHERE schemaname = 'public';
    `;
    const { rows: views } = await client.query(viewsQuery);
    
    for (const view of views) {
      try {
        await client.query(`DROP VIEW IF EXISTS ${view.tablename} CASCADE;`);
        console.log(`✅ Vista eliminada: ${view.tablename}`);
      } catch (err) {
        console.log(`⚠️ Error eliminando vista ${view.tablename}: ${err.message}`);
      }
    }
    
    // 2. Eliminar triggers
    const triggersQuery = `
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public';
    `;
    const { rows: triggers } = await client.query(triggersQuery);
    
    for (const trigger of triggers) {
      try {
        await client.query(`DROP TRIGGER IF EXISTS ${trigger.trigger_name} ON ${trigger.event_object_table} CASCADE;`);
        console.log(`✅ Trigger eliminado: ${trigger.trigger_name}`);
      } catch (err) {
        console.log(`⚠️ Error eliminando trigger ${trigger.trigger_name}: ${err.message}`);
      }
    }
    
    // 3. Eliminar funciones
    const functionsQuery = `
      SELECT proname, oid 
      FROM pg_proc 
      WHERE pronamespace = 'public'::regnamespace 
      AND proname NOT IN ('fn_set_updated_at');
    `;
    const { rows: functions } = await client.query(functionsQuery);
    
    for (const func of functions) {
      try {
        await client.query(`DROP FUNCTION IF EXISTS ${func.proname} CASCADE;`);
        console.log(`✅ Función eliminada: ${func.proname}`);
      } catch (err) {
        console.log(`⚠️ Error eliminando función ${func.proname}: ${err.message}`);
      }
    }
    
    // 4. Eliminar todas las tablas del esquema public en orden inverso (hijas primero)
    const tablesQuery = `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename DESC;
    `;
    
    const { rows: tables } = await client.query(tablesQuery);
    
    if (tables.length === 0) {
      console.log('ℹ️ No se encontraron tablas para limpiar');
    } else {
      console.log(`📋 Tablas a eliminar (${tables.length}): ${tables.map(r => r.tablename).join(', ')}`);
      
      // Eliminar cada tabla con CASCADE
      for (const table of tables) {
        const tableName = table.tablename;
        try {
          await client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
          console.log(`✅ Tabla eliminada: ${tableName}`);
        } catch (err) {
          console.log(`⚠️ Error eliminando ${tableName}: ${err.message}`);
        }
      }
    }
    
    // 5. Eliminar tipos ENUM
    const enumTypesQuery = `
      SELECT typname 
      FROM pg_type 
      WHERE typcategory = 'E' 
      AND typnamespace = 'public'::regnamespace;
    `;
    
    const { rows: enumTypes } = await client.query(enumTypesQuery);
    
    for (const enumType of enumTypes) {
      const typeName = enumType.typname;
      try {
        await client.query(`DROP TYPE IF EXISTS ${typeName} CASCADE;`);
        console.log(`✅ Tipo ENUM eliminado: ${typeName}`);
      } catch (err) {
        console.log(`⚠️ Error eliminando tipo ${typeName}: ${err.message}`);
      }
    }
    
    // 6. Limpiar la tabla de migraciones si existe
    try {
      await client.query(`DROP TABLE IF EXISTS pgmigrations CASCADE;`);
      console.log('✅ Tabla de migraciones eliminada');
    } catch (err) {
      console.log(`⚠️ Error eliminando tabla de migraciones: ${err.message}`);
    }
    
    // Re-habilitar restricciones
    await client.query('SET session_replication_role = origin;');
    console.log('🔒 Restricciones re-habilitadas');
    
    const duration = Date.now() - startTime;
    console.log(`✅ Limpieza completada exitosamente en ${duration / 1000} segundos`);
    
  } catch (error) {
    console.error('❌ Error durante limpieza:', error);
    throw error;
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

async function runMigrations(shouldClean = true) {
  console.log('🔄 Iniciando proceso de migraciones...');
  const startTime = Date.now();

  const dbConfig = getDbConfig();
  console.log(`📊 Conectando a: ${dbConfig.host}/${dbConfig.database}`);

  if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
    throw new Error('Configuración de base de datos incompleta');
  }

  let pool = null;

  try {
    pool = new pg.Pool(dbConfig);

    const testClient = await pool.connect();
    console.log('✅ Conexión exitosa a la base de datos');
    testClient.release();

    // Limpiar la base de datos antes de migrar si está habilitado
    if (shouldClean) {
      await cleanDatabase();
      console.log('✅ Base de datos limpiada correctamente');
    } else {
      console.log('ℹ️ Omitiendo limpieza de base de datos (shouldClean=false)');
    }

    // Ejecutar migraciones
    console.log('📦 Ejecutando migraciones...');
    const runner = pgMigrate.default || pgMigrate;

    await runner({
      dbClient: pool,
      direction: 'up',
      migrationsTable: 'pgmigrations',
      dir: 'db/migrations',
      count: Infinity,
      verbose: true,
      createMigrationsSchema: true,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Migraciones completadas exitosamente en ${duration / 1000} segundos`);
    return { 
      success: true, 
      message: `Migrations completed in ${duration / 1000}s`,
      cleaned: shouldClean
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error después de ${duration / 1000}s:`, error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 Conexión a base de datos cerrada');
    }
  }
}

export const handler = async (event, context) => {
  console.log('📥 Event recibido:', JSON.stringify(event, null, 2));
  console.log(`🔧 Function: ${context.functionName}, LogGroup: ${context.logGroupName}`);

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

    let result;
    if (shouldMigrate) {
      // Determinar si se debe limpiar la base de datos antes de migrar
      // Por defecto: true, a menos que se especifique clean=false
      const shouldClean = event.clean !== false && event.clean !== 'false';
      console.log(`🧹 Limpiar base de datos antes de migrar: ${shouldClean}`);
      result = await runMigrations(shouldClean);
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
