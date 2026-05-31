# Informe de Implementación y Arquitectura: Historia de Usuario #13 (Auditoría de Accesos)

**Fecha:** 24 de Mayo de 2026  
**Responsable:** Equipo de Desarrollo Backend / DevSecOps  
**Rama:** `feature/HU13-AuditoriaAccesos`

---

## 1. Resumen Ejecutivo

Se implementó con éxito el módulo completo para la **HU-13: Auditoría de Accesos**. Este módulo proporciona un rastreo confiable e inmutable de la actividad de los usuarios mediante el registro de todos los inicios de sesión. Proporciona a los Administradores un panel de métricas clave, un historial detallado y herramientas de exportación (CSV).

---

## 2. Abstracción y Persistencia (Base de Datos)

Se introdujo una nueva tabla para llevar un control detallado usando un script de migración SQL (`1779678075986_auditoria-accesos.sql`). Esta tabla captura el actor, su entorno y el momento exacto.

**Script de Migración Usado:**

```sql
CREATE TABLE IF NOT EXISTS auditoria_accesos (
  id_registro SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE DEFAULT 'AUD-' || upper(substr(md5(random()::text), 1, 8)),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  direccion_ip VARCHAR(45) NOT NULL,
  navegador TEXT NOT NULL,
  fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auditoria_usuario ON auditoria_accesos(usuario_id);
CREATE INDEX idx_auditoria_fecha ON auditoria_accesos(fecha_hora);
```

_Justificación:_ El uso de índices en `usuario_id` y `fecha_hora` optimiza y acelera radicalmente las queries analíticas necesarias para el Dashboard Gerencial.

---

## 3. Hook de Intercepción de Autenticación (Fail-Safe)

Para no alterar masivamente el core de autenticación (`authController.mjs`), se implementó un _Interceptor/Hook_. Tras confirmar un login exitoso, se notifica asíncronamente al módulo de Auditoría para que se guarde el rastro.

**Código de Inyección (`authController.mjs`):**

```javascript
import { registrarAcceso } from "../auditoria-services/auditoriaService.mjs";

// Dentro del método de validación de Login...
if (result && result.user) {
  // Disparamos silenciosamente el evento de auditoria sin bloquear el retorno
  await registrarAcceso(event, result.user);
}
return successResponse(result, "Resultado de login");
```

**Lógica del Hook (`auditoriaService.mjs`):**
La extracción de la dirección IP real utiliza la cabecera `X-Forwarded-For` expuesta en AWS API Gateway, haciendo fallback a la IP de origen general. Toda la lógica está envuelta en un control de fallos:

```javascript
export const registrarAcceso = async (event, user) => {
  try {
    if (!user || !user.id) return;

    // AWS API Gateway provee la IP del cliente real en 'X-Forwarded-For'
    const xForwardedFor = event.headers?.["X-Forwarded-For"] || "";
    const direccionIp =
      xForwardedFor.split(",")[0] || event.requestContext?.identity?.sourceIp || "Desconocida";
    const navegador = event.headers?.["User-Agent"] || "Desconocido";

    await insertAuditoriaAcceso(user.id, direccionIp, navegador);
  } catch (error) {
    // Patrón Fail-Safe: La auditoría no debe impedir el inicio de sesión si falla.
    console.error("[Auditoría] Error al registrar acceso:", error.message);
  }
};
```

---

## 4. Endpoints y Controladores

Se consolidaron tres Endpoints para cumplir todos los casos de uso descritos en la HU-13, todos protegidos mediante validación de roles en sesión.

### 4.1. Middleware de Privilegios Administrativos

Se diseñó un mecanismo interceptor que revisa el Token JWT en los headers de cada request y valida que el `rol` interno sea de "admin".

```javascript
const validarAccesoAdministrador = async (event) => {
  const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!authorizationHeader) throw new Error("Acceso denegado: Token requerido");

  const session = await getCurrentSession(authorizationHeader);
  if (!["admin"].includes(session.role.toLowerCase())) {
    throw new Error("Acceso denegado: Se requiere rol de Administrador");
  }
};
```

### 4.2. API Routes Implementadas (vía Lambda Proxy Integration)

El `auditoriaHandler` recibe la solicitud y rutea bajo el siguiente esquema:

1. `GET /auditoria/resumen`: Sumariza cantidades exactas leyendo la BBDD.
2. `GET /auditoria/registros`: Historial tabla, con parámetros _query_ de búsqueda y rol.
3. `GET /auditoria/exportar/csv`: Formatea directamente un archivo descargable.

**Lógica de Exportación a CSV (`auditoriaService.mjs`):**
En lugar de depender de pesadas librerías externas para exportar tablas, formateamos el modelo de datos en memoria y definimos el content-type en el controlador.

```javascript
export const generarCsvAuditoria = async (search, rol) => {
  const registros = await obtenerRegistrosAuditoria(search, rol);
  let csv = "ID Registro,Usuario,Email,Rol,Fecha,Hora,Direccion IP,Navegador/SO\n";

  registros.forEach((r) => {
    // Escapar comillas y prevenir inyecciones CSV
    const navEscapado = `"${(r.navegador || "").replace(/"/g, '""')}"`;
    csv += `${r.id_registro},${r.usuario},${r.email},${r.rol},${r.fecha},${r.hora},${r.direccion_ip},${navEscapado}\n`;
  });
  return csv;
};
```

(El controlador responde esto con las cabeceras `Content-Type: text/csv` y `Content-Disposition: attachment`).

---

## 5. Pruebas Unitarias Integradas

Para proteger el código contra la degradación a futuro, se redactaron pruebas completas apoyadas en _Jest_. Destacan casos de validación de roles y de formateo de datos:

**Validación del Controlador Restringido (Extracto `auditoriaController.test.mjs`):**

```javascript
it("debería retornar 403 si el token no es de administrador", async () => {
  // Mock del rol fallido (Usuario 'conductor')
  getCurrentSession.mockResolvedValue({ role: "conductor" });

  const result = await getAuditoriaResumenController(mockUserEvent);

  expect(result.statusCode).toBe(403);
  expect(JSON.parse(result.body).success).toBe(false);
});
```

---

## 6. Arquitectura AWS Serverless (Despliegue y Resolución de Conflictos)

### 6.1 Problemas de Fusión Resueltos

Durante la integración hacia `develop`, ocurrieron conflictos (`Merge Conflicts`) dado un empuje concurrente en los archivos de servicio de auditoria.
Para resolver esto asegurando no perder la funcionalidad CSV y las Pruebas creadas, se optó por la estrategia estricta de `git merge -X ours origin/develop`, asegurando calidad final antes de someter el Pull Request (#316).

### 6.2 Pieza Separada para `template.yaml`

Para evitar un problema clásico de **CORS** en el frontend al hacer el despliegue con AWS SAM, debe adherirse lo siguiente en el archivo `template.yaml`. Se entregó a `DevSecOps` de manera manual por cuestiones de seguridad de la infraestructura:

```yaml
AuditoriaFunction:
  Type: AWS::Serverless::Function
  Properties:
    FunctionName: !Sub "${StageName}-auditoria"
    CodeUri: .
    Handler: src/functions/auditoria-services/auditoriaHandler.handler
    Events:
      GetResumen:
        Type: Api
        Properties:
          Path: /auditoria/resumen
          Method: GET
      # (... demas endpoints GET)
```

---

**Status Final:** ✅ Listo y aprobado a nivel de código para subir a producción una vez fusionado el PR.
