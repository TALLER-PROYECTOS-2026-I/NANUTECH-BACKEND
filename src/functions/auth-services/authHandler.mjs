import { forgotPassword, loginAttempt } from "./authController.mjs";

export const handler = async (event) => {
  const path = event.resource;
  const method = event.httpMethod;

  if (path === "/auth/forgot-password" && method === "POST") {
    return await forgotPassword(event);
  }

  if (path === "/auth/login" && method === "POST") {
    return await loginAttempt(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ message: "Ruta no encontrada" }),
  };
};
