// 1. Importación corregida a la nueva ruta "shared"
import { query } from "../../shared/config/database.mjs";

export const getAllItemsHandler = async (event) => {
  // Manejo de CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,OPTIONS"
      },
      body: ""
    };
  }

  try {
    // 2. Usamos 'query' que viene de database.mjs
    const result = await query("SELECT * FROM usuarios");

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(result.rows)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.message })
    };
  }
};