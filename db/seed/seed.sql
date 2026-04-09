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
-- PASO 2: USUARIOS
-- Cubre: cognito_sub, ultimo_acceso, todos los estados y roles
-- ============================================

INSERT INTO usuarios (id, cognito_sub, correo, nombres, apellidos, rol, telefono, dni, activo, estado, ultimo_acceso)
VALUES
  -- ADMIN activo con cognito_sub y ultimo_acceso
  ('00000000-0000-0000-0000-000000000001',
   '7438d4b8-0021-7065-dda7-7bbdfa75c929',
   'admin@nanutech.com',
   'Admin', 'Principal',
   'ADMIN', '999888777', '12345678',
   true, 'ACTIVO',
   NOW() - INTERVAL '1 hour'),

  -- CHOFER 1 activo
  ('00000000-0000-0000-0000-000000000002',
   'c4f84478-a051-707b-d0ee-ad4d95480a7c',
   'chofer1@nanutech.com',
   'Carlos', 'Gomez',
   'CHOFER', '999111222', '87654321',
   true, 'ACTIVO',
   NOW() - INTERVAL '30 minutes'),

  -- CHOFER 2 activo
  ('00000000-0000-0000-0000-000000000003',
   'cognito-sub-chofer-002',
   'chofer2@nanutech.com',
   'Luis', 'Martinez',
   'CHOFER', '999333444', '11223344',
   true, 'ACTIVO',
   NOW() - INTERVAL '2 hours'),

  -- CHOFER 3 INACTIVO (cubre estado INACTIVO)
  ('00000000-0000-0000-0000-000000000004',
   'cognito-sub-chofer-003',
   'chofer3@nanutech.com',
   'Pedro', 'Ramirez',
   'CHOFER', '999555666', '22334455',
   false, 'INACTIVO',
   NOW() - INTERVAL '30 days'),

  -- CHOFER 4 BLOQUEADO (cubre estado BLOQUEADO)
  ('00000000-0000-0000-0000-000000000005',
   'cognito-sub-chofer-004',
   'chofer4@nanutech.com',
   'Jorge', 'Torres',
   'CHOFER', '999777888', '33445566',
   false, 'BLOQUEADO',
   NOW() - INTERVAL '60 days'),

  -- ADMIN sin cognito_sub (usuario creado manualmente, cubre NULL en cognito_sub)
  ('00000000-0000-0000-0000-000000000006',
   NULL,
   'admin2@nanutech.com',
   'Ana', 'Lopez',
   'ADMIN', '999000111', '44556677',
   true, 'ACTIVO',
   NULL);  -- sin ultimo_acceso aún (nunca ingresó)

-- ============================================
-- PASO 3: UNIDADES
-- Cubre: todos los estados (DISPONIBLE, EN_JORNADA, EN_AUXILIO, INACTIVA)
-- ============================================

INSERT INTO unidades (id, placa, marca, modelo, anio, capacidad_ton, estado, gps_habilitado, activo)
VALUES
  ('10000000-0000-0000-0000-000000000001',
   'ABC-123', 'Mercedes Benz', 'Actros', 2022, 15.50, 'DISPONIBLE', true, true),

  ('10000000-0000-0000-0000-000000000002',
   'DEF-456', 'Volvo', 'FH16', 2023, 18.00, 'DISPONIBLE', true, true),

  ('10000000-0000-0000-0000-000000000003',
   'GHI-789', 'Scania', 'R500', 2022, 16.50, 'EN_JORNADA', true, true),

  -- Cubre EN_AUXILIO
  ('10000000-0000-0000-0000-000000000004',
   'JKL-012', 'Kenworth', 'T680', 2021, 20.00, 'EN_AUXILIO', true, true),

  -- Cubre INACTIVA y gps_habilitado=false
  ('10000000-0000-0000-0000-000000000005',
   'MNO-345', 'International', 'LT625', 2018, 12.00, 'INACTIVA', false, false);

-- ============================================
-- PASO 4: CONTRATOS
-- Cubre: todos los estados (VIGENTE, VENCIDO, SUSPENDIDO), fecha_fin NULL
-- ============================================

