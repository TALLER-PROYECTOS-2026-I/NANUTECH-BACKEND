-- ============================================
-- MIGRACIÓN INICIAL - NANUTECH BACKEND
-- ============================================

-- migrate:up

-- ============================================
-- 1. EXTENSIONES
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 2. TIPOS ENUM
-- ============================================

DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'CHOFER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_usuario AS ENUM ('ACTIVO', 'INACTIVO', 'BLOQUEADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_unidad AS ENUM ('DISPONIBLE', 'EN_JORNADA', 'EN_AUXILIO', 'INACTIVA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_contrato AS ENUM ('VIGENTE', 'VENCIDO', 'SUSPENDIDO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_jornada AS ENUM ('REGISTRADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_alerta AS ENUM ('PANICO', 'AUXILIO_MECANICO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_registro_ubicacion AS ENUM ('INICIO', 'FIN', 'ALERTA', 'TRACKING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 3. TABLAS
-- ============================================

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
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_unidades_anio CHECK (anio IS NULL OR anio BETWEEN 1990 AND 2100),
    CONSTRAINT chk_unidades_capacidad CHECK (capacidad_ton IS NULL OR capacidad_ton >= 0)
);

CREATE TABLE contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(30) NOT NULL UNIQUE,
    cliente VARCHAR(120) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    tarifa NUMERIC(12,2),
    moneda VARCHAR(10) DEFAULT 'PEN',
    estado estado_contrato NOT NULL DEFAULT 'VIGENTE',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_contratos_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
    CONSTRAINT chk_contratos_tarifa CHECK (tarifa IS NULL OR tarifa >= 0)
);

CREATE TABLE jornadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conductor_id UUID NOT NULL,
    unidad_id UUID NOT NULL,
    contrato_id UUID NOT NULL,
    creado_por UUID NOT NULL,
    fecha_jornada DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_inicio TIMESTAMP NULL,
    hora_fin TIMESTAMP NULL,
    origen VARCHAR(150),
    destino VARCHAR(150),
    km_recorridos NUMERIC(10,2) NOT NULL DEFAULT 0,
    observaciones TEXT,
    estado estado_jornada NOT NULL DEFAULT 'REGISTRADA',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_jornadas_conductor FOREIGN KEY (conductor_id) REFERENCES usuarios(id),
    CONSTRAINT fk_jornadas_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id),
    CONSTRAINT fk_jornadas_contrato FOREIGN KEY (contrato_id) REFERENCES contratos(id),
    CONSTRAINT fk_jornadas_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id),
    CONSTRAINT chk_jornadas_horas CHECK (hora_fin IS NULL OR hora_inicio IS NULL OR hora_fin >= hora_inicio),
    CONSTRAINT chk_jornadas_km CHECK (km_recorridos >= 0)
);

CREATE TABLE alertas_jornada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jornada_id UUID NOT NULL,
    tipo tipo_alerta NOT NULL,
    detalle TEXT,
    latitud NUMERIC(10,7) NOT NULL,
    longitud NUMERIC(10,7) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    atendida BOOLEAN NOT NULL DEFAULT FALSE,
    atendida_por UUID NULL,
    atendida_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_alertas_jornada FOREIGN KEY (jornada_id) REFERENCES jornadas(id) ON DELETE CASCADE,
    CONSTRAINT fk_alertas_atendida_por FOREIGN KEY (atendida_por) REFERENCES usuarios(id),
    CONSTRAINT chk_alertas_latitud CHECK (latitud BETWEEN -90 AND 90),
    CONSTRAINT chk_alertas_longitud CHECK (longitud BETWEEN -180 AND 180),
    CONSTRAINT chk_alertas_atencion CHECK (
        (atendida = FALSE) OR (atendida = TRUE AND atendida_at IS NOT NULL)
    )
);

CREATE TABLE ubicaciones_jornada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jornada_id UUID NOT NULL,
    latitud NUMERIC(10,7) NOT NULL,
    longitud NUMERIC(10,7) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    tipo_registro tipo_registro_ubicacion NOT NULL,
    velocidad_kmh NUMERIC(8,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ubicaciones_jornada FOREIGN KEY (jornada_id) REFERENCES jornadas(id) ON DELETE CASCADE,
    CONSTRAINT chk_ubicaciones_latitud CHECK (latitud BETWEEN -90 AND 90),
    CONSTRAINT chk_ubicaciones_longitud CHECK (longitud BETWEEN -180 AND 180),
    CONSTRAINT chk_ubicaciones_velocidad CHECK (velocidad_kmh IS NULL OR velocidad_kmh >= 0)
);

-- ============================================
-- 4. ÍNDICES
-- ============================================

CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_estado ON usuarios(estado);
CREATE INDEX idx_unidades_estado ON unidades(estado);
CREATE INDEX idx_contratos_estado ON contratos(estado);
CREATE INDEX idx_jornadas_fecha ON jornadas(fecha_jornada);
CREATE INDEX idx_jornadas_estado ON jornadas(estado);
CREATE INDEX idx_jornadas_conductor ON jornadas(conductor_id);
CREATE INDEX idx_jornadas_unidad ON jornadas(unidad_id);
CREATE INDEX idx_jornadas_contrato ON jornadas(contrato_id);
CREATE INDEX idx_alertas_jornada ON alertas_jornada(jornada_id);
CREATE INDEX idx_alertas_tipo ON alertas_jornada(tipo);
CREATE INDEX idx_alertas_fecha_hora ON alertas_jornada(fecha_hora);
CREATE INDEX idx_ubicaciones_jornada ON ubicaciones_jornada(jornada_id);
CREATE INDEX idx_ubicaciones_fecha_hora ON ubicaciones_jornada(fecha_hora);

CREATE UNIQUE INDEX uq_jornada_activa_unidad ON jornadas (unidad_id)
    WHERE estado IN ('REGISTRADA', 'EN_PROCESO');

CREATE UNIQUE INDEX uq_jornada_activa_chofer ON jornadas (conductor_id)
    WHERE estado IN ('REGISTRADA', 'EN_PROCESO');

-- ============================================
-- 5. FUNCIONES Y TRIGGERS
-- ============================================

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

CREATE TRIGGER tg_unidades_updated_at
    BEFORE UPDATE ON unidades
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tg_contratos_updated_at
    BEFORE UPDATE ON contratos
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tg_jornadas_updated_at
    BEFORE UPDATE ON jornadas
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================
-- 6. VISTAS
-- ============================================

CREATE OR REPLACE VIEW vw_seguimiento_jornadas AS
SELECT
    j.id,
    j.fecha_jornada,
    CONCAT(u.nombres, ' ', u.apellidos) AS nombre_chofer,
    un.placa AS placa_camion,
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
INNER JOIN usuarios u ON u.id = j.conductor_id
INNER JOIN unidades un ON un.id = j.unidad_id
INNER JOIN contratos c ON c.id = j.contrato_id
ORDER BY j.fecha_jornada DESC, j.created_at DESC;

-- ============================================
-- migrate:down
-- ============================================

DROP VIEW IF EXISTS vw_seguimiento_jornadas CASCADE;

DROP TRIGGER IF EXISTS tg_jornadas_updated_at ON jornadas CASCADE;
DROP TRIGGER IF EXISTS tg_contratos_updated_at ON contratos CASCADE;
DROP TRIGGER IF EXISTS tg_unidades_updated_at ON unidades CASCADE;
DROP TRIGGER IF EXISTS tg_usuarios_updated_at ON usuarios CASCADE;
DROP FUNCTION IF EXISTS fn_set_updated_at CASCADE;

DROP INDEX IF EXISTS uq_jornada_activa_chofer CASCADE;
DROP INDEX IF EXISTS uq_jornada_activa_unidad CASCADE;
DROP INDEX IF EXISTS idx_ubicaciones_fecha_hora CASCADE;
DROP INDEX IF EXISTS idx_ubicaciones_jornada CASCADE;
DROP INDEX IF EXISTS idx_alertas_fecha_hora CASCADE;
DROP INDEX IF EXISTS idx_alertas_tipo CASCADE;
DROP INDEX IF EXISTS idx_alertas_jornada CASCADE;
DROP INDEX IF EXISTS idx_jornadas_contrato CASCADE;
DROP INDEX IF EXISTS idx_jornadas_unidad CASCADE;
DROP INDEX IF EXISTS idx_jornadas_conductor CASCADE;
DROP INDEX IF EXISTS idx_jornadas_estado CASCADE;
DROP INDEX IF EXISTS idx_jornadas_fecha CASCADE;
DROP INDEX IF EXISTS idx_contratos_estado CASCADE;
DROP INDEX IF EXISTS idx_unidades_estado CASCADE;
DROP INDEX IF EXISTS idx_usuarios_estado CASCADE;
DROP INDEX IF EXISTS idx_usuarios_rol CASCADE;

DROP TABLE IF EXISTS ubicaciones_jornada CASCADE;
DROP TABLE IF EXISTS alertas_jornada CASCADE;
DROP TABLE IF EXISTS jornadas CASCADE;
DROP TABLE IF EXISTS contratos CASCADE;
DROP TABLE IF EXISTS unidades CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

DROP TYPE IF EXISTS tipo_registro_ubicacion CASCADE;
DROP TYPE IF EXISTS tipo_alerta CASCADE;
DROP TYPE IF EXISTS estado_jornada CASCADE;
DROP TYPE IF EXISTS estado_contrato CASCADE;
DROP TYPE IF EXISTS estado_unidad CASCADE;
DROP TYPE IF EXISTS estado_usuario CASCADE;
DROP TYPE IF EXISTS rol_usuario CASCADE;
