import * as cognitoProvider from "./authCognitoProvider.mjs";
import {
  getAuthProvider,
  getRequestedAuthProvider,
  isCognitoConfigured,
} from "./authConfig.mjs";
import * as repo from "./authRepository.mjs";
import {
  createLocalSession,
  verifyLocalAccessToken,
} from "./authToken.mjs";
import {
  extractBearerToken,
  validateEmail,
  validatePassword,
} from "./authValidator.mjs";

const createAuthError = (message, statusCode = 400, code = "AUTH_ERROR") => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const buildNextRoute = (role) => {
  if (role === "admin") return "/dashboard/admin";
  if (role === "chofer") return "/dashboard/chofer";
  return "/dashboard";
};

const sanitizeUser = (user) => ({
  email: user.email,
  role: user.role || null,
});

const getRuntimeInfo = () => ({
  provider: getAuthProvider(),
  requestedProvider: getRequestedAuthProvider(),
  cognitoConfigured: isCognitoConfigured(),
});

const handleLocalForgotPassword = async (email) => {
  return {
    email,
    provider: "local",
    message: "Se envió un enlace de recuperación (simulado)",
  };
};

const handleLocalLoginAttempt = async (email, password) => {
  const user = await repo.getUserByEmail(email);

  if (!user) {
    throw createAuthError("Usuario no encontrado", 404, "USER_NOT_FOUND");
  }

  if (user.locked) {
    throw createAuthError("Cuenta bloqueada", 423, "ACCOUNT_LOCKED");
  }

  if (user.password !== password) {
    await repo.incrementAttempts(email);

    const attempts = await repo.getAttempts(email);

    if (attempts >= 5) {
      await repo.lockUser(email);
      throw createAuthError(
        "Cuenta bloqueada por intentos fallidos",
        423,
        "ACCOUNT_LOCKED",
      );
    }

    throw createAuthError(
      `Intento fallido (${attempts})`,
      401,
      "INVALID_CREDENTIALS",
    );
  }

  await repo.resetAttempts(email);

  return {
    user: sanitizeUser(user),
    session: createLocalSession(user),
    nextRoute: buildNextRoute(user.role),
  };
};

export const handleForgotPassword = async (emailInput) => {
  const email = validateEmail(emailInput);

  if (getAuthProvider() === "cognito") {
    return await cognitoProvider.forgotPasswordWithCognito(email);
  }

  return await handleLocalForgotPassword(email);
};

export const handleLoginAttempt = async (emailInput, passwordInput) => {
  const email = validateEmail(emailInput);
  const password = validatePassword(passwordInput);

  if (getAuthProvider() === "cognito") {
    return await cognitoProvider.loginWithCognito(email, password);
  }

  return await handleLocalLoginAttempt(email, password);
};

export const getCurrentSession = async (authorizationHeader) => {
  const token = extractBearerToken(authorizationHeader);

  if (getAuthProvider() === "cognito") {
    return await cognitoProvider.getCognitoSession(token);
  }

  const payload = verifyLocalAccessToken(token);
  return {
    user: {
      email: payload.email,
      role: payload.role || null,
    },
    session: {
      provider: "local",
      tokenType: "Bearer",
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      idleTimeoutSeconds: payload.exp - payload.iat,
      isAuthenticated: true,
    },
    nextRoute: buildNextRoute(payload.role),
  };
};

export const getAuthRuntimeInfo = () => getRuntimeInfo();
