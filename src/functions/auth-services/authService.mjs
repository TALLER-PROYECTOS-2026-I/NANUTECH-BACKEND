// Orquesta auth con dos modos:
// - cognito: autentica con Cognito y resuelve perfil interno en PostgreSQL
// - local: fallback provisional para no bloquear desarrollo, QA y frontend
import * as cognitoProvider from "./authCognitoProvider.mjs";
import {
  getAuthProvider,
  getRequestedAuthProvider,
  isCognitoConfigured,
} from "./authConfig.mjs";
import * as repo from "./authRepository.mjs";
import * as userRepository from "./userRepository.mjs";
import { createLocalSession, verifyLocalAccessToken } from "./authToken.mjs";
import {
  extractBearerToken,
  validateConfirmationCode,
  validateEmail,
  validatePassword,
} from "./authValidator.mjs";

const LOCAL_RESET_CODE = "123456";

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

const normalizeRole = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const isPlaceholderCognitoSub = (value) =>
  !value || (typeof value === "string" && value.trim().toLowerCase().startsWith("cognito-"));

const sanitizeLocalUser = (user) => ({
  email: user.email,
  role: user.role || null,
});

const buildInternalUser = (profile) => ({
  id: profile.id,
  email: profile.email,
  nombres: profile.nombres || null,
  apellidos: profile.apellidos || null,
  role: normalizeRole(profile.rol),
  estado: profile.estado || null,
});

const getRuntimeInfo = () => ({
  provider: getAuthProvider(),
  requestedProvider: getRequestedAuthProvider(),
  cognitoConfigured: isCognitoConfigured(),
});

const handleLocalForgotPassword = async (email) => {
  const user = await repo.getUserByEmail(email);

  if (user) {
    await repo.setResetCode(email, LOCAL_RESET_CODE);
  }

  return {
    email,
    provider: "local",
    message: "Se envio un enlace de recuperacion (simulado)",
  };
};

const handleLocalConfirmForgotPassword = async (email, code, newPassword) => {
  const user = await repo.getUserByEmail(email);

  if (!user) {
    throw createAuthError("Usuario no encontrado", 404, "USER_NOT_FOUND");
  }

  const storedCode = await repo.getResetCode(email);
  if (!storedCode || storedCode !== code) {
    throw createAuthError(
      "El codigo de recuperacion es invalido",
      401,
      "RESET_CODE_INVALID",
    );
  }

  await repo.updatePassword(email, newPassword);
  await repo.clearResetCode(email);
  await repo.resetAttempts(email);

  return {
    email,
    provider: "local",
    message: "La contrasena fue actualizada",
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
    user: sanitizeLocalUser(user),
    session: createLocalSession(user),
    role: user.role || null,
    nextRoute: buildNextRoute(user.role),
  };
};

const resolveInternalProfile = async (identity) => {
  const cognitoSub = identity?.sub || null;
  const email = identity?.email || null;

  let profile = null;

  if (cognitoSub) {
    profile = await userRepository.findByCognitoSub(cognitoSub);
  }

  if (!profile && email) {
    profile = await userRepository.findByEmail(email);

    if (profile) {
      if (cognitoSub && isPlaceholderCognitoSub(profile.cognitoSub)) {
        profile = await userRepository.linkCognitoSub(profile.id, cognitoSub);
      } else if (cognitoSub && profile.cognitoSub !== cognitoSub) {
        throw createAuthError(
          "La identidad Cognito no coincide con el usuario interno",
          403,
          "COGNITO_SUB_MISMATCH",
        );
      }
    }
  }

  if (!profile) {
    throw createAuthError(
      "Usuario no provisionado internamente",
      403,
      "USER_NOT_PROVISIONED",
    );
  }

  if (profile.estado === "INACTIVO") {
    throw createAuthError(
      "El usuario interno esta inactivo",
      403,
      "USER_INACTIVE",
    );
  }

  if (profile.estado === "BLOQUEADO") {
    throw createAuthError(
      "El usuario interno esta bloqueado",
      423,
      "USER_BLOCKED",
    );
  }

  return profile;
};

const buildInternalSessionResponse = (profile, session) => {
  const user = buildInternalUser(profile);

  return {
    user,
    session,
    role: user.role,
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

export const handleConfirmForgotPassword = async (
  emailInput,
  codeInput,
  newPasswordInput,
) => {
  const email = validateEmail(emailInput);
  const code = validateConfirmationCode(codeInput);
  const newPassword = validatePassword(newPasswordInput);

  if (getAuthProvider() === "cognito") {
    return await cognitoProvider.confirmForgotPasswordWithCognito(
      email,
      code,
      newPassword,
    );
  }

  return await handleLocalConfirmForgotPassword(email, code, newPassword);
};

export const handleLoginAttempt = async (emailInput, passwordInput) => {
  const email = validateEmail(emailInput);
  const password = validatePassword(passwordInput);

  if (getAuthProvider() === "cognito") {
    const authResult = await cognitoProvider.loginWithCognito(email, password);
    const profile = await resolveInternalProfile(authResult.identity);

    await userRepository.updateLastAccess(profile.id);

    return buildInternalSessionResponse(profile, authResult.session);
  }

  return await handleLocalLoginAttempt(email, password);
};

export const getCurrentSession = async (authorizationHeader) => {
  const token = extractBearerToken(authorizationHeader);

  if (getAuthProvider() === "cognito") {
    const sessionResult = await cognitoProvider.getCognitoSession(token);
    const profile = await resolveInternalProfile(sessionResult.identity);

    return buildInternalSessionResponse(profile, sessionResult.session);
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
    role: payload.role || null,
    nextRoute: buildNextRoute(payload.role),
  };
};

export const getAuthRuntimeInfo = () => getRuntimeInfo();
