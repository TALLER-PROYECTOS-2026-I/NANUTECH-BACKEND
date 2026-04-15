# Auth Contract

Contrato minimo del modulo `auth-services` para frontend, QA y DevSecOps.

## Provider actual

- `AUTH_PROVIDER=local`: fallback provisional para desarrollo y pruebas.
- `AUTH_PROVIDER=cognito`: autentica con Cognito y luego resuelve perfil interno en PostgreSQL.

## Variables relacionadas a auth y Cognito

- `AUTH_PROVIDER`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `AWS_REGION` o `AWS_DEFAULT_REGION`
- `SESSION_TIMEOUT_SECONDS`
- `AUTH_TOKEN_SECRET`
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_PORT`

## Estado actual del backend

- En modo `local`, el backend no usa PostgreSQL para auth y opera con usuarios en memoria.
- En modo `cognito`, Cognito valida identidad y PostgreSQL resuelve perfil, rol y estado desde la tabla `usuarios`.
- Frontend sigue autenticando contra este backend mediante `/auth/login`.
- La validacion del token se mantiene dentro de Lambda mediante `/auth/me`.
- Para nube real se necesita User Pool activo, App Client valido, variables por ambiente, conectividad a PostgreSQL y usuarios provisionados en `usuarios`.

## Endpoints

### `POST /auth/login`

- Tipo: publico

Body:

```json
{
  "email": "admin@nanutech.com",
  "password": "123456"
}
```

Respuesta exitosa en modo `local`:

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
      "accessToken": "token",
      "tokenType": "Bearer",
      "expiresIn": 7200,
      "expiresAt": "2026-04-01T15:00:00.000Z",
      "idleTimeoutSeconds": 7200
    },
    "role": "admin",
    "nextRoute": "/dashboard/admin"
  }
}
```

Respuesta exitosa en modo `cognito`:

```json
{
  "success": true,
  "message": "Resultado de login",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@nanutech.com",
      "nombres": "Jimena",
      "apellidos": "Rodriguez",
      "role": "admin",
      "estado": "ACTIVO"
    },
    "session": {
      "provider": "cognito",
      "accessToken": "token",
      "idToken": "token",
      "tokenType": "Bearer",
      "expiresIn": 3600,
      "expiresAt": "2026-04-01T15:00:00.000Z",
      "idleTimeoutSeconds": 7200
    },
    "role": "admin",
    "nextRoute": "/dashboard/admin"
  }
}
```

Errores principales:

- `400`: email o password invalidos
- `401`: credenciales invalidas
- `403`: usuario no confirmado en Cognito, usuario no provisionado en BD o usuario interno inactivo
- `404`: usuario no encontrado
- `423`: cuenta bloqueada o usuario interno bloqueado
- `502`: error de integracion con Cognito

### `POST /auth/forgot-password`

- Tipo: publico

Body:

```json
{
  "email": "admin@nanutech.com"
}
```

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Correo de recuperacion enviado",
  "data": {
    "email": "admin@nanutech.com",
    "provider": "local|cognito",
    "message": "Solicitud de recuperacion enviada"
  }
}
```

Notas:

- En modo `local`, el codigo de prueba para confirmar recuperacion es `123456`.
- En modo `cognito`, el backend delega el inicio del flujo a Cognito.

Errores principales:

- `400`: email invalido
- `502`: error de integracion con Cognito

### `POST /auth/forgot-password/confirm`

- Tipo: publico

Body:

```json
{
  "email": "admin@nanutech.com",
  "code": "123456",
  "newPassword": "NuevaClave123"
}
```

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Contrasena actualizada",
  "data": {
    "email": "admin@nanutech.com",
    "provider": "local|cognito",
    "message": "La contrasena fue actualizada"
  }
}
```

Errores principales:

- `400`: payload invalido o nueva contrasena invalida
- `401`: codigo invalido o expirado
- `404`: usuario no encontrado
- `502`: error de integracion con Cognito

### `GET /auth/me`

- Tipo: protegido

Headers:

```text
Authorization: Bearer <accessToken>
```

