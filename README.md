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
      Proyecto: Nanuetch-Backend
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
        Proyecto: Nanuetch-Backend

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
| 7   | No modificar `package.json` sin autorización del equipo DevSecOps         |
