/**
 * @openapi
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: >
 *         Token JWT emitido por Amazon Cognito tras un login exitoso.
 *         Incluirlo en el header: `Authorization: Bearer <accessToken>`
 *
 *   schemas:
 *
 *     LoginInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: admin@nanutech.com
 *         password:
 *           type: string
 *           example: "Admin123!"
 *
 *     ForgotPasswordInput:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: chofer@nanutech.com
 *
 *     ForgotPasswordConfirmInput:
 *       type: object
 *       required:
 *         - email
 *         - code
 *         - newPassword
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: chofer@nanutech.com
 *         code:
 *           type: string
 *           example: "123456"
 *         newPassword:
 *           type: string
 *           example: "Admin123!"
 *
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 11111111-1111-1111-1111-111111111111
 *         correo:
 *           type: string
 *           format: email
 *           example: admin@nanutech.com
 *         nombres:
 *           type: string
 *           example: Jimena
 *         apellidos:
 *           type: string
 *           example: Rodriguez
 *         rol:
 *           type: string
 *           enum: [ADMIN, CHOFER, GERENTE]
 *           example: ADMIN
 *         telefono:
 *           type: string
 *           nullable: true
 *           example: "999111222"
 *         estado:
 *           type: string
 *           enum: [ACTIVO, INACTIVO, BLOQUEADO]
 *           example: ACTIVO
 *         activo:
 *           type: boolean
 *           example: true
 *         ultimo_acceso:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-04-26T10:00:00Z"
 *       description: >
 *         Perfil del usuario autenticado. Nunca expone cognito_sub,
 *         password ni hashes internos.
 *
 *     SessionInfo:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           description: JWT de acceso (vida corta ~1h)
 *           example: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
 *         refreshToken:
 *           type: string
 *           description: Token de refresco (vida larga ~30d)
 *           example: eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0...
 *         expiresIn:
 *           type: integer
 *           description: Segundos hasta la expiración del accessToken
 *           example: 3600
 *         tokenType:
 *           type: string
 *           example: Bearer
 *
 *     AuthResponse:
 *       type: object
 *       description: Respuesta completa tras login o /me exitoso
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/UserProfile'
 *         session:
 *           $ref: '#/components/schemas/SessionInfo'
 *         role:
 *           type: string
 *           enum: [ADMIN, CHOFER, GERENTE]
 *           example: ADMIN
 *         nextRoute:
 *           type: string
 *           description: Ruta de redirección recomendada según el rol
 *           example: /dashboard/admin
 *         isAuthenticated:
 *           type: boolean
 *           example: true
 */

