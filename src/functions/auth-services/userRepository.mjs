import db from "../../shared/config/database.mjs";

const mapUserProfile = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    cognitoSub: row.cognito_sub || null,
    email: row.correo,
    nombres: row.nombres || null,
    apellidos: row.apellidos || null,
    rol: row.rol || null,
    estado: row.estado || null,
    ultimoAcceso: row.ultimo_acceso || null,
  };
};

export const findByCognitoSub = async (sub) => {
  const result = await db.query(
    `SELECT id, cognito_sub, correo, nombres, apellidos, rol, estado, ultimo_acceso
     FROM usuarios
     WHERE cognito_sub = $1
     LIMIT 1`,
    [sub],
  );

  return mapUserProfile(result.rows[0]);
};

export const findByEmail = async (email) => {
  const result = await db.query(
    `SELECT id, cognito_sub, correo, nombres, apellidos, rol, estado, ultimo_acceso
     FROM usuarios
     WHERE correo = $1
     LIMIT 1`,
    [email],
  );

  return mapUserProfile(result.rows[0]);
};

export const linkCognitoSub = async (userId, sub) => {
  const result = await db.query(
    `UPDATE usuarios
     SET cognito_sub = $1
     WHERE id = $2
     RETURNING id, cognito_sub, correo, nombres, apellidos, rol, estado, ultimo_acceso`,
    [sub, userId],
  );

  return mapUserProfile(result.rows[0]);
};

export const updateLastAccess = async (userId) => {
  const result = await db.query(
    `UPDATE usuarios
     SET ultimo_acceso = NOW()
     WHERE id = $1
     RETURNING id, cognito_sub, correo, nombres, apellidos, rol, estado, ultimo_acceso`,
    [userId],
  );

  return mapUserProfile(result.rows[0]);
};
