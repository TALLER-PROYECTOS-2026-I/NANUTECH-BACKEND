export const seedSQL = `
-- =========================================================
-- USUARIOS
-- =========================================================
INSERT INTO usuarios (id, cognito_sub, correo, nombres, apellidos, rol, telefono, dni)
VALUES
('11111111-1111-1111-1111-111111111111', 'cognito-admin-001',   'admin@nanutech.com',    'Jimena', 'Rodriguez', 'ADMIN',   '999111222', '70000001'),
('22222222-2222-2222-2222-222222222222', 'cognito-driver-001',  'chofer1@nanutech.com',  'Carlos', 'Mendoza',   'CHOFER',  '999222333', '70000002'),
('33333333-3333-3333-3333-333333333333', 'cognito-driver-002',  'chofer2@nanutech.com',  'Luis',   'Ramirez',   'CHOFER',  '999333444', '70000003'),
('44444444-4444-4444-4444-444444444444', 'cognito-driver-003',  'chofer3@nanutech.com',  'Jorge',  'Silva',     'CHOFER',  '999444555', '70000004'),
('55555555-5555-5555-5555-555555555555', 'cognito-gerente-001', 'gerencia@nanutech.com', 'Laura',  'Vasquez',   'GERENTE', '999777888', '70000005');

-- =========================================================
-- CONDUCTORES
-- =========================================================
INSERT INTO conductores (usuario_id, fecha_nacimiento, direccion, fecha_ingreso, estado_operacional, observaciones)
VALUES
('22222222-2222-2222-2222-222222222222', '1985-03-15', 'Av. Los Pinos 123, Lima',    '2020-01-15', 'DISPONIBLE', 'Conductor principal'),
('33333333-3333-3333-3333-333333333333', '1988-07-22', 'Jr. Las Flores 456, Lima',   '2020-03-01', 'EN_RUTA',    'Conductor en jornada'),
('44444444-4444-4444-4444-444444444444', '1982-11-10', 'Calle Los Alamos 789, Lima', '2019-06-15', 'DESCANSO',   'Conductor senior');

INSERT INTO contactos_emergencia (conductor_id, nombre, telefono, parentesco, es_principal) VALUES
('22222222-2222-2222-2222-222222222222', 'Maria Mendoza', '987111222', 'Esposa', TRUE),
('33333333-3333-3333-3333-333333333333', 'Ana Ramirez',   '987222333', 'Hermana', TRUE),
('44444444-4444-4444-4444-444444444444', 'Carmen Silva',  '987333444', 'Madre', TRUE);

INSERT INTO licencias_conducir (conductor_id, numero_licencia, categoria, fecha_emision, fecha_vencimiento, autoridad_emisora, activa) VALUES
('22222222-2222-2222-2222-222222222222', 'L45678901', 'A-III-b', '2022-01-10', '2027-01-10', 'MTC', TRUE),
('33333333-3333-3333-3333-333333333333', 'L45678902', 'A-III-b', '2022-03-01', '2027-03-01', 'MTC', TRUE),
('44444444-4444-4444-4444-444444444444', 'L45678903', 'A-III-c', '2021-08-15', '2026-08-15', 'MTC', TRUE);

-- =========================================================
-- GPS
-- =========================================================
INSERT INTO gps_dispositivos (id, codigo_equipo, proveedor, imei, numero_sim, activo)
VALUES
('90000000-0000-0000-0000-000000000001', 'GPS-2026-0001', 'GPSCONTROL', '359111111111111', '51990000001', TRUE),
('90000000-0000-0000-0000-000000000002', 'GPS-2026-0002', 'GPSCONTROL', '359222222222222', '51990000002', TRUE),
('90000000-0000-0000-0000-000000000003', 'GPS-2026-0003', 'GLOBALGPS',  '359333333333333', '51990000003', TRUE);

-- =========================================================
-- UNIDADES (triggers crean camiones automáticamente)
-- =========================================================
INSERT INTO unidades (
  id, placa, marca, modelo, anio, capacidad_ton, estado, gps_habilitado, activo,
  vin, color, tipo_combustible, fecha_registro,
  ultima_fecha_mantenimiento, proxima_fecha_mantenimiento,
  kilometraje_actual, gps_device_id, notas
)
VALUES
('aaaa0001-0000-0000-0000-000000000001', 'ABC-123', 'Volvo',         'FH16',   2020, 20.00, 'DISPONIBLE',    TRUE, TRUE, 'VINVOLVO0001', 'Blanco', 'DIESEL', '2025-01-15', '2026-03-10', '2026-06-10', 25430.50, '90000000-0000-0000-0000-000000000001', 'Unidad operativa'),
('aaaa0002-0000-0000-0000-000000000002', 'DEF-456', 'Scania',        'R450',   2021, 18.00, 'EN_JORNADA',    TRUE, TRUE, 'VINSCANIA02',  'Rojo',   'DIESEL', '2025-02-20', '2026-03-18', '2026-06-18', 18235.20, '90000000-0000-0000-0000-000000000002', 'Unidad en jornada'),
('aaaa0003-0000-0000-0000-000000000003', 'GHI-789', 'Mercedes-Benz', 'Actros', 2019, 22.00, 'MANTENIMIENTO', TRUE, TRUE, 'VINMERCED03',  'Azul',   'DIESEL', '2025-03-10', '2026-04-01', '2026-05-15', 32150.75, '90000000-0000-0000-0000-000000000003', 'Unidad en mantenimiento');

-- =========================================================
-- ASIGNACIONES
-- =========================================================
INSERT INTO asignaciones_conductor_unidad (conductor_id, unidad_id, fecha_inicio, estado, creado_por, observaciones) VALUES
('22222222-2222-2222-2222-222222222222', 'aaaa0001-0000-0000-0000-000000000001', '2026-04-20 08:00:00', 'ACTIVA', '11111111-1111-1111-1111-111111111111', 'Asignación principal'),
('33333333-3333-3333-3333-333333333333', 'aaaa0002-0000-0000-0000-000000000002', '2026-04-20 08:00:00', 'ACTIVA', '11111111-1111-1111-1111-111111111111', 'Asignación principal');

-- =========================================================
-- CONTRATOS
-- =========================================================
INSERT INTO contratos (
  id, codigo, cliente, ruc, descripcion, tipo_servicio, fecha_inicio, fecha_fin,
  tarifa, moneda, estado, activo, updated_by
)
VALUES
('bbbb0001-0000-0000-0000-000000000001', 'CONT-2026-001', 'Minera del Sur',   '20123456789', 'Transporte de carga minera',   'POR_VIAJE', '2026-01-01', '2026-12-31', 15000.00, 'PEN', 'VIGENTE', TRUE, '11111111-1111-1111-1111-111111111111'),
('bbbb0002-0000-0000-0000-000000000002', 'CONT-2026-002', 'Logistica Andina', '20987654321', 'Distribución interprovincial', 'POR_HORA',  '2026-02-01', '2026-10-31',  9800.00, 'PEN', 'VIGENTE', TRUE, '11111111-1111-1111-1111-111111111111'),
('bbbb0003-0000-0000-0000-000000000003', 'CONT-2026-003', 'Agroexport Norte', '20456789123', 'Transporte por tonelada', 'POR_TONELADA', '2026-03-01', '2026-11-30', 12500.00, 'PEN', 'VIGENTE', TRUE, '11111111-1111-1111-1111-111111111111');

INSERT INTO contrato_rutas (contrato_id, origen, destino, distancia_estimada_km) VALUES
('bbbb0001-0000-0000-0000-000000000001', 'Lima', 'Arequipa', 520.00),
('bbbb0002-0000-0000-0000-000000000002', 'Lima', 'Ica', 300.00),
('bbbb0003-0000-0000-0000-000000000003', 'Trujillo', 'Piura', 420.00);

INSERT INTO contrato_tarifas (contrato_id, tarifa_base, tarifa_por_km, tarifa_por_hora, tarifa_por_tonelada, tarifa_espera, total_referencial) VALUES
('bbbb0001-0000-0000-0000-000000000001', 15000.00, 0, 0, 0, 0, 15000.00),
('bbbb0002-0000-0000-0000-000000000002', 5000.00, 0, 450.00, 0, 100.00, 9800.00),
('bbbb0003-0000-0000-0000-000000000003', 3500.00, 0, 0, 180.00, 150.00, 12500.00);

INSERT INTO contrato_unidades (contrato_id, unidad_id, assigned_by, activo) VALUES
('bbbb0001-0000-0000-0000-000000000001', 'aaaa0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', TRUE),
('bbbb0002-0000-0000-0000-000000000002', 'aaaa0002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', TRUE),
('bbbb0003-0000-0000-0000-000000000003', 'aaaa0003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', TRUE);

INSERT INTO contratos_historial (contrato_id, accion, campo, valor_anterior, valor_nuevo, detalle, usuario_id, ip_address) VALUES
('bbbb0001-0000-0000-0000-000000000001', 'Creación de contrato', NULL, NULL, NULL, 'Contrato registrado en el sistema', '11111111-1111-1111-1111-111111111111', '127.0.0.1'),
('bbbb0002-0000-0000-0000-000000000002', 'Asignación de unidad', 'unidad', NULL, 'DEF-456', 'Se asignó unidad al contrato', '11111111-1111-1111-1111-111111111111', '127.0.0.1'),
('bbbb0003-0000-0000-0000-000000000003', 'Creación de tarifa', 'tarifa_por_tonelada', NULL, '180.00', 'Contrato configurado por tonelada', '11111111-1111-1111-1111-111111111111', '127.0.0.1');

-- =========================================================
-- JORNADAS
-- =========================================================
INSERT INTO jornadas (
  id, codigo, conductor_id, unidad_id, contrato_id, creado_por,
  fecha_jornada, hora_inicio_programada, hora_fin_programada,
  hora_inicio, hora_fin, origen, destino,
  km_estimados, km_recorridos, tipo_carga, peso_carga_ton,
  observaciones, observacion_admin, estado
)
VALUES
(
  'cccc0001-0000-0000-0000-000000000001',
  'JOR-2026-0001',
  '22222222-2222-2222-2222-222222222222',
  'aaaa0001-0000-0000-0000-000000000001',
  'bbbb0001-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '2026-04-24',
  '2026-04-24 08:00:00',
  '2026-04-24 18:00:00',
  '2026-04-24 08:05:00',
  '2026-04-24 18:20:00',
  'Lima',
  'Arequipa',
  520.00,
  525.40,
  'Mineral concentrado',
  18.50,
  'Jornada completada sin incidencias mayores',
  'Cumplimiento correcto',
  'COMPLETADA'
),
(
  'cccc0002-0000-0000-0000-000000000002',
  'JOR-2026-0002',
  '33333333-3333-3333-3333-333333333333',
  'aaaa0002-0000-0000-0000-000000000002',
  'bbbb0002-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  '2026-04-26',
  '2026-04-26 08:00:00',
  '2026-04-26 16:00:00',
  '2026-04-26 08:00:00',
  NULL,
  'Lima',
  'Ica',
  300.00,
  120.80,
  'Paquetería',
  8.00,
  'Jornada en curso',
  NULL,
  'EN_PROCESO'
),
(
  'cccc0003-0000-0000-0000-000000000003',
  'JOR-2026-0003',
  '22222222-2222-2222-2222-222222222222',
  'aaaa0001-0000-0000-0000-000000000001',
  'bbbb0001-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '2026-04-27',
  '2026-04-27 08:00:00',
  '2026-04-27 18:00:00',
  NULL,
  NULL,
  'Lima',
  'Arequipa',
  520.00,
  0,
  'Mineral concentrado',
  18.50,
  NULL,
  NULL,
  'PENDIENTE'
);

UPDATE conductores
SET current_shift_id = 'cccc0002-0000-0000-0000-000000000002'
WHERE usuario_id = '33333333-3333-3333-3333-333333333333';

-- =========================================================
-- ALERTAS
-- =========================================================
INSERT INTO alertas_jornada (
  id, codigo, jornada_id, tipo, estado, severidad, detalle,
  tipo_falla_mecanica, latitud, longitud, direccion, fecha_hora,
  atendida, atendida_por, atendida_at, detalle_resolucion,
  servicio_tecnico_realizado, telefono_contactado, bloqueo_sos_activo
)
VALUES
(
  'dddd0001-0000-0000-0000-000000000001',
  'ALT-2026-0001',
  'cccc0002-0000-0000-0000-000000000002',
  'AUXILIO_MECANICO',
  'ACTIVA',
  'ALTA',
  'Falla mecánica reportada por el conductor',
  'Sobrecalentamiento',
  -13.1588000,
  -74.2236000,
  'Km 250 Panamericana Sur',
  '2026-04-26 09:10:00',
  FALSE,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  FALSE
),
(
  'dddd0002-0000-0000-0000-000000000002',
  'ALT-2026-0002',
  'cccc0001-0000-0000-0000-000000000001',
  'PANICO',
  'RESUELTA',
  'CRITICA',
  'Botón SOS activado por 3 segundos',
  NULL,
  -16.4090000,
  -71.5370000,
  'Ingreso a Arequipa',
  '2026-04-24 17:10:00',
  TRUE,
  '11111111-1111-1111-1111-111111111111',
  '2026-04-24 17:20:00',
  'Alerta validada y cerrada por central',
  'No aplica',
  '999111222',
  TRUE
);

INSERT INTO alertas_historial (alerta_id, accion, detalle, usuario_id, created_at) VALUES
('dddd0001-0000-0000-0000-000000000001', 'Registro de alerta', 'Se recibió auxilio mecánico en ruta', '33333333-3333-3333-3333-333333333333', '2026-04-26 09:10:00'),
('dddd0002-0000-0000-0000-000000000002', 'Cierre de alerta', 'Alerta resuelta por central', '11111111-1111-1111-1111-111111111111', '2026-04-24 17:20:00');

-- =========================================================
-- UBICACIONES / GPS
-- =========================================================
INSERT INTO ubicaciones_jornada (
  id, jornada_id, unidad_id, latitud, longitud, direccion,
  fecha_hora, tipo_registro, velocidad_kmh, rumbo, odometro_km, proveedor
)
VALUES
('eeee0001-0000-0000-0000-000000000001', 'cccc0002-0000-0000-0000-000000000002', 'aaaa0002-0000-0000-0000-000000000002', -12.0464000, -77.0428000, 'Lima Centro',              '2026-04-26 08:00:00', 'INICIO',   0,   0, 18235.20, 'GPSCONTROL'),
('eeee0002-0000-0000-0000-000000000002', 'cccc0002-0000-0000-0000-000000000002', 'aaaa0002-0000-0000-0000-000000000002', -13.1588000, -74.2236000, 'Km 250 Panamericana Sur', '2026-04-26 09:10:00', 'ALERTA',  45, 195, 18355.20, 'GPSCONTROL'),
('eeee0003-0000-0000-0000-000000000003', 'cccc0002-0000-0000-0000-000000000002', 'aaaa0002-0000-0000-0000-000000000002', -13.5319000, -71.9675000, 'Tramo intermedio',         '2026-04-26 10:00:00', 'TRACKING',62, 180, 18410.60, 'GPSCONTROL'),
('eeee0004-0000-0000-0000-000000000004', 'cccc0001-0000-0000-0000-000000000001', 'aaaa0001-0000-0000-0000-000000000001', -16.4090000, -71.5370000, 'Ingreso a Arequipa',       '2026-04-24 18:20:00', 'FIN',      0,   0, 25430.50, 'GPSCONTROL');

INSERT INTO gps_importaciones (
  id, proveedor, nombre_archivo, cargado_por, total_registros, registros_validos,
  registros_invalidos, estado, observaciones, processed_at
)
VALUES
(
  'f1110001-0000-0000-0000-000000000001',
  'GPSCONTROL',
  'tracking_gps_2026-04-26.csv',
  '11111111-1111-1111-1111-111111111111',
  4, 4, 0, 'PROCESADA',
  'Archivo cargado correctamente',
  '2026-04-26 10:05:00'
),
(
  'f1110002-0000-0000-0000-000000000002',
  'GLOBALGPS',
  'globalgps_ruta_arequipa_2026-04-24.xlsx',
  '11111111-1111-1111-1111-111111111111',
  5, 3, 2, 'PROCESADA_CON_ERRORES',
  'Archivo procesado con filas observadas',
  '2026-04-24 19:05:00'
);

INSERT INTO gps_proveedor_formatos (proveedor, nombre_formato, mapeo_columnas, activo)
VALUES
('GPSCONTROL', 'csv_tracking_v1', '{"unidad":"placa","fecha_hora":"fecha","latitud":"lat","longitud":"lon","velocidad_kmh":"velocidad","rumbo":"rumbo","odometro_km":"odometro"}', TRUE),
('GLOBALGPS', 'xlsx_tracking_v2', '{"unidad":"vehicle_plate","fecha_hora":"event_time","latitud":"latitude","longitud":"longitude","velocidad_kmh":"speed","rumbo":"heading","odometro_km":"mileage"}', TRUE),
('GPSCONTROL', 'csv_alertas_v1', '{"unidad":"placa","fecha_hora":"fecha_alerta","latitud":"lat","longitud":"lon","tipo_evento":"evento","detalle":"descripcion"}', TRUE);

INSERT INTO gps_registros (
  importacion_id, unidad_id, jornada_id, fecha_hora, latitud, longitud,
  velocidad_kmh, rumbo, odometro_km, estado, proveedor, raw_payload
)
VALUES
('f1110001-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000002', 'cccc0002-0000-0000-0000-000000000002', '2026-04-26 08:00:00', -12.0464000, -77.0428000,  0,   0, 18235.20, 'DETENIDO', 'GPSCONTROL', '{"status":"stopped"}'),
('f1110001-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000002', 'cccc0002-0000-0000-0000-000000000002', '2026-04-26 09:00:00', -13.1588000, -74.2236000, 45, 195, 18355.20, 'MOVIENDO', 'GPSCONTROL', '{"status":"moving"}'),
('f1110001-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000002', 'cccc0002-0000-0000-0000-000000000002', '2026-04-26 09:30:00', -13.3000000, -73.5000000, 95, 180, 18390.20, 'EXCESO_VELOCIDAD', 'GPSCONTROL', '{"status":"speeding"}'),
('f1110001-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000002', 'cccc0002-0000-0000-0000-000000000002', '2026-04-26 10:00:00', -13.5319000, -71.9675000, 62, 180, 18410.60, 'MOVIENDO', 'GPSCONTROL', '{"status":"moving"}'),
('f1110002-0000-0000-0000-000000000002', 'aaaa0001-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001', '2026-04-24 08:05:00', -12.0464000, -77.0428000, 12, 150, 24910.10, 'MOVIENDO', 'GLOBALGPS', '{"status":"moving","source":"xlsx"}'),
('f1110002-0000-0000-0000-000000000002', 'aaaa0001-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001', '2026-04-24 10:30:00', -13.6500000, -75.2000000, 70, 165, 25120.40, 'MOVIENDO', 'GLOBALGPS', '{"status":"moving","source":"xlsx"}'),
('f1110002-0000-0000-0000-000000000002', 'aaaa0001-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001', '2026-04-24 18:20:00', -16.4090000, -71.5370000, 0, 180, 25430.50, 'DETENIDO', 'GLOBALGPS', '{"status":"stopped","source":"xlsx"}');

INSERT INTO gps_importacion_errores (
  importacion_id, numero_fila, campo, valor_recibido, motivo_error, raw_payload
)
VALUES
('f1110002-0000-0000-0000-000000000002', 4, 'latitud', 'N/A', 'Latitud no numerica', '{"vehicle_plate":"ABC-123","event_time":"2026-04-24 12:00:00","latitude":"N/A","longitude":"-74.990000"}'),
('f1110002-0000-0000-0000-000000000002', 5, 'fecha_hora', '24/04/2026 25:90', 'Fecha u hora invalida', '{"vehicle_plate":"ABC-123","event_time":"24/04/2026 25:90","latitude":"-14.100000","longitude":"-74.500000"}');

INSERT INTO gps_eventos (
  unidad_id, jornada_id, tipo_evento, estado, fecha_hora_inicio, fecha_hora_fin,
  velocidad_maxima, latitud, longitud, distancia_km, detalle
)
VALUES
('aaaa0002-0000-0000-0000-000000000002', 'cccc0002-0000-0000-0000-000000000002', 'DETENCION',         'DETENIDO',          '2026-04-26 08:00:00', '2026-04-26 08:05:00', 0,  -12.0464000, -77.0428000, 0.00, 'Unidad detenida antes de iniciar desplazamiento'),
('aaaa0002-0000-0000-0000-000000000002', 'cccc0002-0000-0000-0000-000000000002', 'MOVIMIENTO',        'MOVIENDO',          '2026-04-26 08:05:00', '2026-04-26 09:25:00', 62, -13.1588000, -74.2236000, 120.80, 'Desplazamiento normal'),
('aaaa0002-0000-0000-0000-000000000002', 'cccc0002-0000-0000-0000-000000000002', 'EXCESO_VELOCIDAD', 'EXCESO_VELOCIDAD', '2026-04-26 09:25:00', '2026-04-26 09:32:00', 95, -13.3000000, -73.5000000, 12.00, 'Velocidad mayor a 90 km/h');

-- =========================================================
-- COMBUSTIBLE
-- =========================================================
INSERT INTO combustible_registros (
  id, jornada_id, unidad_id, conductor_id, contrato_id, tipo_comprobante, numero_comprobante,
  galones, costo_total, kilometraje_actual, kilometraje_anterior, rendimiento_km_galon,
  foto_comprobante_url, observaciones, latitud, longitud, estado, sincronizado, registrado_at
)
VALUES
(
  'f2110001-0000-0000-0000-000000000001',
  'cccc0002-0000-0000-0000-000000000002',
  'aaaa0002-0000-0000-0000-000000000002',
  '33333333-3333-3333-3333-333333333333',
  'bbbb0002-0000-0000-0000-000000000002',
  'TICKET',
  'TCK-0001',
  18.50,
  420.00,
  18355.20,
  18235.20,
  6.49,
  'https://example.com/combustible/tck-0001.jpg',
  'Carga parcial en ruta',
  -13.1588000,
  -74.2236000,
  'SINCRONIZADO',
  TRUE,
  '2026-04-26 09:12:00'
);

-- =========================================================
-- MANTENIMIENTO
-- =========================================================
INSERT INTO camion_mantenimientos (
  unidad_id, tipo, fecha_programada, fecha_ejecutada, kilometraje, costo, proveedor_taller, observaciones
)
VALUES
('aaaa0003-0000-0000-0000-000000000003', 'PREVENTIVO', '2026-04-28', NULL, 32150.75, NULL, 'Taller Volvo Lima', 'Cambio de filtros y revisión general'),
('aaaa0001-0000-0000-0000-000000000001', 'INSPECCION', '2026-03-10', '2026-03-10', 25000.00, 350.00, 'Taller Norte', 'Inspección rutinaria');

-- =========================================================
-- AUDITORIA / SESIONES
-- =========================================================
INSERT INTO auditoria_accesos (usuario_id, correo, rol, accion, resultado, ip_address, user_agent, dispositivo, detalle)
VALUES
('11111111-1111-1111-1111-111111111111', 'admin@nanutech.com',   'ADMIN',   'LOGIN',             'EXITOSO', '127.0.0.1', 'Mozilla/5.0', 'Chrome Desktop', 'Inicio de sesión correcto'),
('33333333-3333-3333-3333-333333333333', 'chofer2@nanutech.com', 'CHOFER',  'INICIAR_JORNADA',   'EXITOSO', '127.0.0.1', 'Mozilla/5.0', 'Android',        'Jornada iniciada desde panel chofer'),
('55555555-5555-5555-5555-555555555555', 'gerencia@nanutech.com','GERENTE', 'CONSULTA_DASHBOARD','EXITOSO', '127.0.0.1', 'Mozilla/5.0', 'Chrome Desktop', 'Consulta dashboard gerencial');

INSERT INTO login_intentos (email, intentos_fallidos, ultimo_intento, bloqueado_hasta)
VALUES ('invalido@nanutech.com', 2, NOW() - INTERVAL '2 hours', NULL);

INSERT INTO password_reset_tokens (usuario_id, email, token, expira_at, usado)
VALUES ('22222222-2222-2222-2222-222222222222', 'chofer1@nanutech.com', 'RESET-TOKEN-001', NOW() + INTERVAL '1 day', FALSE);

INSERT INTO sesiones_usuario (usuario_id, access_token_jti, refresh_token_jti, expira_at, ultimo_evento_at, estado)
VALUES
('11111111-1111-1111-1111-111111111111', 'JTI-ACCESS-ADMIN-001', 'JTI-REFRESH-ADMIN-001', NOW() + INTERVAL '8 hours', NOW(), 'ACTIVA'),
('33333333-3333-3333-3333-333333333333', 'JTI-ACCESS-DRV-002',   'JTI-REFRESH-DRV-002',   NOW() + INTERVAL '8 hours', NOW(), 'ACTIVA');

-- =========================================================
-- HISTORIAL DE CONDUCTORES
-- =========================================================
INSERT INTO conductores_historial (conductor_id, accion, campo, valor_anterior, valor_nuevo, detalle, usuario_id, ip_address)
VALUES
('22222222-2222-2222-2222-222222222222', 'Actualización de estado operacional', 'estado_operacional', 'DISPONIBLE', 'DISPONIBLE', 'Validación administrativa', '11111111-1111-1111-1111-111111111111', '127.0.0.1'),
('33333333-3333-3333-3333-333333333333', 'Asignación de jornada', 'current_shift_id', NULL, 'cccc0002-0000-0000-0000-000000000002', 'Conductor asignado a jornada activa', '11111111-1111-1111-1111-111111111111', '127.0.0.1');
`;
