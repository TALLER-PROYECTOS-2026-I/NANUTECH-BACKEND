const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createValidationError = (message, code = "VALIDATION_ERROR") => {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  return error;
};

export const validateEmail = (email) => {
  if (!email) {
    throw createValidationError("El email es obligatorio", "EMAIL_REQUIRED");
  }

  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    throw createValidationError(
      "El email no tiene un formato válido",
      "EMAIL_INVALID",
    );
  }

  return email.trim().toLowerCase();
};

export const validatePassword = (password) => {
  if (!password) {
    throw createValidationError(
      "La contraseña es obligatoria",
      "PASSWORD_REQUIRED",
    );
  }

  if (typeof password !== "string" || password.trim() === "") {
    throw createValidationError(
      "La contraseña es obligatoria",
      "PASSWORD_REQUIRED",
    );
  }

  return password;
};

export const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    const error = new Error("Token de acceso requerido");
    error.statusCode = 401;
    error.code = "TOKEN_REQUIRED";
    throw error;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    const error = new Error("Token inválido");
    error.statusCode = 401;
    error.code = "TOKEN_INVALID";
    throw error;
  }

  return token.trim();
};
