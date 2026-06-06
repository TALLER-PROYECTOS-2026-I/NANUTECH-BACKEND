-- migrate:up

CREATE SEQUENCE auditoria_code_seq START 1000;

CREATE TABLE auditoria_accesos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) DEFAULT '#AUDIT-' || nextval('auditoria_code_seq'),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  direccion_ip VARCHAR(45) NOT NULL,
  navegador VARCHAR(255) NOT NULL
);

CREATE INDEX idx_auditoria_usuario ON auditoria_accesos(usuario_id);
CREATE INDEX idx_auditoria_fecha ON auditoria_accesos(fecha_hora DESC);

-- migrate:down

DROP INDEX IF EXISTS idx_auditoria_fecha;
DROP INDEX IF EXISTS idx_auditoria_usuario;
DROP TABLE IF EXISTS auditoria_accesos;
DROP SEQUENCE IF EXISTS auditoria_code_seq;
