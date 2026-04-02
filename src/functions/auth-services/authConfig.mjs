// Configuración base del módulo auth.
// Hoy el backend soporta:
// - local: fallback provisional para desarrollo y pruebas
// - cognito: flujo real solo si DevSecOps configura AUTH_PROVIDER=cognito,
//   COGNITO_USER_POOL_ID y COGNITO_CLIENT_ID.
// Para nube real también debe existir región AWS válida y un User Pool/App Client activos.
const DEFAULT_AUTH_PROVIDER = "local";
const DEFAULT_SESSION_TIMEOUT_SECONDS = 60 * 60 * 2;
const DEFAULT_TOKEN_SECRET = "nanutech-local-auth-secret";

export const getRequestedAuthProvider = () =>
  (process.env.AUTH_PROVIDER || DEFAULT_AUTH_PROVIDER).toLowerCase();

export const isCognitoConfigured = () =>
  Boolean(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID);

export const getAuthProvider = () => {
  const requestedProvider = getRequestedAuthProvider();
  if (requestedProvider === "cognito" && isCognitoConfigured()) {
    return "cognito";
  }
  return "local";
};

export const getSessionTimeoutSeconds = () => {
  const value = parseInt(
    process.env.SESSION_TIMEOUT_SECONDS || `${DEFAULT_SESSION_TIMEOUT_SECONDS}`,
    10,
  );

  if (Number.isNaN(value) || value <= 0) {
    return DEFAULT_SESSION_TIMEOUT_SECONDS;
  }

  return value;
};

export const getTokenSecret = () =>
  process.env.AUTH_TOKEN_SECRET || DEFAULT_TOKEN_SECRET;