INSERT INTO contratos (id, codigo, cliente, descripcion, fecha_inicio, fecha_fin, tarifa, moneda, estado, activo)
VALUES
  ('20000000-0000-0000-0000-000000000001',
   'CONT-001', 'Empresa A SAC',
   'Transporte de minerales',
   '2024-01-01', '2025-12-31',
   5000.00, 'PEN', 'VIGENTE', true),

  ('20000000-0000-0000-0000-000000000002',
   'CONT-002', 'Empresa B EIRL',
   'Transporte de insumos',
   '2024-01-01', '2025-12-31',
   3500.00, 'PEN', 'VIGENTE', true),

  ('20000000-0000-0000-0000-000000000003',
   'CONT-003', 'Empresa C SRL',
   'Transporte de productos terminados',
   '2024-02-01', '2025-12-31',
   4200.00, 'PEN', 'VIGENTE', true),

  -- Cubre estado VENCIDO y moneda USD
  ('20000000-0000-0000-0000-000000000004',
   'CONT-004', 'Empresa D SA',
   'Transporte internacional',
   '2023-01-01', '2023-12-31',
   8000.00, 'USD', 'VENCIDO', false),

  -- Cubre estado SUSPENDIDO y fecha_fin NULL (contrato abierto)
  ('20000000-0000-0000-0000-000000000005',
   'CONT-005', 'Empresa E SAC',
   'Contrato marco sin fecha fin definida',
   '2024-06-01', NULL,
   6000.00, 'PEN', 'SUSPENDIDO', true);

-- ============================================
-- PASO 5: JORNADAS
-- Cubre: todos los estados (REGISTRADA, EN_PROCESO, COMPLETADA, CANCELADA)
-- y campo observaciones
-- ============================================

INSERT INTO jornadas (id, conductor_id, unidad_id, contrato_id, creado_por,
                      fecha_jornada, hora_inicio, hora_fin,
                      origen, destino, km_recorridos, observaciones, estado)
VALUES
  -- COMPLETADA: chofer1 + ABC-123 (ya finalizó)
  ('30000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   CURRENT_DATE,
   NOW() - INTERVAL '8 hours',
   NOW() - INTERVAL '1 hour',
   'Lima', 'Callao',
   120.50,
   'Jornada completada sin incidentes.',
   'COMPLETADA'),

  -- EN_PROCESO: chofer2 + GHI-789 (en curso ahora)
  ('30000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   CURRENT_DATE,
   NOW() - INTERVAL '2 hours',
   NULL,           -- sin hora_fin porque sigue activa
   'Callao', 'Huachipa',
   45.00,
   NULL,           -- sin observaciones aún
   'EN_PROCESO'),

  -- REGISTRADA: chofer1 + DEF-456 (programada, no ha iniciado)
  -- chofer1 puede tener otra jornada REGISTRADA porque la COMPLETADA ya cerró
  ('30000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   CURRENT_DATE + 1,
   NULL,           -- sin hora_inicio porque aún no arranca
   NULL,
   'Lima', 'Ica',
   0.00,
   'Llevar documentación especial.',
   'REGISTRADA'),

  -- CANCELADA: chofer con unidad que ya está libre
  ('30000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 1,
   NULL,
   NULL,
   'Lima', 'Arequipa',
   0.00,
   'Cancelada por falla mecánica antes de iniciar.',
   'CANCELADA');

-- ============================================
-- PASO 6: ALERTAS
-- Cubre: ambos tipos (PANICO, AUXILIO_MECANICO), atendida true/false
-- ============================================

-- Alerta PANICO no atendida (en jornada EN_PROCESO)
INSERT INTO alertas_jornada (id, jornada_id, tipo, detalle, latitud, longitud, fecha_hora, atendida)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  'PANICO',
  'Conductor presionó botón de pánico. Posible asalto.',
  -12.043333, -77.028333,
  NOW() - INTERVAL '1 hour',
  false
);

-- Alerta PANICO ya atendida (en jornada COMPLETADA)
INSERT INTO alertas_jornada (id, jornada_id, tipo, detalle, latitud, longitud, fecha_hora,
                              atendida, atendida_at, atendida_por)
VALUES (
  '40000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000001',
  'PANICO',
  'Falsa alarma confirmada por el conductor.',
  -12.050000, -77.030000,
  NOW() - INTERVAL '6 hours',
  true,
  NOW() - INTERVAL '5 hours',
  '00000000-0000-0000-0000-000000000001'   -- atendida por ADMIN
);

