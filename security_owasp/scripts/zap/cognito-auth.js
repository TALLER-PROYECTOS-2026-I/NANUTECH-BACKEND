/**
 * cognito-auth.js
 *
 * Obtiene un token de acceso desde AWS Cognito (o desde el endpoint
 * /auth/login si AUTH_PROVIDER=local) y lo escribe en:
 *   - Stdout (para que ZAP lo lea como script de autenticación)
 *   - ./security_owasp/scripts/zap/.zap-token  (para que el workflow lo exporte)
 *
 * Uso en el pipeline:
 *   node security_owasp/scripts/zap/cognito-auth.js
 *
 * Variables de entorno requeridas:
 *   AUTH_PROVIDER          cognito | local
 *
 *   Si AUTH_PROVIDER=cognito:
 *     COGNITO_USER_POOL_ID
 *     COGNITO_CLIENT_ID
 *     TEST_USERNAME
 *     TEST_PASSWORD
 *     AWS_REGION             (default: us-east-1)
 *
 *   Si AUTH_PROVIDER=local:
 *     API_URL_TESTING        URL base del API
 *     TEST_USERNAME          email del usuario de prueba
 *     TEST_PASSWORD          password del usuario de prueba
 */

import fs from "node:fs";
import path from "node:path";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOKEN_FILE = path.resolve("security_owasp/scripts/zap/.zap-token");

function writeToken(token) {
  fs.writeFileSync(TOKEN_FILE, token, "utf-8");
  console.log(`[cognito-auth] Token escrito en ${TOKEN_FILE}`);
  // ZAP lee el token desde stdout si este script se usa como authentication script
  process.stdout.write(token);
}

function fail(message) {
  console.error(`[cognito-auth] ERROR: ${message}`);
  process.exit(1);
}

// ─── Estrategia Cognito ───────────────────────────────────────────────────────

async function getTokenFromCognito() {
  const {
    COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID,
    TEST_USERNAME,
    TEST_PASSWORD,
    AWS_REGION = "us-east-1",
  } = process.env;

  if (!COGNITO_USER_POOL_ID) fail("COGNITO_USER_POOL_ID no definida");
  if (!COGNITO_CLIENT_ID)    fail("COGNITO_CLIENT_ID no definida");
  if (!TEST_USERNAME)        fail("TEST_USERNAME no definida");
  if (!TEST_PASSWORD)        fail("TEST_PASSWORD no definida");

  // Usamos el SDK de Cognito vía fetch directo (no requiere instalar aws-sdk)
  // InitiateAuth con USER_PASSWORD_AUTH
  const endpoint = `https://cognito-idp.${AWS_REGION}.amazonaws.com/`;

  const body = JSON.stringify({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: TEST_USERNAME,
      PASSWORD: TEST_PASSWORD,
    },
  });

  console.error("[cognito-auth] Iniciando auth contra Cognito...");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    fail(`Cognito respondió ${response.status}: ${error}`);
  }

  const data = await response.json();
  const token = data?.AuthenticationResult?.AccessToken;

  if (!token) fail("No se encontró AccessToken en la respuesta de Cognito");

  console.error(`[cognito-auth] Token obtenido (${token.length} chars)`);
  return token;
}

// ─── Estrategia local (/auth/login) ──────────────────────────────────────────

async function getTokenFromLocalEndpoint() {
  const {
    API_URL_TESTING,
    TEST_USERNAME,
    TEST_PASSWORD,
  } = process.env;

  if (!API_URL_TESTING) fail("API_URL_TESTING no definida");
  if (!TEST_USERNAME)   fail("TEST_USERNAME no definida");
  if (!TEST_PASSWORD)   fail("TEST_PASSWORD no definida");

  const url = `${API_URL_TESTING.replace(/\/$/, "")}/auth/login`;

  console.error(`[cognito-auth] Iniciando auth contra ${url}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_USERNAME,
      password: TEST_PASSWORD,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    fail(`/auth/login respondió ${response.status}: ${error}`);
  }

  const data = await response.json();
  // Soporta { data: { session: { accessToken } } } y { data: { token } }
  const token =
    data?.data?.session?.accessToken ||
    data?.data?.accessToken ||
    data?.data?.token;

  if (!token) fail(`No se encontró token en la respuesta: ${JSON.stringify(data)}`);

  console.error(`[cognito-auth] Token obtenido (${token.length} chars)`);
  return token;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const AUTH_PROVIDER = process.env.AUTH_PROVIDER || "local";

console.error(`[cognito-auth] AUTH_PROVIDER=${AUTH_PROVIDER}`);

try {
  const token =
    AUTH_PROVIDER === "cognito"
      ? await getTokenFromCognito()
      : await getTokenFromLocalEndpoint();

  writeToken(token);
} catch (err) {
  fail(err.message);
}
