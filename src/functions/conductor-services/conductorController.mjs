export const updateLicenciaController = async (event) => {
  try {
    /**
     * VALIDACIÓN JWT
     */
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

    const session = await getCurrentSession(authorizationHeader);

    /**
     * VALIDACIÓN DE ROLES
     *
     * Chofer: actualiza su propia licencia
     * Admin: puede actualizar la licencia de cualquier conductor
     */
    if (session.role !== "chofer" && session.role !== "admin") {
      return errorResponse("Acceso denegado", 403);
    }

    /**
     * BODY REQUEST
     */
    const body = JSON.parse(event.body || "{}");

    /**
     * VALIDACIÓN HU18
     */
    const licenciaData = LicenciaValidator.validateUpdateLicencia(body);

    /**
     * DETERMINAR conductorId
     *
     * - Admin: debe enviar conductorId en el body
     * - Chofer: se obtiene desde session.user.id
     */
    const conductorId =
      session.role === "admin"
        ? body.conductorId
        : session.user?.id;

    if (!conductorId) {
      return errorResponse(
        session.role === "admin"
          ? "El campo conductorId es requerido para administradores"
          : "No se pudo obtener el ID del conductor desde la sesión",
        400
      );
    }

    /**
     * SERVICE
     */
    const conductorService = new ConductorService();

    const result = await conductorService.updateLicencia(conductorId, licenciaData);

    return successResponse(result, SUCCESS_MESSAGES.LICENCIA_UPDATED);
  } catch (error) {
    console.error("Error updateLicenciaController:", error);

    return errorResponse(error.message, error.statusCode || 400);
  }
};
