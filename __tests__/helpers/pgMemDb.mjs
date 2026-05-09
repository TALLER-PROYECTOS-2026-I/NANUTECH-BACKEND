import { newDb } from "pg-mem";
import {
  setPoolForTests,
  resetPoolForTests,
} from "../../src/shared/config/database.mjs";

const pgMemSchemaSQL = `
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,
  cognito_sub VARCHAR(100),
  correo VARCHAR(120) NOT NULL UNIQUE,
  nombres VARCHAR(80) NOT NULL,
  apellidos VARCHAR(80) NOT NULL,
  rol VARCHAR(20) NOT NULL,
  telefono VARCHAR(20),
  dni VARCHAR(15),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  ultimo_acceso TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE unidades (
  id UUID PRIMARY KEY,
  placa VARCHAR(20) NOT NULL UNIQUE,
  marca VARCHAR(50),
  modelo VARCHAR(50),
  anio INTEGER,
  capacidad_ton NUMERIC(10,2),
  estado VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE',
  gps_habilitado BOOLEAN NOT NULL DEFAULT TRUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE contratos (
  id UUID PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  cliente VARCHAR(120) NOT NULL,
  descripcion TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  tarifa NUMERIC(12,2),
  moneda VARCHAR(10) DEFAULT 'PEN',
  estado VARCHAR(20) NOT NULL DEFAULT 'VIGENTE',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE jornadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_id UUID NOT NULL REFERENCES usuarios(id),
  unidad_id UUID NOT NULL REFERENCES unidades(id),
  contrato_id UUID NOT NULL REFERENCES contratos(id),
  creado_por UUID NOT NULL REFERENCES usuarios(id),
  fecha_jornada DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_inicio TIMESTAMP,
  hora_fin TIMESTAMP,
  origen VARCHAR(150),
  destino VARCHAR(150),
  km_recorridos NUMERIC(10,2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADA',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE camiones (
  id INTEGER PRIMARY KEY,
  placa VARCHAR(20) NOT NULL UNIQUE,
  marca VARCHAR(50),
  modelo VARCHAR(50),
  estado VARCHAR(30) NOT NULL DEFAULT 'disponible',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

const pgMemSeedSQL = `
INSERT INTO usuarios (id, cognito_sub, correo, nombres, apellidos, rol, telefono, dni)
VALUES
('11111111-1111-1111-1111-111111111111', '74f8c4f8-a041-70ca-4e30-e78b87d1cfdb', 'admin@nanutech.com', 'Jimena', 'Rodriguez', 'ADMIN', '999111222', '70000001'),
('22222222-2222-2222-2222-222222222222', 'c4f84478-a051-707b-d0ee-ad4d95480a7c', 'chofer@nanutech.com', 'Carlos', 'Mendoza', 'CHOFER', '999222333', '70000002'),
('33333333-3333-3333-3333-333333333333', 'cognito-sub-chofer-002', 'chofer2@nanutech.com', 'Luis', 'Ramirez', 'CHOFER', '999333444', '70000003'),
('55555555-5555-5555-5555-555555555555', '744844e8-d051-70fb-a746-c22ccc07352a', 'gerente@nanutech.com', 'Laura', 'Vasquez', 'GERENTE', '999777888', '70000005');

INSERT INTO unidades (id, placa, marca, modelo, anio, capacidad_ton, estado)
VALUES
('aaaa0001-0000-0000-0000-000000000001', 'ABC-123', 'Volvo', 'FH16', 2020, 20.00, 'DISPONIBLE'),
('aaaa0002-0000-0000-0000-000000000002', 'DEF-456', 'Scania', 'R450', 2021, 18.00, 'EN_JORNADA');

INSERT INTO contratos (id, codigo, cliente, descripcion, fecha_inicio, fecha_fin, tarifa, moneda, estado)
VALUES
('bbbb0001-0000-0000-0000-000000000001', 'CONT-2026-001', 'Minera del Sur', 'Transporte de carga minera', '2026-01-01', '2026-12-31', 15000.00, 'PEN', 'VIGENTE');

INSERT INTO jornadas (id, conductor_id, unidad_id, contrato_id, creado_por, fecha_jornada, hora_inicio, origen, destino, km_recorridos, estado)
VALUES
('cccc0002-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'aaaa0002-0000-0000-0000-000000000002', 'bbbb0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-04-26', '2026-04-26 08:00:00', 'Lima', 'Ica', 120.80, 'EN_PROCESO');

INSERT INTO camiones (id, placa, marca, modelo, estado)
VALUES
(1, 'ABC-123', 'Volvo', 'FH16', 'disponible'),
(2, 'DEF-456', 'Scania', 'R450', 'en_uso');
`;

export async function startPgMem({ seed = true } = {}) {
  const db = newDb({ autoCreateForeignKeyIndices: true });

  db.public.registerFunction({
    name: "gen_random_uuid",
    args: [],
    returns: "uuid",
    implementation: () =>
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
  });

  db.registerExtension("pgcrypto", () => {});
  db.public.none(pgMemSchemaSQL);

  if (seed) {
    db.public.none(pgMemSeedSQL);
  }

  const { Pool } = db.adapters.createPg();
  const pool = new Pool();

  await setPoolForTests(pool);

  return { db, pool };
}

export async function stopPgMem() {
  await resetPoolForTests();
}
