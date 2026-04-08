-- ============================================
-- NANUTECH - SCHEMA PARA TESTS (pg-mem)
-- SIN triggers, SIN funciones, SIN vistas
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- TIPOS ENUM
-- ============================================

CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'CHOFER');
CREATE TYPE estado_usuario AS ENUM ('ACTIVO', 'INACTIVO', 'BLOQUEADO');
CREATE TYPE estado_unidad AS ENUM ('DISPONIBLE', 'EN_JORNADA', 'EN_AUXILIO', 'INACTIVA');
CREATE TYPE estado_contrato AS ENUM ('VIGENTE', 'VENCIDO', 'SUSPENDIDO');
CREATE TYPE estado_jornada AS ENUM ('REGISTRADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA');
CREATE TYPE tipo_alerta AS ENUM ('PANICO', 'AUXILIO_MECANICO');
CREATE TYPE tipo_registro_ubicacion AS ENUM ('INICIO', 'FIN', 'ALERTA', 'TRACKING');

-- ============================================
-- TABLA USUARIOS
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

-- ============================================
-- TABLA UNIDADES
-- ============================================

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
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLA CONTRATOS
-- ============================================

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
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLA JORNADAS
-- ============================================

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

    CONSTRAINT fk_jornadas_conductor
        FOREIGN KEY (conductor_id) REFERENCES usuarios(id),
    CONSTRAINT fk_jornadas_unidad
        FOREIGN KEY (unidad_id) REFERENCES unidades(id),
    CONSTRAINT fk_jornadas_contrato
        FOREIGN KEY (contrato_id) REFERENCES contratos(id),
    CONSTRAINT fk_jornadas_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

-- ============================================
-- TABLA ALERTAS_JORNADA
-- ============================================

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

    CONSTRAINT fk_alertas_jornada
        FOREIGN KEY (jornada_id) REFERENCES jornadas(id) ON DELETE CASCADE
);

-- ============================================
-- TABLA UBICACIONES_JORNADA
-- ============================================

CREATE TABLE ubicaciones_jornada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jornada_id UUID NOT NULL,
    latitud NUMERIC(10,7) NOT NULL,
    longitud NUMERIC(10,7) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    tipo_registro tipo_registro_ubicacion NOT NULL,
    velocidad_kmh NUMERIC(8,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ubicaciones_jornada
        FOREIGN KEY (jornada_id) REFERENCES jornadas(id) ON DELETE CASCADE
);


-- Cambiar el nombre de la tabla
CREATE TABLE camiones (
    id INTEGER PRIMARY KEY ,
    placa VARCHAR(20) NOT NULL UNIQUE,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    anio INTEGER,
    capacidad_ton NUMERIC(10,2),
    estado estado_unidad NOT NULL DEFAULT 'DISPONIBLE',
    gps_habilitado BOOLEAN NOT NULL DEFAULT TRUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- También actualizar las referencias en otras tablas
-- En jornadas, cambiar unidad_id a camion_id si es necesario