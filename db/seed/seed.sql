-- migrate:up

BEGIN;

-- ============================================
-- PASO 1: ELIMINAR DATOS EXISTENTES
-- ============================================

DELETE FROM ubicaciones_jornada;
DELETE FROM alertas_jornada;
DELETE FROM jornadas;
DELETE FROM contratos;
DELETE FROM unidades;
DELETE FROM usuarios;

-- ============================================
-- PASO 2: RESETEAR SECUENCIAS (si las hay)
-- ============================================

-- Si tienes secuencias, resetealas
-- ALTER SEQUENCE usuarios_id_seq RESTART WITH 1;

-- ============================================
-- PASO 3: INSERTAR DATOS DE PRUEBA
-- ============================================

-- Usuario ADMIN
INSERT INTO usuarios (id, correo, nombres, apellidos, rol, telefono, dni, activo, estado)
VALUES 
  (gen_random_uuid(), 'admin@nanutech.com', 'Admin', 'Principal', 'ADMIN', '999888777', '12345678', true, 'ACTIVO');

-- Usuario CHOFER 1
INSERT INTO usuarios (id, correo, nombres, apellidos, rol, telefono, dni, activo, estado)
VALUES 
  (gen_random_uuid(), 'chofer1@nanutech.com', 'Carlos', 'Gomez', 'CHOFER', '999111222', '87654321', true, 'ACTIVO');

-- Usuario CHOFER 2
INSERT INTO usuarios (id, correo, nombres, apellidos, rol, telefono, dni, activo, estado)
VALUES 
  (gen_random_uuid(), 'chofer2@nanutech.com', 'Luis', 'Martinez', 'CHOFER', '999333444', '11223344', true, 'ACTIVO');

-- Unidades
INSERT INTO unidades (id, placa, marca, modelo, anio, capacidad_ton, estado, gps_habilitado, activo)
VALUES 
  (gen_random_uuid(), 'ABC-123', 'Mercedes Benz', 'Actros', 2022, 15.5, 'DISPONIBLE', true, true),
  (gen_random_uuid(), 'DEF-456', 'Volvo', 'FH16', 2023, 18.0, 'DISPONIBLE', true, true),
  (gen_random_uuid(), 'GHI-789', 'Scania', 'R500', 2022, 16.5, 'EN_JORNADA', true, true);

-- Contratos
INSERT INTO contratos (id, codigo, cliente, descripcion, fecha_inicio, fecha_fin, tarifa, moneda, estado, activo)
VALUES 
  (gen_random_uuid(), 'CONT-001', 'Empresa A SAC', 'Transporte de minerales', '2024-01-01', '2024-12-31', 5000.00, 'PEN', 'VIGENTE', true),
  (gen_random_uuid(), 'CONT-002', 'Empresa B EIRL', 'Transporte de insumos', '2024-01-01', '2024-12-31', 3500.00, 'PEN', 'VIGENTE', true),
  (gen_random_uuid(), 'CONT-003', 'Empresa C SRL', 'Transporte de productos terminados', '2024-02-01', '2024-12-31', 4200.00, 'PEN', 'VIGENTE', true);

-- Jornada
INSERT INTO jornadas (id, conductor_id, unidad_id, contrato_id, creado_por, fecha_jornada, hora_inicio, hora_fin, origen, destino, km_recorridos, estado)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM usuarios WHERE correo = 'chofer1@nanutech.com'),
  (SELECT id FROM unidades WHERE placa = 'ABC-123'),
  (SELECT id FROM contratos WHERE codigo = 'CONT-001'),
  (SELECT id FROM usuarios WHERE correo = 'admin@nanutech.com'),
  CURRENT_DATE,
  CURRENT_TIMESTAMP - INTERVAL '8 hours',
  CURRENT_TIMESTAMP,
  'Lima',
  'Callao',
  120.5,
  'COMPLETADA';

-- Alerta
INSERT INTO alertas_jornada (id, jornada_id, tipo, detalle, latitud, longitud, fecha_hora, atendida)
SELECT 
  gen_random_uuid(),
  id,
  'PANICO',
  'Conductor reportó emergencia',
  -12.043333,
  -77.028333,
  NOW() - INTERVAL '2 hours',
  true
FROM jornadas 
LIMIT 1;

-- Ubicaciones (10 registros)
INSERT INTO ubicaciones_jornada (id, jornada_id, latitud, longitud, fecha_hora, tipo_registro, velocidad_kmh)
SELECT 
  gen_random_uuid(),
  j.id,
  -12.043333 + (random() * 0.1),
  -77.028333 + (random() * 0.1),
  NOW() - (interval '1 hour' * generate_series),
  'TRACKING',
  60 + (random() * 40)
FROM jornadas j
CROSS JOIN generate_series(1, 10)
LIMIT 10;

COMMIT;

-- migrate:down

BEGIN;
DELETE FROM ubicaciones_jornada;
DELETE FROM alertas_jornada;
DELETE FROM jornadas;
DELETE FROM contratos;
DELETE FROM unidades;
DELETE FROM usuarios;
COMMIT;
