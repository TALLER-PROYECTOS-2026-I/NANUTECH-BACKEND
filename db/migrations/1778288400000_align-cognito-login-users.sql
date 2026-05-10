-- migrate:up

UPDATE usuarios
SET cognito_sub = NULL
WHERE cognito_sub IN (
  '74f8c4f8-a041-70ca-4e30-e78b87d1cfdb',
  'c4f84478-a051-707b-d0ee-ad4d95480a7c',
  '744844e8-d051-70fb-a746-c22ccc07352a'
)
AND id NOT IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '55555555-5555-5555-5555-555555555555'
);

INSERT INTO usuarios (id, cognito_sub, correo, nombres, apellidos, rol, telefono, dni, activo, estado)
VALUES
  ('11111111-1111-1111-1111-111111111111', '74f8c4f8-a041-70ca-4e30-e78b87d1cfdb', 'admin@nanutech.com', 'Jimena', 'Rodriguez', 'ADMIN', '999111222', '70000001', TRUE, 'ACTIVO'),
  ('22222222-2222-2222-2222-222222222222', 'c4f84478-a051-707b-d0ee-ad4d95480a7c', 'chofer@nanutech.com', 'Carlos', 'Mendoza', 'CHOFER', '999222333', '70000002', TRUE, 'ACTIVO'),
  ('55555555-5555-5555-5555-555555555555', '744844e8-d051-70fb-a746-c22ccc07352a', 'gerente@nanutech.com', 'Laura', 'Vasquez', 'GERENTE', '999777888', '70000005', TRUE, 'ACTIVO')
ON CONFLICT (id) DO UPDATE SET
  cognito_sub = EXCLUDED.cognito_sub,
  correo = EXCLUDED.correo,
  nombres = EXCLUDED.nombres,
  apellidos = EXCLUDED.apellidos,
  rol = EXCLUDED.rol,
  telefono = EXCLUDED.telefono,
  dni = EXCLUDED.dni,
  activo = EXCLUDED.activo,
  estado = EXCLUDED.estado;

UPDATE auditoria_accesos
SET correo = 'gerente@nanutech.com'
WHERE usuario_id = '55555555-5555-5555-5555-555555555555'
  AND correo = 'gerencia@nanutech.com';

UPDATE password_reset_tokens
SET correo = 'chofer@nanutech.com'
WHERE usuario_id = '22222222-2222-2222-2222-222222222222'
  AND correo = 'chofer1@nanutech.com';

-- migrate:down

UPDATE usuarios
SET cognito_sub = '7438d4b8-0021-7065-dda7-7bbdfa75c929',
    correo = 'admin@nanutech.com'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE usuarios
SET cognito_sub = 'c4f84478-a051-707b-d0ee-ad4d95480a7c',
    correo = 'chofer1@nanutech.com'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE usuarios
SET cognito_sub = NULL,
    correo = 'gerencia@nanutech.com'
WHERE id = '55555555-5555-5555-5555-555555555555';

UPDATE auditoria_accesos
SET correo = 'gerencia@nanutech.com'
WHERE usuario_id = '55555555-5555-5555-5555-555555555555'
  AND correo = 'gerente@nanutech.com';

UPDATE password_reset_tokens
SET correo = 'chofer1@nanutech.com'
WHERE usuario_id = '22222222-2222-2222-2222-222222222222'
  AND correo = 'chofer@nanutech.com';
