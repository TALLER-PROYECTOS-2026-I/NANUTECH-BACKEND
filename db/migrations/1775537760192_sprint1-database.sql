-- ============================================
-- MIGRACION INICIAL - NANUTECH BACKEND
-- ============================================

-- migrate:up

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'CHOFER', 'GERENTE');
CREATE TYPE estado_usuario AS ENUM ('ACTIVO', 'INACTIVO', 'BLOQUEADO');

CREATE TYPE estado_operacional_conductor AS ENUM (
  'DISPONIBLE',
  'EN_RUTA',
  'DESCANSO',
  'LICENCIA',
  'INACTIVO'
);

CREATE TYPE categoria_licencia AS ENUM (
  'A-I','A-II-a','A-II-b','A-III-a','A-III-b','A-III-c','C','D','E'
);

CREATE TYPE estado_unidad AS ENUM (
  'DISPONIBLE',
  'EN_JORNADA',
  'EN_AUXILIO',
  'MANTENIMIENTO',
  'INACTIVA'
);

CREATE TYPE tipo_combustible AS ENUM (
  'DIESEL',
  'GASOLINA',
  'GNV',
  'GLP',
  'ELECTRICO',
  'HIBRIDO'
);

CREATE TYPE estado_contrato AS ENUM (
  'VIGENTE',
  'VENCIDO',
  'SUSPENDIDO',
  'INACTIVO'
);

CREATE TYPE tipo_servicio_contrato AS ENUM (
  'POR_VIAJE',
  'POR_HORA',
  'POR_TONELADA',
  'POR_KM',
  'MENSUAL'
);

CREATE TYPE estado_jornada AS ENUM (
  'REGISTRADA',
  'PENDIENTE',
  'EN_PROCESO',
  'COMPLETADA',
  'CANCELADA'
);

CREATE TYPE tipo_alerta AS ENUM (
  'PANICO',
  'AUXILIO_MECANICO',
  'OBSERVACION'
);

CREATE TYPE estado_alerta_operativa AS ENUM (
  'ACTIVA',
  'EN_PROCESO',
  'RESUELTA',
  'FALSA_ALARMA'
);

CREATE TYPE severidad_alerta AS ENUM (
  'BAJA',
  'MEDIA',
  'ALTA',
  'CRITICA'
);

CREATE TYPE tipo_registro_ubicacion AS ENUM (
  'INICIO',
  'FIN',
  'ALERTA',
  'TRACKING',
  'COMBUSTIBLE'
);

CREATE TYPE proveedor_gps AS ENUM (
  'GPSCONTROL',
  'GLOBALGPS',
  'OTRO'
);

CREATE TYPE estado_tracking AS ENUM (
  'MOVIENDO',
  'DETENIDO',
  'EXCESO_VELOCIDAD'
);

CREATE TYPE tipo_evento_gps AS ENUM (
  'MOVIMIENTO',
  'DETENCION',
  'EXCESO_VELOCIDAD',
  'FUERA_RUTA',
  'GPS_OFFLINE'
);

CREATE TYPE tipo_mantenimiento AS ENUM (
  'PREVENTIVO',
  'CORRECTIVO',
  'INSPECCION'
);

CREATE TYPE estado_asignacion AS ENUM (
  'ACTIVA',
  'FINALIZADA',
  'CANCELADA'
);

CREATE TYPE estado_importacion AS ENUM (
  'PENDIENTE',
  'PROCESADA',
  'PROCESADA_CON_ERRORES',
  'RECHAZADA'
);

CREATE TYPE resultado_auditoria AS ENUM (
  'EXITOSO',
  'FALLIDO'
);

CREATE TYPE estado_sesion AS ENUM (
  'ACTIVA',
  'EXPIRADA',
  'CERRADA',
  'REVOCADA'
);

CREATE TYPE tipo_comprobante_combustible AS ENUM (
  'BOLETA',
  'FACTURA',
  'TICKET',
  'OTRO'
);

CREATE TYPE estado_combustible AS ENUM (
  'BORRADOR',
  'PENDIENTE_SINCRONIZACION',
  'SINCRONIZADO',
  'ANULADO'
);

-- =========================================================
-- SEGURIDAD / USUARIOS
-- =========================================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_sub VARCHAR(100) UNIQUE,
  correo VARCHAR(120) NOT NULL UNIQUE,
  nombres VARCHAR(80) NOT NULL,
  apellidos VARCHAR(80) NOT NULL,
  rol rol_usuario NOT NULL,
  telefono VARCHAR(20),
  dni VARCHAR(15) UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  estado estado_usuario NOT NULL DEFAULT 'ACTIVO',
  ultimo_acceso TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE login_intentos (
  email VARCHAR(120) PRIMARY KEY,
  intentos_fallidos INTEGER NOT NULL DEFAULT 0,
  ultimo_intento TIMESTAMP,
  bloqueado_hasta TIMESTAMP
);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  email VARCHAR(120) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expira_at TIMESTAMP NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  usado_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sesiones_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  access_token_jti VARCHAR(255),
  refresh_token_jti VARCHAR(255),
  expira_at TIMESTAMP NOT NULL,
  ultimo_evento_at TIMESTAMP NOT NULL DEFAULT NOW(),
  estado estado_sesion NOT NULL DEFAULT 'ACTIVA',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- NOTA: auditoria_accesos NO se crea aqui.
