import { createJornadaController } from "./jornadaController.mjs";

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === "POST") {
    return await createJornadaController(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({
      message: "Ruta o método no encontrado para jornadas",
    }),
  };
};
