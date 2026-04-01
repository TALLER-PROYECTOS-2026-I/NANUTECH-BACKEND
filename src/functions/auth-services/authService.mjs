import * as repo from "./authRepository.mjs";

export const handleForgotPassword = async (email) => {
  // Simulación
  return {
    email,
    message: "Se envió un enlace de recuperación (simulado)",
  };
};

export const handleLoginAttempt = async (email, password) => {
  const user = await repo.getUserByEmail(email);

  if (!user) {
    return { message: "Usuario no encontrado" };
  }

  if (user.locked) {
    return { message: "Cuenta bloqueada" };
  }

  if (user.password !== password) {
    await repo.incrementAttempts(email);

    const attempts = await repo.getAttempts(email);

    if (attempts >= 5) {
      await repo.lockUser(email);
      return { message: "Cuenta bloqueada por intentos fallidos" };
    }

    return { message: `Intento fallido (${attempts})` };
  }

  await repo.resetAttempts(email);

  return { message: "Login exitoso" };
};
