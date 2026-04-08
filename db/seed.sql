-- ============================================
-- NANUTECH - SEED PARA TESTS (pg-mem)
-- Sin CTEs complejos, sin casts de enum,
-- sin operaciones de fecha complejas
-- ============================================

-- ============================================
-- 1. USUARIOS
-- ============================================

INSERT INTO usuarios (id, cognito_sub, correo, nombres, apellidos, rol, telefono, dni)
VALUES
('11111111-1111-1111-1111-111111111111', 'cognito-admin-001', 'admin@nanutech.com', 'Jimena', 'Rodriguez', 'ADMIN', '999111222', '70000001'),
('22222222-2222-2222-2222-222222222222', 'cognito-driver-001', 'chofer1@nanutech.com', 'Carlos', 'Mendoza', 'CHOFER', '999222333', '70000002'),
('33333333-3333-3333-3333-333333333333', 'cognito-driver-002', 'chofer2@nanutech.com', 'Luis', 'Ramirez', 'CHOFER', '999333444', '70000003'),
('44444444-4444-4444-4444-444444444444', 'cognito-driver-003', 'chofer3@nanutech.com', 'Jorge', 'Silva', 'CHOFER', '999444555', '70000004');

-- ============================================
-- 2. UNIDADES
-- ============================================

INSERT INTO unidades (id, placa, marca, modelo, anio, capacidad_ton, estado)
VALUES
('aaaa0001-0000-0000-0000-000000000001', 'ABC-123', 'Volvo', 'FH16', 2020, 20.00, 'DISPONIBLE'),
('aaaa0002-0000-0000-0000-000000000002', 'DEF-456', 'Scania', 'R450', 2021, 18.00, 'DISPONIBLE'),
('aaaa0003-0000-0000-0000-000000000003', 'GHI-789', 'Mercedes-Benz', 'Actros', 2019, 22.00, 'DISPONIBLE');

-- ============================================
-- 3. CONTRATOS
-- ============================================

INSERT INTO contratos (id, codigo, cliente, descripcion, fecha_inicio, fecha_fin, tarifa, moneda, estado)
VALUES
('bbbb0001-0000-0000-0000-000000000001', 'CONT-001', 'Minera del Sur', 'Transporte de carga minera', '2026-01-01', '2026-12-31', 15000.00, 'PEN', 'VIGENTE'),
('bbbb0002-0000-0000-0000-000000000002', 'CONT-002', 'Logistica Andina', 'Distribucion interprovincial', '2026-02-01', '2026-10-31', 9800.00, 'PEN', 'VIGENTE');

-- ============================================
-- 4. JORNADA COMPLETADA
-- ============================================

INSERT INTO jornadas (
    id, conductor_id, unidad_id, contrato_id, creado_por,
    fecha_jornada, hora_inicio, hora_fin,
    origen, destino, km_recorridos, observaciones, estado
)
VALUES (
    'cccc0001-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222',
    'aaaa0001-0000-0000-0000-000000000001',
    'bbbb0001-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '2026-04-04',
    '2026-04-04 08:00:00',
    '2026-04-04 18:30:00',
    'Lima', 'Arequipa', 525.40,
    'Jornada completada sin incidencias mayores',
    'COMPLETADA'
);

-- ============================================
-- 5. JORNADA EN PROCESO
-- ============================================

INSERT INTO jornadas (
    id, conductor_id, unidad_id, contrato_id, creado_por,
    fecha_jornada, hora_inicio,
    origen, destino, km_recorridos, observaciones, estado
)
VALUES (
    'cccc0002-0000-0000-0000-000000000002',
    '33333333-3333-3333-3333-333333333333',
    'aaaa0002-0000-0000-0000-000000000002',
    'bbbb0002-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '2026-04-05',
    '2026-04-05 08:00:00',
    'Lima', 'Ica', 120.80,
    'Jornada en curso',
    'EN_PROCESO'
);

-- ============================================
-- 6. ACTUALIZAR UNIDAD EN JORNADA
-- ============================================

UPDATE unidades
SET estado = 'EN_JORNADA'
WHERE id = 'aaaa0002-0000-0000-0000-000000000002';

-- ============================================
-- 7. ALERTA PARA JORNADA EN PROCESO
-- ============================================

INSERT INTO alertas_jornada (
    id, jornada_id, tipo, detalle,
    latitud, longitud, fecha_hora, atendida
)
VALUES (
    'dddd0001-0000-0000-0000-000000000001',
    'cccc0002-0000-0000-0000-000000000002',
    'AUXILIO_MECANICO',
    'Falla mecanica reportada por el conductor',
    -13.1588000, -74.2236000,
    '2026-04-05 09:00:00',
    FALSE
);

-- ============================================
-- 8. UBICACIONES GPS
-- ============================================

INSERT INTO ubicaciones_jornada (
    id, jornada_id, latitud, longitud,
    fecha_hora, tipo_registro, velocidad_kmh
)
VALUES
(
    'eeee0001-0000-0000-0000-000000000001',
    'cccc0002-0000-0000-0000-000000000002',
    -12.0464000, -77.0428000,
    '2026-04-05 08:00:00',
    'INICIO', 0
),
(
    'eeee0002-0000-0000-0000-000000000002',
    'cccc0002-0000-0000-0000-000000000002',
    -13.1588000, -74.2236000,
    '2026-04-05 09:00:00',
    'ALERTA', 45
),
(
    'eeee0003-0000-0000-0000-000000000003',
    'cccc0002-0000-0000-0000-000000000002',
    -13.5319000, -71.9675000,
    '2026-04-05 10:00:00',
    'TRACKING', 62
);


INSERT INTO camiones (id, placa, marca, modelo, anio, capacidad_ton, estado) VALUES
('1', 'ABC-123', 'Volvo', 'FH16', 2022, 20, 'DISPONIBLE'),
('2', 'XYZ-789', 'Scania', 'R450', 2023, 18, 'DISPONIBLE');