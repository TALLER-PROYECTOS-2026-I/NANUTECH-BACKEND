export const seedSQL = `
-- ============================================
-- 12. DATOS DE PRUEBA
-- ============================================

-- Usuarios
INSERT INTO usuarios (id, cognito_sub, correo, nombres, apellidos, rol, telefono, dni)
VALUES
(gen_random_uuid(), 'cognito-admin-001', 'admin@nanutech.com', 'Jimena', 'Rodriguez', 'ADMIN', '999111222', '70000001'),
(gen_random_uuid(), 'cognito-driver-001', 'chofer1@nanutech.com', 'Carlos', 'Mendoza', 'CHOFER', '999222333', '70000002'),
(gen_random_uuid(), 'cognito-driver-002', 'chofer2@nanutech.com', 'Luis', 'Ramirez', 'CHOFER', '999333444', '70000003'),
(gen_random_uuid(), 'cognito-driver-003', 'chofer3@nanutech.com', 'Jorge', 'Silva', 'CHOFER', '999444555', '70000004');

-- Unidades
INSERT INTO unidades (id, placa, marca, modelo, anio, capacidad_ton, estado)
VALUES
(gen_random_uuid(), 'ABC-123', 'Volvo', 'FH16', 2020, 20.00, 'DISPONIBLE'),
(gen_random_uuid(), 'DEF-456', 'Scania', 'R450', 2021, 18.00, 'DISPONIBLE'),
(gen_random_uuid(), 'GHI-789', 'Mercedes-Benz', 'Actros', 2019, 22.00, 'DISPONIBLE');

-- Contratos
INSERT INTO contratos (id, codigo, cliente, descripcion, fecha_inicio, fecha_fin, tarifa, moneda, estado)
VALUES
(gen_random_uuid(), 'CONT-001', 'Minera del Sur', 'Transporte de carga minera', '2026-01-01', '2026-12-31', 15000.00, 'PEN', 'VIGENTE'),
(gen_random_uuid(), 'CONT-002', 'Logistica Andina', 'Distribucion interprovincial', '2026-02-01', '2026-10-31', 9800.00, 'PEN', 'VIGENTE');

-- Jornada completada de ejemplo
WITH
admin_user AS (
    SELECT id FROM usuarios WHERE correo = 'admin@nanutech.com'
),
driver_user AS (
    SELECT id FROM usuarios WHERE correo = 'chofer1@nanutech.com'
),
truck_row AS (
    SELECT id FROM unidades WHERE placa = 'ABC-123'
),
contract_row AS (
    SELECT id FROM contratos WHERE codigo = 'CONT-001'
)
INSERT INTO jornadas (
    conductor_id,
    unidad_id,
    contrato_id,
    creado_por,
    fecha_jornada,
    hora_inicio,
    hora_fin,
    origen,
    destino,
    km_recorridos,
    observaciones,
    estado
)
SELECT
    d.id,
    t.id,
    c.id,
    a.id,
    CURRENT_DATE - 1,
    (CURRENT_DATE - 1)::timestamp + INTERVAL '08 hours',
    (CURRENT_DATE - 1)::timestamp + INTERVAL '18 hours 30 minutes',
    'Lima',
    'Arequipa',
    525.40,
    'Jornada completada sin incidencias mayores',
    'COMPLETADA'
FROM admin_user a, driver_user d, truck_row t, contract_row c;

-- Jornada activa de ejemplo
WITH
admin_user AS (
    SELECT id FROM usuarios WHERE correo = 'admin@nanutech.com'
),
driver_user AS (
    SELECT id FROM usuarios WHERE correo = 'chofer2@nanutech.com'
),
truck_row AS (
    SELECT id FROM unidades WHERE placa = 'DEF-456'
),
contract_row AS (
    SELECT id FROM contratos WHERE codigo = 'CONT-002'
)
INSERT INTO jornadas (
    conductor_id,
    unidad_id,
    contrato_id,
    creado_por,
    fecha_jornada,
    hora_inicio,
    origen,
    destino,
    km_recorridos,
    observaciones,
    estado
)
SELECT
    d.id,
    t.id,
    c.id,
    a.id,
    CURRENT_DATE,
    CURRENT_TIMESTAMP - INTERVAL '3 hours',
    'Lima',
    'Ica',
    120.80,
    'Jornada en curso',
    'EN_PROCESO'
FROM admin_user a, driver_user d, truck_row t, contract_row c;

-- Actualizar estado de unidades según jornada activa
UPDATE unidades
SET estado = 'EN_JORNADA'
WHERE id IN (
    SELECT unidad_id
    FROM jornadas
    WHERE estado IN ('REGISTRADA', 'EN_PROCESO')
);

-- Insertar alerta para jornada activa
WITH jornada_activa AS (
    SELECT id
    FROM jornadas
    WHERE estado = 'EN_PROCESO'
    ORDER BY created_at DESC
    LIMIT 1
)
INSERT INTO alertas_jornada (
    jornada_id,
    tipo,
    detalle,
    latitud,
    longitud,
    fecha_hora,
    atendida
)
SELECT
    id,
    'AUXILIO_MECANICO',
    'Falla mecanica reportada por el conductor',
    -13.1588000,
    -74.2236000,
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    FALSE
FROM jornada_activa;

-- Ubicaciones para la jornada activa
WITH jornada_activa AS (
    SELECT id, hora_inicio
    FROM jornadas
    WHERE estado = 'EN_PROCESO'
    ORDER BY created_at DESC
    LIMIT 1
)
INSERT INTO ubicaciones_jornada (
    jornada_id,
    latitud,
    longitud,
    fecha_hora,
    tipo_registro,
    velocidad_kmh
)
SELECT id, -12.0464000, -77.0428000, hora_inicio, 'INICIO'::tipo_registro_ubicacion, 0
FROM jornada_activa
UNION ALL
SELECT id, -13.1588000, -74.2236000, CURRENT_TIMESTAMP - INTERVAL '1 hour', 'ALERTA'::tipo_registro_ubicacion, 45
FROM jornada_activa
UNION ALL
SELECT id, -13.5319000, -71.9675000, CURRENT_TIMESTAMP, 'TRACKING'::tipo_registro_ubicacion, 62
FROM jornada_activa;
-- ============================================
-- 13. CONSULTAS DE PRUEBA
-- ============================================

-- Ver usuarios
-- SELECT * FROM usuarios;

-- Ver unidades
-- SELECT * FROM unidades;

-- Ver contratos
-- SELECT * FROM contratos;

-- Ver jornadas
-- SELECT * FROM jornadas ORDER BY created_at DESC;

-- Ver seguimiento
-- SELECT * FROM vw_seguimiento_jornadas;

-- Ver alertas por jornada
-- SELECT * FROM alertas_jornada ORDER BY fecha_hora DESC;

-- Ver tracking GPS
-- SELECT * FROM ubicaciones_jornada ORDER BY fecha_hora DESC;

`;
