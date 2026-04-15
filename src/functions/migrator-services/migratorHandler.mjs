import https from 'https';
import http from 'http';
import url from 'url';
import pg from 'pg';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

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

async function cleanDatabase() {
  console.log('🧹 Iniciando limpieza completa de la base de datos...');
  console.log('⚠️ ATENCIÓN: Se ELIMINARÁN TODOS los datos existentes');
  const startTime = Date.now();
  
  const dbConfig = getDbConfig();
  let pool = null;
  let client = null;
  
  try {
    pool = new pg.Pool(dbConfig);
    client = await pool.connect();
    
    console.log('📡 Conexión establecida para limpieza');
    
    // Deshabilitar restricciones temporalmente
    await client.query('SET session_replication_role = replica;');
    console.log('🔓 Restricciones deshabilitadas temporalmente');
    
    // Eliminar todas las vistas
    console.log('📋 Eliminando vistas...');
    const views = await client.query(`
      SELECT viewname FROM pg_views WHERE schemaname = 'public'
    `);
    
    for (const view of views.rows) {
      try {
        await client.query(`DROP VIEW IF EXISTS "${view.viewname}" CASCADE;`);
        console.log(`  ✅ Vista eliminada: ${view.viewname}`);
      } catch (err) {
        console.log(`  ⚠️ Error eliminando vista ${view.viewname}: ${err.message}`);
      }
    }
    
    // Eliminar todas las funciones
    console.log('📋 Eliminando funciones...');
    const functions = await client.query(`
      SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace
    `);
    
    for (const func of functions.rows) {
      try {
        await client.query(`DROP FUNCTION IF EXISTS "${func.proname}" CASCADE;`);
        console.log(`  ✅ Función eliminada: ${func.proname}`);
      } catch (err) {
        console.log(`  ⚠️ Error eliminando función ${func.proname}: ${err.message}`);
      }
    }
    
    // Eliminar todas las tablas (en orden inverso)
    console.log('📋 Eliminando tablas...');
    const tables = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    
    const tableNames = tables.rows.map(r => r.tablename).reverse();
    
    if (tableNames.length === 0) {
      console.log('  ℹ️ No se encontraron tablas para eliminar');
    } else {
      console.log(`  📋 Tablas a eliminar (${tableNames.length}): ${tableNames.join(', ')}`);
      
      for (const tableName of tableNames) {
        try {
          await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
          console.log(`  ✅ Tabla eliminada: ${tableName}`);
        } catch (err) {
          console.log(`  ⚠️ Error eliminando ${tableName}: ${err.message}`);
        }
      }
    }
    
    // Eliminar todos los tipos ENUM
    console.log('📋 Eliminando tipos ENUM...');
    const enumTypes = await client.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typcategory = 'E' 
      AND typnamespace = 'public'::regnamespace
    `);
    
    for (const enumType of enumTypes.rows) {
      try {
        await client.query(`DROP TYPE IF EXISTS "${enumType.typname}" CASCADE;`);
        console.log(`  ✅ Tipo ENUM eliminado: ${enumType.typname}`);
      } catch (err) {
        console.log(`  ⚠️ Error eliminando tipo ${enumType.typname}: ${err.message}`);
      }
    }
    
    // Re-habilitar restricciones
    await client.query('SET session_replication_role = origin;');
    console.log('🔒 Restricciones re-habilitadas');
    
    const duration = Date.now() - startTime;
    console.log(`✅ Limpieza completada exitosamente en ${duration / 1000} segundos`);
    console.log('🗑️ TODOS los datos y estructuras han sido eliminados');
    
  } catch (error) {
    console.error('❌ Error durante limpieza:', error);
    throw error;
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

async function runSeed() {
  console.log('🌱 ========== INICIANDO SEED DE DATOS ==========');
  const startTime = Date.now();
  
  const dbConfig = getDbConfig();
  let pool = null;
  
  try {
    pool = new pg.Pool(dbConfig);
    
    // Leer archivo seed.sql
    const seedDir = path.join(process.cwd(), 'db/seed');
    const seedFile = path.join(seedDir, 'seed.sql');
    
    console.log(`📂 Buscando archivo seed en: ${seedFile}`);
    
    const content = await readFile(seedFile, 'utf8');
    console.log(`✅ Archivo seed.sql encontrado (${content.length} bytes)`);
    
    // Extraer la sección UP (entre -- migrate:up y -- migrate:down)
    let seedSQL = '';
    const upMatch = content.match(/--\s*migrate:up([\s\S]*?)--\s*migrate:down/i);
    
    if (upMatch) {
      seedSQL = upMatch[1].trim();
      console.log('✅ Sección -- migrate:up encontrada');
    } else {
      // Si no encuentra el formato, usa todo el archivo
      console.log('⚠️ No se encontró sección -- migrate:up, usando archivo completo');
      seedSQL = content;
    }
    
    if (!seedSQL) {
      throw new Error('No hay SQL para ejecutar en seed.sql');
    }
    
    console.log(`📝 SQL a ejecutar (${seedSQL.length} bytes)`);
    console.log('🌱 Insertando datos de prueba...');
    
    // Ejecutar seed
    await pool.query(seedSQL);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Seed completado exitosamente en ${duration / 1000} segundos`);
    console.log('🌱 ========== SEED FINALIZADO ==========');
    
    return { seeded: true, seedTime: duration };
    
  } catch (error) {
    console.error('❌ Error durante seed:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

async function runMigrations(shouldClean = true, shouldSeed = false) {
  console.log('🔄 Iniciando proceso de migraciones...');
  const startTime = Date.now();

  const dbConfig = getDbConfig();
  let pool = null;

  try {
    pool = new pg.Pool(dbConfig);
    const testClient = await pool.connect();
    console.log('✅ Conexión exitosa a la base de datos');
    testClient.release();

    if (shouldClean) {
      await cleanDatabase();
      console.log('✅ Base de datos limpiada correctamente');
    }

    // Crear tabla de control de migraciones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pgmigrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        run_on TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Leer archivos SQL ordenados
    const migrationsDir = path.join(process.cwd(), 'db/migrations');
    const files = (await readdir(migrationsDir))
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`📋 Archivos de migración encontrados: ${files.length}`);
    files.forEach(f => console.log(`   - ${f}`));

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      // Verificar si ya fue aplicada
      const { rows } = await pool.query(
        'SELECT id FROM pgmigrations WHERE name = $1', [file]
      );
      
      if (rows.length > 0 && !shouldClean) {
        console.log(`⏭️  Saltando (ya aplicada): ${file}`);
        skippedCount++;
        continue;
      }

      console.log(`📦 Aplicando: ${file}`);
      const content = await readFile(path.join(migrationsDir, file), 'utf8');

      // Extraer la sección UP
      let upSql = '';
      const upMatch = content.match(/--\s*migrate:up([\s\S]*?)--\s*migrate:down/i);
      
      if (upMatch) {
        upSql = upMatch[1].trim();
      } else {
        const altMatch = content.match(/--\s*Up([\s\S]*?)(?:--\s*Down|$)/i);
        if (altMatch) {
          upSql = altMatch[1].trim();
        } else {
          throw new Error(`No se encontró sección '-- migrate:up' en ${file}`);
        }
      }

      if (!upSql) {
        console.log(`  ⚠️ Advertencia: No hay SQL en ${file}, saltando`);
        continue;
      }

      try {
        await pool.query(upSql);
        
        if (!shouldClean) {
          await pool.query('INSERT INTO pgmigrations (name) VALUES ($1)', [file]);
        }
        
        console.log(`  ✅ ${file} aplicada correctamente`);
        appliedCount++;
      } catch (err) {
        console.error(`  ❌ Error aplicando ${file}: ${err.message}`);
        throw err;
      }
    }

    // Si fue limpieza total, registrar TODAS las migraciones
    if (shouldClean) {
      console.log('📝 Registrando todas las migraciones ejecutadas...');
      for (const file of files) {
        await pool.query(
          'INSERT INTO pgmigrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', 
          [file]
        );
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Migraciones completadas en ${duration / 1000}s`);
    console.log(`📊 Resumen: ${appliedCount} aplicadas, ${skippedCount} saltadas`);
    
    // Ejecutar seed si está habilitado
    let seedResult = null;
    if (shouldSeed) {
      console.log('🌱 Ejecutando seed de datos de prueba...');
      seedResult = await runSeed();
    }
    
    return { 
      success: true, 
      message: `Migrations completed in ${duration / 1000}s. Applied: ${appliedCount}, Skipped: ${skippedCount}`,
      cleaned: shouldClean,
      seeded: shouldSeed,
      applied: appliedCount,
      skipped: skippedCount,
      seedResult: seedResult
    };

  } catch (error) {
    console.error(`❌ Error:`, error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

export const handler = async (event, context) => {
  console.log('📥 Event recibido:', JSON.stringify(event, null, 2));
  console.log(`🔧 Function: ${context.functionName}, LogGroup: ${context.logGroupName}`);

  let isCloudFormationCustomResource = false;
  let shouldMigrate = false;

  try {
    if (event.RequestType && event.ResponseURL) {
      isCloudFormationCustomResource = true;
      shouldMigrate = event.RequestType === 'Create' || event.RequestType === 'Update';
      console.log(`🔷 Custom Resource - RequestType: ${event.RequestType}, ShouldMigrate: ${shouldMigrate}`);
    }

    if (event.action === 'migrate') {
      shouldMigrate = true;
      console.log('🔷 Invocación directa con action=migrate');
    }

    if (!event.action && !event.RequestType) {
      shouldMigrate = true;
      console.log('🔷 Invocación por defecto');
    }

    let result;
    if (shouldMigrate) {
      const shouldClean = event.clean !== false && event.clean !== 'false';
      const shouldSeed = event.seed === true || event.seed === 'true';
      console.log(`🧹 Limpiar base de datos antes de migrar: ${shouldClean}`);
      console.log(`🌱 Ejecutar seed después de migrar: ${shouldSeed}`);
      result = await runMigrations(shouldClean, shouldSeed);
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