Respuesta exitosa en modo `cognito`:

```json
{
  "success": true,
  "message": "Sesion valida",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@nanutech.com",
      "nombres": "Jimena",
      "apellidos": "Rodriguez",
      "role": "admin",
      "estado": "ACTIVO"
    },
    "session": {
      "provider": "cognito",
      "tokenType": "Bearer",
      "expiresAt": "2026-04-01T15:00:00.000Z",
      "idleTimeoutSeconds": 7200,
      "isAuthenticated": true
    },
    "role": "admin",
    "nextRoute": "/dashboard/admin"
  }
}
```

Errores principales:

- `401`: token faltante, invalido o expirado
- `403`: usuario no provisionado en BD o usuario interno inactivo
- `423`: usuario interno bloqueado
- `502`: error de validacion con Cognito

## Role, estado y perfil interno

- En modo `local`, el rol sigue saliendo del fallback en memoria.
- En modo `cognito`, el rol final y el estado salen de PostgreSQL, no de Cognito.
- Cognito aporta identidad minima para lookup interno:
  - `sub`
  - `email`
- El backend busca primero por `cognito_sub`.
- Si no encuentra, busca por `correo`.
- Si encuentra por `correo` y el `cognito_sub` esta vacio o es placeholder, lo vincula con el `sub` real.
- El rol de negocio se normaliza de `ADMIN` / `CHOFER` a `admin` / `chofer`.
- `nextRoute` se calcula con el rol final resuelto desde la BD.

## Dependencias con DevSecOps

- User Pool activo
- App Client valido
- Variables de entorno por ambiente
- Usuarios reales en Cognito
- Conectividad a PostgreSQL
- Exposicion real del modulo auth en la infraestructura cloud

## Pruebas locales de HU01

### 1. Preparar PostgreSQL local para modo `cognito`

Variables minimas:

```text
DB_HOST=localhost
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=YOUR_DB_NAME
DB_PORT=5432
DB_SSL_ENABLED=false
```

Inicializar schema y seed:

```bash
node scripts/db-init-local.mjs
```

Si solo quieres reaplicar schema/seed sin limpiar antes:

```bash
node scripts/db-init-local.mjs --no-reset
```

### 2. Probar modo `local`

Variables minimas:

```text
AUTH_PROVIDER=local
SESSION_TIMEOUT_SECONDS=7200
AUTH_TOKEN_SECRET=LOCAL_DEV_SECRET
```

Smoke test:

```bash
node scripts/smoke-auth-local.mjs --mode=local
```

Datos de prueba:

- `test@test.com` / `123456`
- `chofer@test.com` / `123456`
- Codigo de recuperacion local: `123456`

### 3. Probar modo `cognito` con PostgreSQL local

Variables minimas:

```text
AUTH_PROVIDER=cognito
COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
COGNITO_CLIENT_ID=YOUR_CLIENT_ID
AWS_REGION=YOUR_AWS_REGION
DB_HOST=localhost
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=YOUR_DB_NAME
DB_PORT=5432
DB_SSL_ENABLED=false
```

Smoke test:

```bash
node scripts/smoke-auth-local.mjs --mode=cognito
```

Notas:

- Este smoke test no usa Cognito real; mockea el provider y valida el flujo backend con PostgreSQL local.
- El usuario de referencia del seed para este smoke es `admin@nanutech.com`.
- Si falla la conexion a PostgreSQL, el problema es local/infra de base de datos, no de Cognito.
- Si falla por `USER_NOT_PROVISIONED`, `USER_INACTIVE` o `USER_BLOCKED`, el problema viene de los datos en `usuarios`.

### 4. Que valida localmente

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/forgot-password/confirm`
- Resolucion de rol y estado
- `nextRoute`
- Vinculo `cognito_sub` cuando el perfil viene por `correo`

### 5. Que sigue pendiente de nube

- User Pool real
- App Client real
- Recuperacion real por correo en Cognito
- Despliegue de Lambda/API Gateway
- Conectividad Lambda -> PostgreSQL en AWS
- Pruebas end-to-end en staging o cloud
