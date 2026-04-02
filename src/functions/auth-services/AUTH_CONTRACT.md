# Auth Contract

Contrato mínimo del módulo `auth-services` para frontend, QA y DevSecOps.

## Provider actual

- `AUTH_PROVIDER=local`: fallback provisional para desarrollo y pruebas.
- `AUTH_PROVIDER=cognito`: usa Cognito real si también existen `COGNITO_USER_POOL_ID` y `COGNITO_CLIENT_ID`.

## Variables que necesita DevSecOps

- `AUTH_PROVIDER`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `AWS_REGION` o `AWS_DEFAULT_REGION`
- `SESSION_TIMEOUT_SECONDS`
- `AUTH_TOKEN_SECRET`

## Estado actual del backend

- Hoy el backend puede operar completo en modo `local` para no bloquear desarrollo, frontend y QA.
- El modo `cognito` ya está preparado en código, pero depende de infraestructura real y configuración de entorno.
- El fallback local sigue siendo provisional y no debe considerarse autenticación final de producción.

## Endpoints

### `POST /auth/login`

Body:

```json
{
  "email": "test@test.com",
  "password": "123456"
}
```

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Resultado de login",
  "data": {
    "user": {
      "email": "test@test.com",
      "role": "admin"
    },
    "session": {
      "provider": "local",
      "accessToken": "Bearer token payload",
      "tokenType": "Bearer",
      "expiresIn": 7200,
      "expiresAt": "2026-04-01T15:00:00.000Z",
      "idleTimeoutSeconds": 7200
    },
    "nextRoute": "/dashboard/admin"
  }
}
```

Errores principales:

- `400`: email o password inválidos
- `401`: credenciales inválidas
- `404`: usuario no encontrado
- `423`: cuenta bloqueada
- `502`: error de integración con Cognito

### `POST /auth/forgot-password`

Body:

```json
{
  "email": "test@test.com"
}
```

Respuesta exitosa:

- modo `local`: mensaje simulado
- modo `cognito`: inicio real del flujo de recuperación

### `GET /auth/me`

Headers:

```text
Authorization: Bearer <accessToken>
```

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Sesión válida",
  "data": {
    "user": {
      "email": "test@test.com",
      "role": "admin"
    },
    "session": {
      "provider": "local",
      "tokenType": "Bearer",
      "expiresAt": "2026-04-01T15:00:00.000Z",
      "idleTimeoutSeconds": 7200,
      "isAuthenticated": true
    },
    "nextRoute": "/dashboard/admin"
  }
}
```

Errores principales:

- `401`: token faltante, inválido o expirado
- `502`: error de validación con Cognito

## Notas

- `role` y `nextRoute` se devuelven para que el cliente decida la redirección.
- El token local no debe venderse como solución final de producción.
- Para cerrar auth real en nube todavía se necesita Cognito configurado por infraestructura.
- Para funcionar en cloud real todavía faltan: User Pool activo, App Client válido, variables desplegadas por ambiente y pruebas con usuarios reales de Cognito.