-- La crea la migracion 1779678075986_auditoria-accesos.sql (HU-13).

-- =========================================================
-- CONDUCTORES
-- =========================================================
CREATE TABLE conductores (
  usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_nacimiento DATE,
  direccion VARCHAR(200),
  fecha_ingreso DATE,
  estado_operacional estado_operacional_conductor NOT NULL DEFAULT 'DISPONIBLE',
  current_shift_id UUID,
  observaciones TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE contactos_emergencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_id UUID NOT NULL REFERENCES conductores(usuario_id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  parentesco VARCHAR(50),
  es_principal BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE licencias_conducir (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_id UUID NOT NULL REFERENCES conductores(usuario_id) ON DELETE CASCADE,
  numero_licencia VARCHAR(40) NOT NULL UNIQUE,
  categoria categoria_licencia NOT NULL,
  fecha_emision DATE,
  fecha_vencimiento DATE NOT NULL,
  autoridad_emisora VARCHAR(120),
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_licencias_fechas
    CHECK (fecha_emision IS NULL OR fecha_vencimiento >= fecha_emision)
);

CREATE TABLE conductores_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_id UUID NOT NULL REFERENCES conductores(usuario_id) ON DELETE CASCADE,
  accion VARCHAR(120) NOT NULL,
  campo VARCHAR(80),
  valor_anterior TEXT,
  valor_nuevo TEXT,
  detalle TEXT,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ip_address INET,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================================================
-- GPS / CAMIONES / UNIDADES
-- =========================================================
CREATE TABLE gps_dispositivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_equipo VARCHAR(50) NOT NULL UNIQUE,
  proveedor proveedor_gps NOT NULL DEFAULT 'OTRO',
  imei VARCHAR(30) UNIQUE,
  numero_sim VARCHAR(30),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  ultima_sincronizacion TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa VARCHAR(20) NOT NULL UNIQUE,
  marca VARCHAR(50),
  modelo VARCHAR(50),
  anio INTEGER,
  capacidad_ton NUMERIC(10,2),
  estado estado_unidad NOT NULL DEFAULT 'DISPONIBLE',
  gps_habilitado BOOLEAN NOT NULL DEFAULT TRUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  vin VARCHAR(50) UNIQUE,
  color VARCHAR(30),
  tipo_combustible tipo_combustible,
  fecha_registro DATE,
  ultima_fecha_mantenimiento DATE,
  proxima_fecha_mantenimiento DATE,
  kilometraje_actual NUMERIC(12,2) NOT NULL DEFAULT 0,
  gps_device_id UUID REFERENCES gps_dispositivos(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_unidades_anio CHECK (anio IS NULL OR anio BETWEEN 1990 AND 2100),
  CONSTRAINT chk_unidades_capacidad CHECK (capacidad_ton IS NULL OR capacidad_ton >= 0),
  CONSTRAINT chk_unidades_km CHECK (kilometraje_actual >= 0)
);

-- tabla legacy para tu repo actual src/functions/camion-services/*
CREATE TABLE camiones (
  id BIGSERIAL PRIMARY KEY,
  unidad_id UUID UNIQUE REFERENCES unidades(id) ON DELETE CASCADE,
  placa VARCHAR(20) NOT NULL UNIQUE,
  marca VARCHAR(50),
  modelo VARCHAR(50),
  estado VARCHAR(30) NOT NULL DEFAULT 'disponible',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE camion_mantenimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  tipo tipo_mantenimiento NOT NULL,
  fecha_programada DATE,
  fecha_ejecutada DATE,
  kilometraje NUMERIC(12,2),
  costo NUMERIC(12,2),
  proveedor_taller VARCHAR(150),
  observaciones TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE asignaciones_conductor_unidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_id UUID NOT NULL REFERENCES conductores(usuario_id) ON DELETE CASCADE,
  unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_fin TIMESTAMP,
  estado estado_asignacion NOT NULL DEFAULT 'ACTIVA',
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  observaciones TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_asignacion_fechas CHECK (
    fecha_fin IS NULL OR fecha_fin >= fecha_inicio
  )
);

-- =========================================================
-- CONTRATOS
-- =========================================================
CREATE TABLE contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(30) NOT NULL UNIQUE,
  cliente VARCHAR(120) NOT NULL,
  ruc VARCHAR(11),
  descripcion TEXT,
  tipo_servicio tipo_servicio_contrato NOT NULL DEFAULT 'POR_VIAJE',
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  tarifa NUMERIC(12,2),
  moneda VARCHAR(10) NOT NULL DEFAULT 'PEN',
  estado estado_contrato NOT NULL DEFAULT 'VIGENTE',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_contratos_fechas CHECK (
    fecha_fin IS NULL OR fecha_fin >= fecha_inicio
  ),
  CONSTRAINT chk_contratos_tarifa CHECK (
    tarifa IS NULL OR tarifa >= 0
  ),
  CONSTRAINT chk_contratos_ruc CHECK (
    ruc IS NULL OR ruc ~ '^[0-9]{11}$'
  )
);

CREATE TABLE contrato_rutas (
  contrato_id UUID PRIMARY KEY REFERENCES contratos(id) ON DELETE CASCADE,
  origen VARCHAR(150) NOT NULL,
  destino VARCHAR(150) NOT NULL,
  distancia_estimada_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_contrato_distancia CHECK (distancia_estimada_km >= 0)
);

CREATE TABLE contrato_tarifas (
  contrato_id UUID PRIMARY KEY REFERENCES contratos(id) ON DELETE CASCADE,
  tarifa_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  tarifa_por_km NUMERIC(12,2) NOT NULL DEFAULT 0,
  tarifa_por_hora NUMERIC(12,2) NOT NULL DEFAULT 0,
  tarifa_por_tonelada NUMERIC(12,2) NOT NULL DEFAULT 0,
  tarifa_espera NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_referencial NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE contrato_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE contratos_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  accion VARCHAR(120) NOT NULL,
  campo VARCHAR(80),
  valor_anterior TEXT,
  valor_nuevo TEXT,
  detalle TEXT,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ip_address INET,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================================================
-- JORNADAS
-- =========================================================
CREATE TABLE jornadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(30) UNIQUE,
  conductor_id UUID NOT NULL REFERENCES usuarios(id),
  unidad_id UUID NOT NULL REFERENCES unidades(id),
  contrato_id UUID NOT NULL REFERENCES contratos(id),
  creado_por UUID NOT NULL REFERENCES usuarios(id),
  fecha_jornada DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_inicio_programada TIMESTAMP,
  hora_fin_programada TIMESTAMP,
  hora_inicio TIMESTAMP,
  hora_fin TIMESTAMP,
  origen VARCHAR(150),
  destino VARCHAR(150),
  km_estimados NUMERIC(10,2) NOT NULL DEFAULT 0,
  km_recorridos NUMERIC(10,2) NOT NULL DEFAULT 0,
  tipo_carga VARCHAR(120),
  peso_carga_ton NUMERIC(10,2),
  observaciones VARCHAR(500),
  observacion_admin TEXT,
  estado estado_jornada NOT NULL DEFAULT 'REGISTRADA',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_jornadas_horas CHECK (
    hora_fin IS NULL OR hora_inicio IS NULL OR hora_fin >= hora_inicio
  ),
  CONSTRAINT chk_jornadas_horas_programadas CHECK (
    hora_fin_programada IS NULL OR hora_inicio_programada IS NULL OR hora_fin_programada >= hora_inicio_programada
  ),
  CONSTRAINT chk_jornadas_km CHECK (
    km_estimados >= 0 AND km_recorridos >= 0
  ),
  CONSTRAINT chk_jornadas_peso CHECK (
    peso_carga_ton IS NULL OR peso_carga_ton >= 0
  )
);

ALTER TABLE conductores
  ADD CONSTRAINT fk_conductores_current_shift
  FOREIGN KEY (current_shift_id) REFERENCES jornadas(id) ON DELETE SET NULL;

-- =========================================================
-- ALERTAS Y AUXILIO
-- =========================================================
CREATE TABLE alertas_jornada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(30) UNIQUE,
  jornada_id UUID NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
  tipo tipo_alerta NOT NULL,
  estado estado_alerta_operativa NOT NULL DEFAULT 'ACTIVA',
  severidad severidad_alerta NOT NULL DEFAULT 'MEDIA',
  detalle TEXT,
  tipo_falla_mecanica VARCHAR(120),
  latitud NUMERIC(10,7) NOT NULL,
  longitud NUMERIC(10,7) NOT NULL,
  direccion VARCHAR(200),
  fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),
  atendida BOOLEAN NOT NULL DEFAULT FALSE,
  atendida_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  atendida_at TIMESTAMP,
  detalle_resolucion TEXT,
  servicio_tecnico_realizado TEXT,
  telefono_contactado VARCHAR(20),
  bloqueo_sos_activo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_alertas_latitud CHECK (latitud BETWEEN -90 AND 90),
  CONSTRAINT chk_alertas_longitud CHECK (longitud BETWEEN -180 AND 180),
  CONSTRAINT chk_alertas_atencion CHECK (
    (atendida = FALSE)
    OR (atendida = TRUE AND atendida_at IS NOT NULL)
  )
);

CREATE TABLE alertas_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id UUID NOT NULL REFERENCES alertas_jornada(id) ON DELETE CASCADE,
  accion VARCHAR(120) NOT NULL,
  detalle TEXT,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================================================
-- UBICACIONES / GPS
-- =========================================================
CREATE TABLE ubicaciones_jornada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id UUID NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
  unidad_id UUID REFERENCES unidades(id) ON DELETE SET NULL,
  latitud NUMERIC(10,7) NOT NULL,
  longitud NUMERIC(10,7) NOT NULL,
  direccion VARCHAR(200),
  fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),
  tipo_registro tipo_registro_ubicacion NOT NULL,
  velocidad_kmh NUMERIC(8,2),
  rumbo NUMERIC(6,2),
  odometro_km NUMERIC(12,2),
  proveedor proveedor_gps,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ubicaciones_latitud CHECK (latitud BETWEEN -90 AND 90),
  CONSTRAINT chk_ubicaciones_longitud CHECK (longitud BETWEEN -180 AND 180),
  CONSTRAINT chk_ubicaciones_velocidad CHECK (
    velocidad_kmh IS NULL OR velocidad_kmh >= 0
  )
);

CREATE TABLE gps_importaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor proveedor_gps NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  cargado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  total_registros INTEGER NOT NULL DEFAULT 0,
  registros_validos INTEGER NOT NULL DEFAULT 0,
  registros_invalidos INTEGER NOT NULL DEFAULT 0,
  estado estado_importacion NOT NULL DEFAULT 'PENDIENTE',
  observaciones TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE TABLE gps_importacion_errores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacion_id UUID NOT NULL REFERENCES gps_importaciones(id) ON DELETE CASCADE,
  numero_fila INTEGER NOT NULL,
  campo VARCHAR(80),
  valor_recibido TEXT,
  motivo_error TEXT NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE gps_proveedor_formatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor VARCHAR(80) NOT NULL,
  nombre_formato VARCHAR(120) NOT NULL,
  mapeo_columnas JSONB NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_gps_proveedor_formato UNIQUE (proveedor, nombre_formato)
);

CREATE TABLE gps_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacion_id UUID REFERENCES gps_importaciones(id) ON DELETE SET NULL,
  unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  jornada_id UUID REFERENCES jornadas(id) ON DELETE SET NULL,
  fecha_hora TIMESTAMP NOT NULL,
  latitud NUMERIC(10,7) NOT NULL,
  longitud NUMERIC(10,7) NOT NULL,
  velocidad_kmh NUMERIC(8,2),
  rumbo NUMERIC(6,2),
  odometro_km NUMERIC(12,2),
  estado estado_tracking,
  proveedor proveedor_gps NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_gps_latitud CHECK (latitud BETWEEN -90 AND 90),
  CONSTRAINT chk_gps_longitud CHECK (longitud BETWEEN -180 AND 180)
);

CREATE TABLE gps_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  jornada_id UUID REFERENCES jornadas(id) ON DELETE SET NULL,
  tipo_evento tipo_evento_gps NOT NULL,
  estado estado_tracking,
  fecha_hora_inicio TIMESTAMP NOT NULL,
  fecha_hora_fin TIMESTAMP,
  velocidad_maxima NUMERIC(8,2),
  latitud NUMERIC(10,7),
  longitud NUMERIC(10,7),
  distancia_km NUMERIC(10,2),
  detalle TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_gps_evento_fechas CHECK (
    fecha_hora_fin IS NULL OR fecha_hora_fin >= fecha_hora_inicio
  )
);

-- =========================================================
-- COMBUSTIBLE
-- =========================================================
CREATE TABLE combustible_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id UUID REFERENCES jornadas(id) ON DELETE SET NULL,
  unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  conductor_id UUID NOT NULL REFERENCES conductores(usuario_id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
  tipo_comprobante tipo_comprobante_combustible DEFAULT 'TICKET',
  numero_comprobante VARCHAR(50),
  galones NUMERIC(10,2) NOT NULL,
  costo_total NUMERIC(12,2) NOT NULL,
  kilometraje_actual NUMERIC(12,2) NOT NULL,
  kilometraje_anterior NUMERIC(12,2) DEFAULT 0,
  rendimiento_km_galon NUMERIC(10,2),
  foto_comprobante_url TEXT,
  observaciones TEXT,
  latitud NUMERIC(10,7),
  longitud NUMERIC(10,7),
  estado estado_combustible NOT NULL DEFAULT 'SINCRONIZADO',
  sincronizado BOOLEAN NOT NULL DEFAULT TRUE,
  registrado_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_combustible_galones CHECK (galones > 0),
  CONSTRAINT chk_combustible_costo CHECK (costo_total >= 0),
  CONSTRAINT chk_combustible_km CHECK (kilometraje_actual >= kilometraje_anterior)
);

-- =========================================================
-- ÍNDICES
-- =========================================================
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_estado ON usuarios(estado);

CREATE INDEX idx_sesiones_usuario ON sesiones_usuario(usuario_id);
CREATE INDEX idx_sesiones_estado ON sesiones_usuario(estado);
CREATE INDEX idx_reset_email ON password_reset_tokens(email);

-- NOTA: los indices de auditoria_accesos se crean en la migracion HU-13.

CREATE INDEX idx_conductores_estado_operacional ON conductores(estado_operacional);
CREATE INDEX idx_contactos_emergencia_conductor ON contactos_emergencia(conductor_id);
CREATE INDEX idx_licencias_conductor ON licencias_conducir(conductor_id);
CREATE INDEX idx_licencias_vencimiento ON licencias_conducir(fecha_vencimiento);

CREATE INDEX idx_unidades_estado ON unidades(estado);
CREATE INDEX idx_unidades_gps_device ON unidades(gps_device_id);
CREATE INDEX idx_camiones_unidad_id ON camiones(unidad_id);
CREATE INDEX idx_camiones_estado ON camiones(estado);
CREATE INDEX idx_mantenimientos_unidad ON camion_mantenimientos(unidad_id);

CREATE INDEX idx_asignaciones_conductor ON asignaciones_conductor_unidad(conductor_id);
CREATE INDEX idx_asignaciones_unidad ON asignaciones_conductor_unidad(unidad_id);
CREATE UNIQUE INDEX uq_asignacion_activa_conductor
  ON asignaciones_conductor_unidad(conductor_id)
  WHERE estado = 'ACTIVA';
CREATE UNIQUE INDEX uq_asignacion_activa_unidad
  ON asignaciones_conductor_unidad(unidad_id)
  WHERE estado = 'ACTIVA';

CREATE INDEX idx_contratos_estado ON contratos(estado);
CREATE INDEX idx_contratos_tipo_servicio ON contratos(tipo_servicio);
CREATE UNIQUE INDEX uq_contrato_unidad_activa
  ON contrato_unidades(contrato_id, unidad_id)
  WHERE activo = TRUE;

CREATE INDEX idx_jornadas_fecha ON jornadas(fecha_jornada);
CREATE INDEX idx_jornadas_estado ON jornadas(estado);
CREATE INDEX idx_jornadas_conductor ON jornadas(conductor_id);
CREATE INDEX idx_jornadas_unidad ON jornadas(unidad_id);
CREATE INDEX idx_jornadas_contrato ON jornadas(contrato_id);
CREATE UNIQUE INDEX uq_jornada_activa_unidad
  ON jornadas(unidad_id)
  WHERE estado IN ('REGISTRADA', 'PENDIENTE', 'EN_PROCESO');
CREATE UNIQUE INDEX uq_jornada_activa_chofer
  ON jornadas(conductor_id)
  WHERE estado IN ('REGISTRADA', 'PENDIENTE', 'EN_PROCESO');

CREATE INDEX idx_alertas_jornada ON alertas_jornada(jornada_id);
CREATE INDEX idx_alertas_tipo ON alertas_jornada(tipo);
CREATE INDEX idx_alertas_estado ON alertas_jornada(estado);
CREATE INDEX idx_alertas_fecha_hora ON alertas_jornada(fecha_hora);
CREATE INDEX idx_alertas_historial_alerta ON alertas_historial(alerta_id);

CREATE INDEX idx_ubicaciones_jornada ON ubicaciones_jornada(jornada_id);
CREATE INDEX idx_ubicaciones_unidad ON ubicaciones_jornada(unidad_id);
CREATE INDEX idx_ubicaciones_fecha_hora ON ubicaciones_jornada(fecha_hora);

CREATE INDEX idx_gps_importacion_errores_importacion ON gps_importacion_errores(importacion_id);
CREATE INDEX idx_gps_registros_unidad ON gps_registros(unidad_id);
CREATE INDEX idx_gps_registros_jornada ON gps_registros(jornada_id);
CREATE INDEX idx_gps_registros_fecha_hora ON gps_registros(fecha_hora);
CREATE UNIQUE INDEX uq_gps_registros_proveedor_unidad_fecha
  ON gps_registros(proveedor, unidad_id, fecha_hora);
CREATE INDEX idx_gps_eventos_unidad ON gps_eventos(unidad_id);
CREATE INDEX idx_gps_eventos_jornada ON gps_eventos(jornada_id);
CREATE INDEX idx_gps_eventos_tipo ON gps_eventos(tipo_evento);

CREATE INDEX idx_combustible_unidad ON combustible_registros(unidad_id);
CREATE INDEX idx_combustible_conductor ON combustible_registros(conductor_id);
CREATE INDEX idx_combustible_jornada ON combustible_registros(jornada_id);

-- =========================================================
-- TRIGGER GENERICO updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tg_conductores_updated_at
BEFORE UPDATE ON conductores
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tg_licencias_updated_at
BEFORE UPDATE ON licencias_conducir
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tg_gps_dispositivos_updated_at
BEFORE UPDATE ON gps_dispositivos
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tg_gps_proveedor_formatos_updated_at
BEFORE UPDATE ON gps_proveedor_formatos
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tg_unidades_updated_at
BEFORE UPDATE ON unidades
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tg_camiones_updated_at
BEFORE UPDATE ON camiones
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tg_mantenimientos_updated_at
BEFORE UPDATE ON camion_mantenimientos
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tg_contratos_updated_at
BEFORE UPDATE ON contratos
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tg_jornadas_updated_at
BEFORE UPDATE ON jornadas
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- =========================================================
-- SINCRONIZACION unidades <-> camiones
-- =========================================================
CREATE OR REPLACE FUNCTION fn_map_camion_estado_to_unidad(p_estado TEXT)
RETURNS estado_unidad AS $$
BEGIN
  RETURN CASE LOWER(COALESCE(p_estado, 'disponible'))
    WHEN 'disponible' THEN 'DISPONIBLE'
    WHEN 'available' THEN 'DISPONIBLE'
    WHEN 'activo' THEN 'DISPONIBLE'
    WHEN 'active' THEN 'DISPONIBLE'
    WHEN 'en_uso' THEN 'EN_JORNADA'
    WHEN 'in_use' THEN 'EN_JORNADA'
    WHEN 'en_jornada' THEN 'EN_JORNADA'
    WHEN 'en_auxilio' THEN 'EN_AUXILIO'
    WHEN 'auxilio' THEN 'EN_AUXILIO'
    WHEN 'mantenimiento' THEN 'MANTENIMIENTO'
    WHEN 'maintenance' THEN 'MANTENIMIENTO'
    ELSE 'INACTIVA'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION fn_map_unidad_estado_to_camion(p_estado estado_unidad)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE p_estado
    WHEN 'DISPONIBLE' THEN 'disponible'
    WHEN 'EN_JORNADA' THEN 'en_uso'
    WHEN 'EN_AUXILIO' THEN 'en_auxilio'
    WHEN 'MANTENIMIENTO' THEN 'maintenance'
    ELSE 'inactivo'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION fn_sync_unidad_to_camion()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO camiones (unidad_id, placa, marca, modelo, estado, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.placa,
      NEW.marca,
      NEW.modelo,
      fn_map_unidad_estado_to_camion(NEW.estado),
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (unidad_id) DO UPDATE
      SET placa = EXCLUDED.placa,
          marca = EXCLUDED.marca,
          modelo = EXCLUDED.modelo,
          estado = EXCLUDED.estado,
          updated_at = NOW();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE camiones
       SET placa = NEW.placa,
           marca = NEW.marca,
           modelo = NEW.modelo,
           estado = fn_map_unidad_estado_to_camion(NEW.estado),
           updated_at = NOW()
     WHERE unidad_id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM camiones WHERE unidad_id = OLD.id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_sync_camion_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_unidad_id UUID;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.unidad_id IS NULL THEN
    INSERT INTO unidades (
      placa, marca, modelo, estado, gps_habilitado, activo, created_at, updated_at
    )
    VALUES (
      NEW.placa,
      NEW.marca,
      NEW.modelo,
      fn_map_camion_estado_to_unidad(NEW.estado),
      TRUE,
      TRUE,
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.updated_at, NOW())
    )
    RETURNING id INTO v_unidad_id;

    NEW.unidad_id := v_unidad_id;
  END IF;

  NEW.created_at := COALESCE(NEW.created_at, NOW());
  NEW.updated_at := COALESCE(NEW.updated_at, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_sync_camion_after_update()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  UPDATE unidades
     SET placa = NEW.placa,
         marca = NEW.marca,
         modelo = NEW.modelo,
         estado = fn_map_camion_estado_to_unidad(NEW.estado),
         updated_at = NOW()
   WHERE id = NEW.unidad_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_sync_camion_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;

  DELETE FROM unidades WHERE id = OLD.unidad_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_unidad_to_camion_ins
AFTER INSERT ON unidades
FOR EACH ROW EXECUTE FUNCTION fn_sync_unidad_to_camion();

CREATE TRIGGER tg_unidad_to_camion_upd
AFTER UPDATE ON unidades
FOR EACH ROW EXECUTE FUNCTION fn_sync_unidad_to_camion();

CREATE TRIGGER tg_unidad_to_camion_del
AFTER DELETE ON unidades
FOR EACH ROW EXECUTE FUNCTION fn_sync_unidad_to_camion();

CREATE TRIGGER tg_camion_before_insert
BEFORE INSERT ON camiones
FOR EACH ROW EXECUTE FUNCTION fn_sync_camion_before_insert();

CREATE TRIGGER tg_camion_after_update
AFTER UPDATE ON camiones
FOR EACH ROW EXECUTE FUNCTION fn_sync_camion_after_update();

CREATE TRIGGER tg_camion_after_delete
AFTER DELETE ON camiones
FOR EACH ROW EXECUTE FUNCTION fn_sync_camion_after_delete();

-- =========================================================
-- VISTAS
-- =========================================================
CREATE OR REPLACE VIEW vw_conductores_full AS
SELECT
  u.id AS usuario_id,
  u.cognito_sub,
  u.correo,
  u.nombres,
  u.apellidos,
  CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
  u.telefono,
  u.dni,
  u.rol,
  u.estado AS estado_usuario,
  c.fecha_nacimiento,
  c.direccion,
  c.fecha_ingreso,
  c.estado_operacional,
  c.current_shift_id,
  lc.numero_licencia,
  lc.categoria AS licencia_categoria,
  lc.fecha_vencimiento AS licencia_vencimiento,
  ce.nombre AS contacto_emergencia_nombre,
  ce.telefono AS contacto_emergencia_telefono,
  ce.parentesco AS contacto_emergencia_parentesco,
  a.unidad_id AS unidad_asignada_id,
  un.placa AS placa_asignada
FROM usuarios u
JOIN conductores c ON c.usuario_id = u.id
LEFT JOIN LATERAL (
  SELECT l.*
  FROM licencias_conducir l
  WHERE l.conductor_id = c.usuario_id AND l.activa = TRUE
  ORDER BY l.fecha_vencimiento DESC
  LIMIT 1
) lc ON TRUE
LEFT JOIN LATERAL (
  SELECT x.*
  FROM contactos_emergencia x
  WHERE x.conductor_id = c.usuario_id AND x.es_principal = TRUE
  ORDER BY x.created_at DESC
  LIMIT 1
) ce ON TRUE
LEFT JOIN LATERAL (
  SELECT ac.*
  FROM asignaciones_conductor_unidad ac
  WHERE ac.conductor_id = c.usuario_id AND ac.estado = 'ACTIVA'
  ORDER BY ac.fecha_inicio DESC
  LIMIT 1
) a ON TRUE
LEFT JOIN unidades un ON un.id = a.unidad_id
WHERE u.rol = 'CHOFER';

CREATE OR REPLACE VIEW vw_camiones_operativos AS
SELECT
  un.id AS unidad_id,
  c.id AS camion_legacy_id,
  un.placa,
  un.marca,
  un.modelo,
  un.anio,
  un.capacidad_ton,
  un.estado,
  un.activo,
  un.vin,
  un.color,
  un.tipo_combustible,
  un.kilometraje_actual,
  un.gps_habilitado,
  gd.codigo_equipo AS gps_codigo_equipo,
  gd.proveedor AS gps_proveedor,
  un.ultima_fecha_mantenimiento,
  un.proxima_fecha_mantenimiento
FROM unidades un
LEFT JOIN camiones c ON c.unidad_id = un.id
LEFT JOIN gps_dispositivos gd ON gd.id = un.gps_device_id;

CREATE OR REPLACE VIEW vw_historial_jornadas_chofer AS
SELECT
  j.id,
  j.codigo,
  j.conductor_id,
  j.fecha_jornada,
  j.origen,
  j.destino,
  j.hora_inicio,
  j.hora_fin,
  CASE
    WHEN j.hora_inicio IS NOT NULL AND j.hora_fin IS NOT NULL
    THEN (j.hora_fin - j.hora_inicio)
    ELSE NULL
  END AS duracion_total,
  j.km_recorridos,
  j.observaciones,
  j.estado,
  j.unidad_id,
  un.placa
FROM jornadas j
JOIN unidades un ON un.id = j.unidad_id
WHERE j.estado = 'COMPLETADA';

CREATE OR REPLACE VIEW vw_seguimiento_jornadas AS
SELECT
  j.id,
  j.codigo,
  j.fecha_jornada,
  j.conductor_id,
  CONCAT(u.nombres, ' ', u.apellidos) AS nombre_chofer,
  j.unidad_id,
  un.placa AS placa_camion,
  un.marca,
  un.modelo,
  j.contrato_id,
  c.codigo AS codigo_contrato,
  c.cliente,
  j.origen,
  j.destino,
  j.hora_inicio,
  j.hora_fin,
  CASE
    WHEN j.hora_inicio IS NOT NULL AND j.hora_fin IS NOT NULL
    THEN (j.hora_fin - j.hora_inicio)
    ELSE NULL
  END AS duracion_total,
  j.km_estimados,
  j.km_recorridos,
  j.estado,
  j.observaciones,
  EXISTS (
    SELECT 1 FROM alertas_jornada a
    WHERE a.jornada_id = j.id AND a.tipo = 'PANICO'
  ) AS tiene_panico,
  EXISTS (
    SELECT 1 FROM alertas_jornada a
    WHERE a.jornada_id = j.id AND a.tipo = 'AUXILIO_MECANICO'
  ) AS tiene_auxilio,
  (SELECT COUNT(*) FROM alertas_jornada a WHERE a.jornada_id = j.id) AS total_alertas
FROM jornadas j
JOIN usuarios u ON u.id = j.conductor_id
JOIN unidades un ON un.id = j.unidad_id
JOIN contratos c ON c.id = j.contrato_id
ORDER BY j.fecha_jornada DESC, j.created_at DESC;

CREATE OR REPLACE VIEW vw_tracking_gps AS
SELECT
  gr.id,
  gr.unidad_id,
  un.placa,
  gr.jornada_id,
  gr.fecha_hora,
  gr.latitud,
  gr.longitud,
  gr.rumbo,
  gr.velocidad_kmh,
  gr.estado,
  gr.odometro_km,
  gr.proveedor
FROM gps_registros gr
JOIN unidades un ON un.id = gr.unidad_id;

CREATE OR REPLACE VIEW vw_alertas_panel AS
SELECT
  a.id,
  a.codigo,
  a.jornada_id,
  a.tipo,
  a.estado,
  a.severidad,
  a.detalle,
  a.tipo_falla_mecanica,
  a.latitud,
  a.longitud,
  a.direccion,
  a.fecha_hora,
  a.atendida,
  a.atendida_at,
  j.unidad_id,
  un.placa,
  CONCAT(u.nombres, ' ', u.apellidos) AS conductor
FROM alertas_jornada a
JOIN jornadas j ON j.id = a.jornada_id
JOIN unidades un ON un.id = j.unidad_id
JOIN usuarios u ON u.id = j.conductor_id
ORDER BY a.fecha_hora DESC;

CREATE OR REPLACE VIEW vw_dashboard_resumen AS
SELECT
  (SELECT COUNT(*) FROM unidades WHERE activo = TRUE) AS total_camiones,
  (SELECT COUNT(*) FROM unidades WHERE estado = 'EN_JORNADA') AS camiones_en_uso,
  (SELECT COUNT(*) FROM unidades WHERE estado = 'DISPONIBLE') AS camiones_disponibles,
  (SELECT COUNT(*) FROM unidades WHERE estado = 'MANTENIMIENTO') AS camiones_mantenimiento,
  (SELECT COUNT(*) FROM usuarios WHERE rol = 'CHOFER' AND activo = TRUE) AS total_conductores,
  (SELECT COUNT(*) FROM conductores WHERE estado_operacional = 'EN_RUTA') AS conductores_en_ruta,
  (SELECT COUNT(*) FROM contratos WHERE estado = 'VIGENTE' AND activo = TRUE) AS contratos_activos,
  (SELECT COUNT(*) FROM jornadas WHERE estado IN ('REGISTRADA','PENDIENTE','EN_PROCESO')) AS jornadas_activas,
  (SELECT COUNT(*) FROM alertas_jornada WHERE estado IN ('ACTIVA','EN_PROCESO')) AS alertas_activas,
  (SELECT COALESCE(SUM(km_recorridos), 0) FROM jornadas WHERE estado = 'COMPLETADA') AS km_totales_operados;


-- migrate:down

DROP VIEW IF EXISTS vw_dashboard_resumen CASCADE;
DROP VIEW IF EXISTS vw_alertas_panel CASCADE;
DROP VIEW IF EXISTS vw_tracking_gps CASCADE;
DROP VIEW IF EXISTS vw_seguimiento_jornadas CASCADE;
DROP VIEW IF EXISTS vw_historial_jornadas_chofer CASCADE;
DROP VIEW IF EXISTS vw_camiones_operativos CASCADE;
DROP VIEW IF EXISTS vw_conductores_full CASCADE;

DROP FUNCTION IF EXISTS fn_sync_camion_after_delete() CASCADE;
DROP FUNCTION IF EXISTS fn_sync_camion_after_update() CASCADE;
DROP FUNCTION IF EXISTS fn_sync_camion_before_insert() CASCADE;
DROP FUNCTION IF EXISTS fn_sync_unidad_to_camion() CASCADE;
DROP FUNCTION IF EXISTS fn_map_unidad_estado_to_camion(estado_unidad) CASCADE;
DROP FUNCTION IF EXISTS fn_map_camion_estado_to_unidad(TEXT) CASCADE;
DROP FUNCTION IF EXISTS fn_set_updated_at() CASCADE;

DROP TABLE IF EXISTS combustible_registros CASCADE;
DROP TABLE IF EXISTS gps_eventos CASCADE;
DROP TABLE IF EXISTS gps_registros CASCADE;
DROP TABLE IF EXISTS gps_importacion_errores CASCADE;
DROP TABLE IF EXISTS gps_proveedor_formatos CASCADE;
DROP TABLE IF EXISTS gps_importaciones CASCADE;
DROP TABLE IF EXISTS ubicaciones_jornada CASCADE;
DROP TABLE IF EXISTS alertas_historial CASCADE;
DROP TABLE IF EXISTS alertas_jornada CASCADE;
DROP TABLE IF EXISTS jornadas CASCADE;
DROP TABLE IF EXISTS contratos_historial CASCADE;
DROP TABLE IF EXISTS contrato_unidades CASCADE;
DROP TABLE IF EXISTS contrato_tarifas CASCADE;
DROP TABLE IF EXISTS contrato_rutas CASCADE;
DROP TABLE IF EXISTS contratos CASCADE;
DROP TABLE IF EXISTS asignaciones_conductor_unidad CASCADE;
DROP TABLE IF EXISTS camion_mantenimientos CASCADE;
DROP TABLE IF EXISTS camiones CASCADE;
DROP TABLE IF EXISTS unidades CASCADE;
DROP TABLE IF EXISTS gps_dispositivos CASCADE;
DROP TABLE IF EXISTS conductores_historial CASCADE;
DROP TABLE IF EXISTS licencias_conducir CASCADE;
DROP TABLE IF EXISTS contactos_emergencia CASCADE;
DROP TABLE IF EXISTS conductores CASCADE;
-- auditoria_accesos la elimina la migracion HU-13 (su propio migrate:down)
DROP TABLE IF EXISTS sesiones_usuario CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS login_intentos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

DROP TYPE IF EXISTS estado_combustible CASCADE;
DROP TYPE IF EXISTS tipo_comprobante_combustible CASCADE;
DROP TYPE IF EXISTS estado_sesion CASCADE;
DROP TYPE IF EXISTS resultado_auditoria CASCADE;
DROP TYPE IF EXISTS estado_importacion CASCADE;
DROP TYPE IF EXISTS estado_asignacion CASCADE;
DROP TYPE IF EXISTS tipo_mantenimiento CASCADE;
DROP TYPE IF EXISTS tipo_evento_gps CASCADE;
DROP TYPE IF EXISTS estado_tracking CASCADE;
DROP TYPE IF EXISTS proveedor_gps CASCADE;
DROP TYPE IF EXISTS tipo_registro_ubicacion CASCADE;
DROP TYPE IF EXISTS severidad_alerta CASCADE;
DROP TYPE IF EXISTS estado_alerta_operativa CASCADE;
DROP TYPE IF EXISTS tipo_alerta CASCADE;
DROP TYPE IF EXISTS estado_jornada CASCADE;
DROP TYPE IF EXISTS tipo_servicio_contrato CASCADE;
DROP TYPE IF EXISTS estado_contrato CASCADE;
DROP TYPE IF EXISTS tipo_combustible CASCADE;
DROP TYPE IF EXISTS estado_unidad CASCADE;
DROP TYPE IF EXISTS categoria_licencia CASCADE;
DROP TYPE IF EXISTS estado_operacional_conductor CASCADE;
DROP TYPE IF EXISTS estado_usuario CASCADE;
DROP TYPE IF EXISTS rol_usuario CASCADE;
