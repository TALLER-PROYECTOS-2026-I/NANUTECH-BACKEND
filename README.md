# 📘 Guía Git del Equipo

> Flujo de trabajo estándar para desarrollo y documentación de código.

---

## 📋 Tabla de Contenidos

- [Flujo de desarrollo (feature branches)](#-flujo-de-desarrollo-feature-branches)
- [Cómo documentar código ya mergeado a develop](#-cómo-documentar-código-ya-mergeado-a-develop)
- [Reglas de oro](#-reglas-de-oro)

---

## 🚀 Flujo de desarrollo (feature branches)

Cada persona trabaja en su propia rama por funcionalidad (HU). Seguir estos pasos **en orden** evita el 90% de los conflictos.

### Paso 1 — Partir siempre desde `develop` actualizado

```bash
git checkout develop
git pull origin develop
```

> ⚠️ Nunca crear una rama desde código desactualizado.

---

### Paso 2 — Crear tu rama con nombre descriptivo

```bash
git checkout -b feature/nombre-de-la-hu
```

**Ejemplos:**

```bash
git checkout -b feature/login
git checkout -b feature/dashboard
git checkout -b feature/cambio-de-password
```

---

### Paso 3 — Trabajar en tu código

Desarrolla tu funcionalidad normalmente. Haz commits frecuentes y descriptivos:

```bash
git add .
git commit -m "feat: agrega validación de formulario en login"
```

---

### Paso 4 — Actualizar tu rama con lo último de `develop` (hacer esto cada día)

Antes de seguir trabajando o de abrir un PR, traer los cambios nuevos de `develop`:

```bash
git fetch origin
git rebase origin/develop
```

> 💡 Si hay conflictos, resolverlos, luego:
> ```bash
> git add .
> git rebase --continue
> ```

---

### Paso 5 — Subir tu rama y abrir el PR

```bash
git push origin feature/nombre-de-la-hu
```

Luego abrir el **Pull Request** hacia `develop` desde la interfaz de GitHub.

---

### Flujo visual

```
develop
 ├── feature/login           → fetch+rebase diario → PR → develop ✅
 ├── feature/dashboard       → fetch+rebase diario → PR → develop ✅
 └── feature/cambio-password → fetch+rebase diario → PR → develop ✅
```

---

## 📝 Cómo documentar código ya mergeado a `develop`

Cuando el código ya fue mergeado a `develop` y las ramas originales están desactualizadas o eliminadas, **no tocar las ramas viejas**. Partir desde `develop` directamente.

### Paso 1 — Cada quien crea su propia rama de documentación desde `develop`

```bash
git checkout develop
git pull origin develop
git checkout -b docs/comentarios-nombre-funcionalidad
```

**Ejemplos:**

```bash
git checkout -b docs/comentarios-login        # persona de login
git checkout -b docs/comentarios-dashboard    # persona de dashboard
git checkout -b docs/comentarios-password     # persona de password
```

---

### Paso 2 — Comentar solo los archivos de tu funcionalidad

Cada persona comenta **únicamente sus archivos**. No tocar archivos de otros para evitar conflictos.

```bash
# Ejemplo de comentario en una función
git add src/login/authService.js
git commit -m "docs: agrega comentarios a funciones de autenticación"
```

---

### Paso 3 — Subir la rama y abrir el PR hacia `develop`

```bash
git push origin docs/comentarios-nombre-funcionalidad
```

Luego abrir el **Pull Request** hacia `develop`.

---

### Flujo visual

```
develop (con todo el código mergeado)
 ├── docs/comentarios-login       → PR → develop ✅
 ├── docs/comentarios-dashboard   → PR → develop ✅
 └── docs/comentarios-password    → PR → develop ✅
```

> ✅ Con ramas separadas por persona, cada quien es independiente. Si uno se tarda, los demás no se bloquean.

---

## 🏆 Reglas de oro

| Regla | Por qué importa |
|---|---|
| Siempre partir desde `develop` actualizado | Evita trabajar sobre código viejo |
| `fetch` + `rebase` diario | Reduce conflictos al mínimo |
| PRs pequeños y frecuentes | Más fácil de revisar y mergear |
| Cada quien toca solo sus archivos | Evita pisar el trabajo de otros |
| Comentar el código antes del PR | Evita tener que crear ramas de docs después |

---

> 📌 **Tip final:** Establecer como regla del equipo que todo PR debe incluir comentarios en las funciones nuevas antes de mergear a `develop`. Esto evita el problema de raíz.


# NANUTECH-BACKEND

# 📘 NanuTech Backend — Lineamientos de Desarrollo

> Guía oficial para el equipo de desarrollo. Leer antes de realizar cualquier Pull Request.

---

## 📁 Estructura de Lambdas

Dentro de la carpeta `src/functions`, cada desarrollador debe crear una carpeta con el nombre definido por el arquitecto.

```
src/
└── functions/
    └── <nombre-lambda>/          ← nombre definido por el arquitecto
        ├── <nombre>Handler.mjs
        ├── <nombre>Controller.mjs
        ├── <nombre>Service.mjs
        ├── <nombre>Repository.mjs
        └── <nombre>Model.mjs
```

### Archivos requeridos por Lambda

| Archivo      | Responsabilidad                 |
| ------------ | ------------------------------- |
| `handler`    | Punto de entrada de AWS Lambda  |
| `controller` | Manejo de la request y response |
| `service`    | Lógica de negocio               |
| `repository` | Acceso a base de datos          |
| `model`      | Definición de la entidad        |

---

## 🚫 Archivos que NO deben incluirse en el Pull Request

No subir ninguno de los siguientes archivos o carpetas:

```
*.yaml / *.yml
node_modules/
.aws-sam/
env.json
```

> ⚠️ Asegúrate de que tu `.gitignore` los excluya antes de hacer commit.

---

## 🔁 Estructura de Respuestas del Backend

Todas las respuestas deben seguir el formato estándar ubicado en:

```
src/shared/util/response.mjs
```

### Formato obligatorio

```json
{
  "success": true,
  "data": {},
  "message": "Descripción del resultado"
}
```

> 📌 Es responsabilidad del **frontend** manejar y mostrar correctamente esta estructura en la interfaz.

---

## 🧪 Pruebas (Testing)

Dentro de la carpeta `test/`, crear una subcarpeta con el nombre de la Lambda según la arquitectura.

```
test/
└── <nombre-lambda>/
    ├── <nombre>Handler.test.mjs
    ├── <nombre>Controller.test.mjs
    ├── <nombre>Service.test.mjs
    └── <nombre>Repository.test.mjs
```

### Reglas de testing

- Cada archivo debe tener su **prueba unitaria** correspondiente
- Se deben incluir también **pruebas de integración**
- La extensión obligatoria es **`.test.mjs`**

**Ejemplo:**

| Archivo fuente         | Archivo de prueba           |
| ---------------------- | --------------------------- |
| `camionController.mjs` | `camionController.test.mjs` |
| `camionService.mjs`    | `camionService.test.mjs`    |
| `camionRepository.mjs` | `camionRepository.test.mjs` |
| `camionHandler.mjs`    | `camionHandler.test.mjs`    |

---

## 📦 Manejo de Dependencias

> ⛔ **No actualizar ni subir el archivo `package.json`.**

Si necesitas agregar o actualizar una dependencia:

1. Informar previamente al **líder técnico**
2. El equipo **DevSecOps** realizará la actualización en el repositorio
3. Esto garantiza que el despliegue se realice sin inconvenientes

---

## 🤝 Coordinación Técnica

Los líderes de **frontend** y **backend** deben coordinar con el **arquitecto** el diseño de la base de datos de NanuTech para el Sprint 1.

---

## ⚙️ Cómo registrar tu Lambda en `template.yml`

Sigue este bloque como plantilla para registrar tu función. Respeta el nombre definido por el arquitecto.

```yaml
# ─────────────────────────────────────────────────────────────────
# PLANTILLA PARA REGISTRAR UNA NUEVA LAMBDA
# Reemplaza <NombreCapitalizado> y <nombre-kebab>
# con el nombre definido por el arquitecto.
# ─────────────────────────────────────────────────────────────────

<NombreCapitalizado>Function:
  Type: AWS::Serverless::Function
  Properties:
    # Nombre de la función: sigue el patrón {stage}-{nombre-kebab}
    FunctionName: !Sub "${StageName}-<nombre-kebab>"

    CodeUri: .

    # Ruta al handler dentro de src/functions/<nombre-carpeta>/
    Handler: src/functions/<nombre-carpeta>/<nombre>Handler.handler

    Policies:
      - AWSLambdaBasicExecutionRole

    Environment:
      Variables:
        LOG_LEVEL: "debug"

    # Define los endpoints HTTP que disparan esta Lambda
    Events:
      GetAll:
        Type: Api
        Properties:
          RestApiId: !Ref NanutechApi
          Path: /<nombre-kebab> # ej: /camiones
          Method: GET
      GetById:
        Type: Api
        Properties:
          RestApiId: !Ref NanutechApi
          Path: /<nombre-kebab>/{id} # ej: /camiones/{id}
          Method: GET
      Create:
        Type: Api
        Properties:
          RestApiId: !Ref NanutechApi
          Path: /<nombre-kebab>
          Method: POST
      Update:
        Type: Api
        Properties:
          RestApiId: !Ref NanutechApi
          Path: /<nombre-kebab>/{id}
          Method: PUT
      Delete:
        Type: Api
        Properties:
          RestApiId: !Ref NanutechApi
          Path: /<nombre-kebab>/{id}
          Method: DELETE

    Tags:
      Environment: !Ref StageName
      Servicio: <nombre-kebab> # ej: camion, usuario, pedido

  # Configuración de build con esbuild — NO modificar
  Metadata:
    BuildMethod: esbuild
    BuildProperties:
      Minify: false
      Target: es2022
      Sourcemap: true
      EntryPoints:
        - src/functions/<nombre-carpeta>/<nombre>Handler.mjs

  # ─────────────────────────────────────────────────────────────────
  # Agrega el Output correspondiente al final del archivo template.yml
  # ─────────────────────────────────────────────────────────────────

  # Dentro de la sección Outputs:
  <NombreCapitalizado>FunctionArn:
    Description: "ARN de la función <NombreCapitalizado>"
    Value: !GetAtt <NombreCapitalizado>Function.Arn
```

### Referencia: Lambda existente (`CamionFunction`)

```yaml
AWSTemplateFormatVersion: 2010-09-09
Description: API para gestión de camiones - Nanutech Backend

Transform:
  - AWS::Serverless-2016-10-31

Parameters:
  StageName:
    Type: String
    Default: dev
    Description: "dev: 'dev' | testing: 'testing' | production: ''"
  DBHost:
    Type: String
    Default: "database-demo.c56g84wquc58.us-east-2.rds.amazonaws.com"
  DBUser:
    Type: String
    Default: "backend_user"
  DBPassword:
    Type: String
    Default: "Backend123!"
    NoEcho: true
  DBName:
    Type: String
    Default: "postgres"
  DBPort:
    Type: String
    Default: "5432"

Globals:
  Function:
    Timeout: 30
    MemorySize: 512
    Runtime: nodejs20.x
    Architectures:
      - x86_64
    Environment:
      Variables:
        NODE_ENV: !Ref StageName
        DB_HOST: !Ref DBHost
        DB_USER: !Ref DBUser
        DB_PASSWORD: !Ref DBPassword
        DB_NAME: !Ref DBName
        DB_PORT: !Ref DBPort
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
        NODE_OPTIONS: "--enable-source-maps"
    LoggingConfig:
      LogFormat: JSON
    Tags:
      Environment: !Ref StageName
      Proyecto: Nanutech-Backend
    Tracing: Active

Resources:
  NanutechApi:
    Type: AWS::Serverless::Api
    Properties:
      Name: !Sub "nanutech-api-${StageName}"
      StageName: !Ref StageName
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
        AllowOrigin: "'*'"
      TracingEnabled: true
      Tags:
        Environment: !Ref StageName
        Proyecto: Nanutech-Backend

  CamionFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "${StageName}-camiones"
      CodeUri: .
      Handler: src/functions/camion-services/camionHandler.handler
      Policies:
        - AWSLambdaBasicExecutionRole
      Environment:
        Variables:
          LOG_LEVEL: "debug"
      Events:
        GetAll:
          Type: Api
          Properties:
            RestApiId: !Ref NanutechApi
            Path: /camiones
            Method: GET
        GetById:
          Type: Api
          Properties:
            RestApiId: !Ref NanutechApi
            Path: /camiones/{id}
            Method: GET
      Tags:
        Environment: !Ref StageName
        Servicio: camion
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: false
        Target: es2022
        Sourcemap: true
        EntryPoints:
          - src/functions/camion-services/camionHandler.mjs

  ApplicationResourceGroup:
    Type: AWS::ResourceGroups::Group
    Properties:
      Name: !Sub "ApplicationInsights-SAM-${AWS::StackName}"
      ResourceQuery:
        Type: CLOUDFORMATION_STACK_1_0

  ApplicationInsightsMonitoring:
    Type: AWS::ApplicationInsights::Application
    Properties:
      ResourceGroupName: !Ref ApplicationResourceGroup
      AutoConfigurationEnabled: true

Outputs:
  ApiEndpoint:
    Description: "URL del endpoint de API Gateway"
    Value: !Sub "https://${NanutechApi}.execute-api.${AWS::Region}.${AWS::URLSuffix}/${StageName}"
  CamionFunctionArn:
    Description: "ARN de la función Camion"
    Value: !GetAtt CamionFunction.Arn
```

---

## ✅ Resumen de Reglas

| #   | Regla                                                                     |
| --- | ------------------------------------------------------------------------- |
| 1   | Respetar los nombres definidos por la arquitectura                        |
| 2   | Mantener la estructura estándar de archivos por Lambda                    |
| 3   | No subir archivos innecesarios al PR                                      |
| 4   | Seguir el formato de respuesta del backend (`success`, `data`, `message`) |
| 5   | Incluir pruebas unitarias y de integración con extensión `.test.mjs`      |
| 6   | Coordinar cambios técnicos con los líderes antes de implementar           |
| 7   | No modificar `package.json` sin autorización del equipo DevSecOps         |||
