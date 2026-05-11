// ===============================
// dashboardController.mjs
// ===============================

// Importa servicio principal dashboard.
import { getDashboardService }
from "./dashboardService.mjs";

// Importa validación de sesión.
import { getCurrentSession }
from "../auth-services/authService.mjs";

// Importa helper error response.
import {

  errorResponse

} from "../../shared/utils/response/response.mjs";


// ======================================================
// CONTROLADOR DASHBOARD
// ======================================================
export const getDashboardController =
async (event) => {

  try {

    // ==============================================
    // OBTIENE TOKEN JWT
    // ==============================================
    const authorizationHeader =

      event.headers?.Authorization ||

      event.headers?.authorization;

    // ==============================================
    // VALIDA EXISTENCIA TOKEN
    // ==============================================
    if (!authorizationHeader) {

      return errorResponse(

        "Token requerido",

        401
      );
    }

    // ==============================================
    // OBTIENE SESIÓN ACTUAL
    // ==============================================
    const session =
      await getCurrentSession(
        authorizationHeader
      );

    // ==============================================
    // VALIDACIÓN ROL ADMIN
    // ==============================================
    if (session.role !== "admin") {

      return errorResponse(

        "Solo el Administrador puede acceder al Dashboard",

        403,

        {
          code: "FORBIDDEN_ROLE",
        }
      );
    }

    // ==============================================
    // OBTIENE DATA DASHBOARD
    // ==============================================
    const data =
      await getDashboardService();

    // ==============================================
    // RESPUESTA EXITOSA
    // ==============================================
    // QA espera body directo SIN wrapper.
    return {

      statusCode: 200,

      headers: {

        "Access-Control-Allow-Origin":
          "*",

        "Access-Control-Allow-Headers":
          "*",

        "Access-Control-Allow-Methods":
          "*",

        "Content-Type":
          "application/json"
      },

      body: JSON.stringify(data)
    };

  } catch (error) {

    // ==============================================
    // LOG ERROR
    // ==============================================
    console.error(

      "Error en dashboard controller:",

      error
    );

    // ==============================================
    // RESPUESTA ERROR
    // ==============================================
    return errorResponse(

      "Error interno del servidor",

      500
    );
  }
};