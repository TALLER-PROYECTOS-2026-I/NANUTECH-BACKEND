// Adaptador para Cognito real.
// Se activa solo cuando AUTH_PROVIDER=cognito y existen los IDs necesarios.
import {
  ConfirmForgotPasswordCommand,
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
  GetUserCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { decodeJwtPayload } from "./authToken.mjs";
import { getSessionTimeoutSeconds } from "./authConfig.mjs";

let cognitoClient;

const createAuthError = (message, statusCode = 500, code = "AUTH_ERROR") => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const getClient = () => {
  if (!cognitoClient) {
    cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
    });
  }
  return cognitoClient;
};

const normalizeRole = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const getRoleFromClaims = (claims = {}, attributes = []) => {
  const customRoleAttribute = attributes.find(
    (attribute) => attribute.Name === "custom:role",
  );
  const genericRoleAttribute = attributes.find(
    (attribute) => attribute.Name === "role",
  );

  const customRole =
    normalizeRole(claims["custom:role"]) ||
    normalizeRole(customRoleAttribute?.Value);
  if (customRole) return customRole;

  if (Array.isArray(claims["cognito:groups"]) && claims["cognito:groups"][0]) {
    return normalizeRole(claims["cognito:groups"][0]);
  }

  const fallbackRole =
    normalizeRole(claims.role) || normalizeRole(genericRoleAttribute?.Value);
  if (fallbackRole) return fallbackRole;

  return null;
};

const buildNextRoute = (role) => {
  if (role === "admin") return "/dashboard/admin";
  if (role === "chofer") return "/dashboard/chofer";
  return "/dashboard";
};

const buildSession = (accessToken, idToken, expiresIn) => {
  let expiresAt = null;
  try {
    const claims = decodeJwtPayload(accessToken || idToken);
    if (claims.exp) {
      expiresAt = new Date(claims.exp * 1000).toISOString();
    }
  } catch (error) {
    expiresAt = new Date(
      Date.now() + getSessionTimeoutSeconds() * 1000,
    ).toISOString();
  }

  return {
    provider: "cognito",
    accessToken,
    idToken,
    tokenType: "Bearer",
    expiresIn: expiresIn || getSessionTimeoutSeconds(),
    expiresAt,
    idleTimeoutSeconds: getSessionTimeoutSeconds(),
  };
};

const buildIdentity = (claims, fallbackEmail = null, fallbackRole = null) => ({
  sub: claims.sub || claims.username || null,
  email: claims.email || fallbackEmail,
  cognitoRole: fallbackRole,
});

export const loginWithCognito = async (email, password) => {
  try {
    const client = getClient();
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await client.send(command);
    const authResult = response.AuthenticationResult;

    if (!authResult?.AccessToken) {
      throw createAuthError(
        "No se recibió un token válido desde Cognito",
        502,
        "COGNITO_EMPTY_TOKENS",
      );
    }

    const claims = authResult.IdToken
      ? decodeJwtPayload(authResult.IdToken)
      : decodeJwtPayload(authResult.AccessToken);
    const role = getRoleFromClaims(claims);
    const identity = buildIdentity(claims, email, role);

    return {
      identity,
      user: {
        email: identity.email,
        role,
      },
      session: buildSession(
        authResult.AccessToken,
        authResult.IdToken,
        authResult.ExpiresIn,
      ),
      nextRoute: buildNextRoute(role),
    };
  } catch (error) {
    if (error.name === "NotAuthorizedException") {
      throw createAuthError(
        "Credenciales inválidas",
        401,
        "INVALID_CREDENTIALS",
      );
    }
    if (error.name === "UserNotFoundException") {
      throw createAuthError("Usuario no encontrado", 404, "USER_NOT_FOUND");
    }
    if (error.name === "UserNotConfirmedException") {
      throw createAuthError(
        "La cuenta aún no está confirmada",
        403,
        "USER_NOT_CONFIRMED",
      );
    }
    if (error.statusCode) {
      throw error;
    }
    throw createAuthError(
      "Error al autenticar con Cognito",
      502,
      "COGNITO_LOGIN_ERROR",
    );
  }
};

export const forgotPasswordWithCognito = async (email) => {
  try {
    const client = getClient();
    const command = new ForgotPasswordCommand({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
    });

    const response = await client.send(command);

    return {
      email,
      provider: "cognito",
      delivery: response.CodeDeliveryDetails || null,
      message: "Solicitud de recuperación enviada",
    };
  } catch (error) {
    if (error.name === "UserNotFoundException") {
      return {
        email,
        provider: "cognito",
        delivery: null,
        message: "Solicitud de recuperación enviada",
      };
    }
    if (error.statusCode) {
      throw error;
    }
    throw createAuthError(
      "Error al iniciar recuperación de contraseña",
      502,
      "COGNITO_FORGOT_PASSWORD_ERROR",
    );
  }
};

export const confirmForgotPasswordWithCognito = async (
  email,
  code,
  newPassword,
) => {
  try {
    const client = getClient();
    const command = new ConfirmForgotPasswordCommand({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    });

    await client.send(command);

    return {
      email,
      provider: "cognito",
      message: "La contraseña fue actualizada",
    };
  } catch (error) {
    if (error.name === "CodeMismatchException") {
      throw createAuthError(
        "El código de recuperación es inválido",
        401,
        "RESET_CODE_INVALID",
      );
    }
    if (error.name === "ExpiredCodeException") {
      throw createAuthError(
        "El código de recuperación expiró",
        401,
        "RESET_CODE_EXPIRED",
      );
    }
    if (error.name === "UserNotFoundException") {
      throw createAuthError("Usuario no encontrado", 404, "USER_NOT_FOUND");
    }
    if (error.name === "InvalidPasswordException") {
      throw createAuthError(
        "La nueva contraseña no cumple la política requerida",
        400,
        "PASSWORD_INVALID",
      );
    }
    if (error.statusCode) {
      throw error;
    }
    throw createAuthError(
      "Error al confirmar la recuperación de contraseña",
      502,
      "COGNITO_CONFIRM_FORGOT_PASSWORD_ERROR",
    );
  }
};

export const getCognitoSession = async (accessToken) => {
  try {
    const client = getClient();
    const response = await client.send(
      new GetUserCommand({
        AccessToken: accessToken,
      }),
    );

    const accessClaims = decodeJwtPayload(accessToken);
    const emailAttribute = response.UserAttributes?.find(
      (attribute) => attribute.Name === "email",
    );
    const role = getRoleFromClaims(accessClaims, response.UserAttributes || []);
    const identity = buildIdentity(
      accessClaims,
      emailAttribute?.Value || null,
      role,
    );

    return {
      identity,
      user: {
        email: identity.email,
        role,
      },
      session: {
        ...buildSession(accessToken, null, null),
        isAuthenticated: true,
      },
      nextRoute: buildNextRoute(role),
    };
  } catch (error) {
    if (error.name === "NotAuthorizedException") {
      throw createAuthError("Sesión expirada", 401, "TOKEN_EXPIRED");
    }
    if (error.statusCode) {
      throw error;
    }
    throw createAuthError(
      "Error al validar la sesión",
      502,
      "COGNITO_SESSION_ERROR",
    );
  }
};
