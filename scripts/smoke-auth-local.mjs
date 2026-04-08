import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
  GetUserCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { mockClient } from "aws-sdk-client-mock";
import { closePool } from "../src/shared/config/database.mjs";

const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const mode = modeArg ? modeArg.split("=")[1] : "local";

const showHelp = () => {
  console.log(`
Uso:
  node scripts/smoke-auth-local.mjs --mode=local
  node scripts/smoke-auth-local.mjs --mode=cognito

Modo local:
  No requiere PostgreSQL.

Modo cognito:
  Requiere PostgreSQL local ya inicializado con scripts/db-init-local.mjs
  y variables DB_* configuradas.
  Cognito se simula localmente para probar el flujo backend.
`);
};

const createJwtLikeToken = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
    .toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
};

const authEvent = (httpMethod, resource, body = null, headers = {}) => ({
  httpMethod,
  resource,
  body: body ? JSON.stringify(body) : null,
  headers,
});

const printResponse = (label, response) => {
  const body = JSON.parse(response.body);
  console.log(`\n[${label}] status=${response.statusCode}`);
  console.log(JSON.stringify(body, null, 2));
  return body;
};

const runLocalSmoke = async () => {
  process.env.AUTH_PROVIDER = "local";
  process.env.SESSION_TIMEOUT_SECONDS ||= "7200";

  const { handler } = await import("../src/functions/auth-services/authHandler.mjs");

  const loginResponse = await handler(
    authEvent("POST", "/auth/login", {
      email: "test@test.com",
      password: "123456",
    }),
  );
  const loginBody = printResponse("login-local", loginResponse);

  const meResponse = await handler(
    authEvent("GET", "/auth/me", null, {
      Authorization: `Bearer ${loginBody.data.session.accessToken}`,
    }),
  );
  printResponse("me-local", meResponse);

  const forgotResponse = await handler(
    authEvent("POST", "/auth/forgot-password", {
      email: "test@test.com",
    }),
  );
  printResponse("forgot-local", forgotResponse);

  const confirmResponse = await handler(
    authEvent("POST", "/auth/forgot-password/confirm", {
      email: "test@test.com",
      code: "123456",
      newPassword: "NuevaClave123",
    }),
  );
  printResponse("confirm-local", confirmResponse);

  const reloginResponse = await handler(
    authEvent("POST", "/auth/login", {
      email: "test@test.com",
      password: "NuevaClave123",
    }),
  );
  printResponse("relogin-local", reloginResponse);
};

const runCognitoSmoke = async () => {
  process.env.AUTH_PROVIDER = "cognito";
  process.env.COGNITO_USER_POOL_ID ||= "YOUR_USER_POOL_ID";
  process.env.COGNITO_CLIENT_ID ||= "YOUR_CLIENT_ID";
  process.env.AWS_REGION ||= "YOUR_AWS_REGION";
  process.env.SESSION_TIMEOUT_SECONDS ||= "7200";

  const cognitoMock = mockClient(CognitoIdentityProviderClient);
  cognitoMock.reset();

  const idToken = createJwtLikeToken({
    sub: "real-sub-001",
    email: "admin@nanutech.com",
    "custom:role": "ADMIN",
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const accessToken = createJwtLikeToken({
    sub: "real-sub-001",
    username: "admin@nanutech.com",
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  cognitoMock.on(InitiateAuthCommand).resolves({
    AuthenticationResult: {
      AccessToken: accessToken,
      IdToken: idToken,
      ExpiresIn: 3600,
    },
  });
  cognitoMock.on(GetUserCommand).resolves({
    UserAttributes: [
      { Name: "email", Value: "admin@nanutech.com" },
      { Name: "custom:role", Value: "ADMIN" },
    ],
  });
  cognitoMock.on(ForgotPasswordCommand).resolves({
    CodeDeliveryDetails: {
      Destination: "a***@nanutech.com",
      DeliveryMedium: "EMAIL",
      AttributeName: "email",
    },
  });
  cognitoMock.on(ConfirmForgotPasswordCommand).resolves({});

  const { handler } = await import("../src/functions/auth-services/authHandler.mjs");

  const loginResponse = await handler(
    authEvent("POST", "/auth/login", {
      email: "admin@nanutech.com",
      password: "123456",
    }),
  );
  const loginBody = printResponse("login-cognito", loginResponse);

  const meResponse = await handler(
    authEvent("GET", "/auth/me", null, {
      Authorization: `Bearer ${loginBody.data.session.accessToken}`,
    }),
  );
  printResponse("me-cognito", meResponse);

  const forgotResponse = await handler(
    authEvent("POST", "/auth/forgot-password", {
      email: "admin@nanutech.com",
    }),
  );
  printResponse("forgot-cognito", forgotResponse);

  const confirmResponse = await handler(
    authEvent("POST", "/auth/forgot-password/confirm", {
      email: "admin@nanutech.com",
      code: "123456",
      newPassword: "NuevaClave123",
    }),
  );
  printResponse("confirm-cognito", confirmResponse);
};

const run = async () => {
  if (process.argv.includes("--help")) {
    showHelp();
    return;
  }

  try {
    console.log(`==> Ejecutando smoke auth en modo ${mode}`);

    if (mode === "local") {
      await runLocalSmoke();
      return;
    }

    if (mode === "cognito") {
      await runCognitoSmoke();
      return;
    }

    throw new Error(`Modo no soportado: ${mode}`);
  } catch (error) {
    console.error("==> Smoke test falló:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
};

await run();
