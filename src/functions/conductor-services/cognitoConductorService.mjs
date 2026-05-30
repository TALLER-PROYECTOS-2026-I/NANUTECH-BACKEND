import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

/**
 * Cliente AWS Cognito utilizado
 * para la administración de usuarios.
 */
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Servicio encargado de gestionar
 * las operaciones relacionadas con
 * conductores en AWS Cognito.
 *
 * Funcionalidades:
 * - Crear usuario conductor
 * - Enviar credenciales temporales
 * - Eliminar usuario en caso de rollback
 */

export class CognitoConductorService {
  /**
   * Crea un usuario conductor en AWS Cognito.
   *
   * Al registrarse:
   * - Se genera una contraseña temporal
   * - Se registra el correo electrónico
   * - Se registra el DNI como atributo personalizado
   * - Cognito envía automáticamente
   *   las credenciales por correo
   */
  async crearUsuarioConductor({ email, dni, nombreCompleto }) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const temporaryPassword = process.env.COGNITO_TEMP_PASSWORD || "Nanutech2026!";

    /**
     * Valida configuración mínima
     * requerida para conectarse
     * al User Pool.
     */
    if (!userPoolId) {
      const error = new Error("No se configuró COGNITO_USER_POOL_ID");
      error.statusCode = 500;
      throw error;
    }

    /**
     * Configuración de creación
     * del usuario Cognito.
     */
    const command = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      TemporaryPassword: temporaryPassword,
      UserAttributes: [
        /*Correo corporativo del conductor.*/
        { Name: "email", Value: email },
        // Marca el correo como verificado.
        { Name: "email_verified", Value: "true" },
        // Nombre completo del conductor
        { Name: "name", Value: nombreCompleto },
        // DNI almacenado como atributo personalizado
        { Name: "custom:dni", Value: dni },
      ],
      /**
       * Indica que Cognito enviará
       * automáticamente las credenciales
       * al correo registrado.
       */
      DesiredDeliveryMediums: ["EMAIL"],
    });

    /**
     * Ejecuta creación
     * del usuario Cognito.
     */
    const result = await cognitoClient.send(command);

    /**
     * Obtiene el identificador único
     * generado por Cognito.
     */
    const subAttribute = result.User?.Attributes?.find((attr) => attr.Name === "sub");

    return {
      /**
       * Nombre de usuario Cognito.
       */
      username: result.User?.Username,
      /**
       * Identificador único Cognito.
       */
      cognitoSub: subAttribute?.Value || null,
    };
  }

  /**
   * Elimina un usuario conductor
   * previamente creado en Cognito.
   *
   * Utilizado durante el proceso
   * de rollback cuando ocurre
   * un error después de crear
   * las credenciales.
   */
  async eliminarUsuarioConductor(email) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;

    /**
     * Si no existe configuración
     * o correo, no realiza acción.
     */
    if (!userPoolId || !email) return;

    const command = new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    });

    /**
     * Ejecuta eliminación
     * del usuario Cognito.
     */
    await cognitoClient.send(command);
  }
}
