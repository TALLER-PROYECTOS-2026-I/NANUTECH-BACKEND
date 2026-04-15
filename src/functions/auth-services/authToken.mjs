import crypto from "node:crypto";
import { getSessionTimeoutSeconds, getTokenSecret } from "./authConfig.mjs";

const TOKEN_SEPARATOR = ".";

const toBase64Url = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64").toString("utf8");
};

const sign = (value) =>
  crypto
    .createHmac("sha256", getTokenSecret())
    .update(value)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const createTokenError = (message, code = "TOKEN_INVALID") => {
  const error = new Error(message);
  error.statusCode = 401;
  error.code = code;
  return error;
};

export const createLocalSession = (user) => {
  const timeoutSeconds = getSessionTimeoutSeconds();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + timeoutSeconds;
  const payload = {
    sub: user.email,
    email: user.email,
    role: user.role || null,
    provider: "local",
    iat: issuedAt,
    exp: expiresAt,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return {
    provider: "local",
    accessToken: `${encodedPayload}${TOKEN_SEPARATOR}${signature}`,
    tokenType: "Bearer",
    expiresIn: timeoutSeconds,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    idleTimeoutSeconds: timeoutSeconds,
  };
};

export const verifyLocalAccessToken = (token) => {
  const [encodedPayload, providedSignature] = token.split(TOKEN_SEPARATOR);

  if (!encodedPayload || !providedSignature) {
    throw createTokenError("Token inválido", "TOKEN_INVALID");
  }

  const expectedSignature = sign(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw createTokenError("Token inválido", "TOKEN_INVALID");
  }

  let payload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload));
  } catch (error) {
    throw createTokenError("Token inválido", "TOKEN_INVALID");
  }

  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw createTokenError("Sesión expirada", "TOKEN_EXPIRED");
  }

  return payload;
};

export const decodeJwtPayload = (token) => {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw createTokenError("Token inválido", "TOKEN_INVALID");
  }

  try {
    return JSON.parse(fromBase64Url(parts[1]));
  } catch (error) {
    throw createTokenError("Token inválido", "TOKEN_INVALID");
  }
};