-- Alerta AUXILIO_MECANICO no atendida (en jornada EN_PROCESO)
INSERT INTO alertas_jornada (id, jornada_id, tipo, detalle, latitud, longitud, fecha_hora, atendida)
VALUES (
  '40000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000002',
  'AUXILIO_MECANICO',
  'Pinchazo de llanta en carretera central km 45.',
  -12.000000, -76.900000,
  NOW() - INTERVAL '30 minutes',
  false
);

-- Alerta AUXILIO_MECANICO ya atendida (en jornada COMPLETADA)
INSERT INTO alertas_jornada (id, jornada_id, tipo, detalle, latitud, longitud, fecha_hora,
                              atendida, atendida_at, atendida_por)
VALUES (
  '40000000-0000-0000-0000-000000000004',
  '30000000-0000-0000-0000-000000000001',
  'AUXILIO_MECANICO',
  'Falla en batería, grúa enviada y resuelta.',
  -12.060000, -77.010000,
  NOW() - INTERVAL '7 hours',
  true,
  NOW() - INTERVAL '6 hours',
  '00000000-0000-0000-0000-000000000001'
);

-- ============================================
-- PASO 7: UBICACIONES
-- Cubre: todos los tipos (INICIO, FIN, ALERTA, TRACKING)
-- ============================================

-- Registro INICIO (jornada COMPLETADA)
INSERT INTO ubicaciones_jornada (id, jornada_id, latitud, longitud, fecha_hora, tipo_registro, velocidad_kmh)
VALUES (
  '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  -12.046374, -77.042793,
  NOW() - INTERVAL '8 hours',
  'INICIO', 0.00
);

-- Registros TRACKING intermedios (jornada COMPLETADA)
INSERT INTO ubicaciones_jornada (id, jornada_id, latitud, longitud, fecha_hora, tipo_registro, velocidad_kmh)
SELECT
  gen_random_uuid(),
  '30000000-0000-0000-0000-000000000001',
  -12.046374 + (gs * 0.005),
  -77.042793 + (gs * 0.003),
  NOW() - INTERVAL '8 hours' + (gs * INTERVAL '30 minutes'),
  'TRACKING',
  55 + (random() * 30)
FROM generate_series(1, 8) AS gs;

-- Registro ALERTA (jornada COMPLETADA, coincide con alerta atendida)
INSERT INTO ubicaciones_jornada (id, jornada_id, latitud, longitud, fecha_hora, tipo_registro, velocidad_kmh)
VALUES (
  '50000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000001',
  -12.050000, -77.030000,
  NOW() - INTERVAL '6 hours',
  'ALERTA', 0.00
);

-- Registro FIN (jornada COMPLETADA)
INSERT INTO ubicaciones_jornada (id, jornada_id, latitud, longitud, fecha_hora, tipo_registro, velocidad_kmh)
VALUES (
  '50000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000001',
  -11.990000, -77.120000,
  NOW() - INTERVAL '1 hour',
  'FIN', 0.00
);

-- Registro INICIO (jornada EN_PROCESO)
INSERT INTO ubicaciones_jornada (id, jornada_id, latitud, longitud, fecha_hora, tipo_registro, velocidad_kmh)
VALUES (
  '50000000-0000-0000-0000-000000000004',
  '30000000-0000-0000-0000-000000000002',
  -12.055000, -77.085000,
  NOW() - INTERVAL '2 hours',
  'INICIO', 0.00
);

-- Registros TRACKING en curso (jornada EN_PROCESO)
INSERT INTO ubicaciones_jornada (id, jornada_id, latitud, longitud, fecha_hora, tipo_registro, velocidad_kmh)
SELECT
  gen_random_uuid(),
  '30000000-0000-0000-0000-000000000002',
  -12.055000 + (gs * 0.004),
  -77.085000 + (gs * 0.002),
  NOW() - INTERVAL '2 hours' + (gs * INTERVAL '20 minutes'),
  'TRACKING',
  40 + (random() * 50)
FROM generate_series(1, 5) AS gs;

-- Registro ALERTA (jornada EN_PROCESO, coincide con alerta de pánico activa)
INSERT INTO ubicaciones_jornada (id, jornada_id, latitud, longitud, fecha_hora, tipo_registro, velocidad_kmh)
VALUES (
  '50000000-0000-0000-0000-000000000005',
  '30000000-0000-0000-0000-000000000002',
  -12.043333, -77.028333,
  NOW() - INTERVAL '1 hour',
  'ALERTA', 0.00
);

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