// Este archivo solo registra la documentación OpenAPI para swagger-jsdoc.
// No exporta lógica de negocio.

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Iniciar sesión
 *     description: >
 *       Autentica al usuario contra Amazon Cognito y devuelve tokens JWT
 *       junto con el perfil del usuario provisionado en la base de datos.
 *
 *       **Roles disponibles:**
 *       - `ADMIN` → admin@nanutech.com
 *       - `CHOFER` → chofer@nanutech.com
 *       - `GERENTE` → gerente@nanutech.com
 *
 *       **Seguridad:** el endpoint no revela si el email existe en el sistema
 *       (anti user-enumeration). Tras N intentos fallidos la cuenta puede
 *       quedar bloqueada temporalmente (HTTP 423).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *           examples:
 *             loginAdmin:
 *               summary: Login como ADMIN
 *               value:
 *                 email: admin@nanutech.com
 *                 password: "Admin123!"
 *             loginChofer:
 *               summary: Login como CHOFER
 *               value:
 *                 email: chofer@nanutech.com
 *                 password: "Admin123!"
 *             loginGerente:
 *               summary: Login como GERENTE
 *               value:
 *                 email: gerente@nanutech.com
 *                 password: "Admin123!"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               message: Resultado de login
 *               data:
 *                 user:
 *                   id: 11111111-1111-1111-1111-111111111111
 *                   correo: admin@nanutech.com
 *                   nombres: Jimena
 *                   apellidos: Rodriguez
 *                   rol: ADMIN
 *                   estado: ACTIVO
 *                   activo: true
 *                 session:
 *                   accessToken: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
 *                   refreshToken: eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0...
 *                   expiresIn: 3600
 *                   tokenType: Bearer
 *                 role: ADMIN
 *                 nextRoute: /dashboard/admin
 *                 isAuthenticated: true
 *       400:
 *         description: Email o contraseña con formato inválido / body vacío
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               emailInvalido:
 *                 summary: Formato de email incorrecto
 *                 value:
 *                   success: false
 *                   message: El correo electrónico no tiene un formato válido
 *               bodyVacio:
 *                 summary: Body sin campos requeridos
 *                 value:
 *                   success: false
 *                   message: El campo email es obligatorio
 *       401:
 *         description: Credenciales incorrectas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Credenciales inválidas
 *       423:
 *         description: Cuenta bloqueada por exceso de intentos fallidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Cuenta bloqueada temporalmente. Intente más tarde.
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Obtener sesión activa del usuario
 *     description: >
 *       Valida el `accessToken` JWT del header `Authorization` contra Cognito,
 *       luego retorna el perfil completo del usuario provisionado en la BD.
 *
 *       Útil para: recargar la sesión al abrir la app, verificar si el token
 *       sigue vigente sin hacer un nuevo login, o refrescar el perfil.
 *
 *       **Nota:** el campo `cognito_sub` nunca es expuesto en la respuesta.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión válida — devuelve perfil y datos de sesión actualizados
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               message: Sesion valida
 *               data:
 *                 user:
 *                   id: 11111111-1111-1111-1111-111111111111
 *                   correo: admin@nanutech.com
 *                   nombres: Jimena
 *                   apellidos: Rodriguez
 *                   rol: ADMIN
 *                   estado: ACTIVO
 *                   activo: true
 *                 role: ADMIN
 *                 nextRoute: /dashboard/admin
 *                 isAuthenticated: true
 *       401:
 *         description: Token ausente, malformado o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               sinToken:
 *                 summary: Header Authorization ausente
 *                 value:
 *                   success: false
 *                   message: Token de autenticación requerido
 *               tokenExpirado:
 *                 summary: Token expirado
 *                 value:
 *                   success: false
 *                   message: Token expirado. Inicie sesión nuevamente.
 *               tokenInvalido:
 *                 summary: JWT malformado
 *                 value:
 *                   success: false
 *                   message: Token inválido
 *       403:
 *         description: Token válido pero usuario inactivo o no provisionado en BD
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Usuario no encontrado o inactivo en el sistema
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Solicitar recuperación de contraseña
 *     description: >
 *       Dispara el flujo de recuperación de contraseña via Amazon Cognito:
 *       se envía un código de verificación de 6 dígitos al email del usuario.
 *
 *       **Anti user-enumeration:** el endpoint siempre responde `200` aunque
 *       el email no exista en el sistema, para no revelar si una cuenta está
 *       registrada. El flujo de confirmación posterior (`/forgot-password/confirm`)
 *       fallará con `401` si el código es inválido.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordInput'
 *           example:
 *             email: chofer@nanutech.com
 *     responses:
 *       200:
 *         description: >
 *           Solicitud procesada. Si el email existe, se envió el código.
 *           Si no existe, la respuesta es idéntica (anti enumeration).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Correo de recuperacion enviado
 *               data: {}
 *       400:
 *         description: Email con formato inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: El correo electrónico no tiene un formato válido
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

/**
 * @openapi
 * /auth/forgot-password/confirm:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Confirmar nueva contraseña con código de verificación
 *     description: >
 *       Segunda etapa del flujo de recuperación. Recibe el email, el código
 *       de 6 dígitos enviado por Cognito y la nueva contraseña deseada.
 *
 *       **Requisitos de contraseña:** mínimo 8 caracteres, al menos una
 *       mayúscula, una minúscula, un número y un carácter especial.
 *
 *       El código expira en 15 minutos. Un código inválido o expirado
 *       retorna `401`. El usuario no encontrado retorna `404`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordConfirmInput'
 *           example:
 *             email: chofer@nanutech.com
 *             code: "123456"
 *             newPassword: "Admin123!"
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Contrasena actualizada
 *               data: {}
 *       400:
 *         description: Datos de entrada inválidos (email mal formateado, contraseña débil)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: La contraseña no cumple los requisitos mínimos de seguridad
 *       401:
 *         description: Código de verificación inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Código de verificación inválido o expirado
 *       404:
 *         description: Usuario no encontrado en Cognito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Usuario no encontrado
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
