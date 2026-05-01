# Reporte de validacion de base de datos y endpoints

Proyecto: NANU TECH Backend  
Fecha de validacion: 2026-05-01  
Base local usada para pruebas: `nanutech_local`  
Motor esperado: PostgreSQL  
Alcance: estructura de base de datos, seed, endpoints existentes, simulaciones SQL para endpoints futuros, pruebas locales y observaciones para nube.

> Nota de seguridad: este reporte no incluye la contrasena local de PostgreSQL. Para reproducir las pruebas, cada integrante debe configurar sus propias variables `DB_*`.

---

## 1. Resumen ejecutivo

El proyecto fue revisado con la nueva base de datos aplicada. La base local `nanutech_local` conecto correctamente y contiene las estructuras nuevas requeridas para Sprint 2 y Sprint 3:

- `gps_importacion_errores`
- `gps_proveedor_formatos`
- `contrato_tarifas.tarifa_por_tonelada`
- indice unico para evitar duplicados GPS por proveedor, unidad y fecha/hora

Tambien se verifico que los endpoints actualmente implementados sigan funcionando con la base real local.

Resultado general:

| Area | Resultado |
| --- | --- |
| Conexion a PostgreSQL local | OK |
| Aplicacion de schema desde cero en base temporal | OK |
| Aplicacion de seed desde cero en base temporal | OK |
| Tests automatizados `npm test` | OK |
| Smoke local de auth | OK |
| Handlers actuales contra `nanutech_local` | OK |
| `sam build` | OK |
| `sam validate` | Falla por runtime Lambda `nodejs20.x` deprecado |

Conclusion: localmente el proyecto funciona con la base nueva. La brecha principal para nube no esta en la base de datos, sino en `template.yaml`, porque todas las Lambdas heredan `Runtime: nodejs20.x`, runtime que SAM ya marca como deprecado al 2026-04-30.

---

## 2. Configuracion usada para validar localmente

Las pruebas de conexion real se hicieron con variables equivalentes a estas:

```powershell
$env:DB_HOST="localhost"
$env:DB_USER="postgres"
$env:DB_PASSWORD="<password local omitido>"
$env:DB_NAME="nanutech_local"
$env:DB_PORT="5432"
$env:DB_SSL_ENABLED="false"
```

Consulta de conexion ejecutada:

```sql
SELECT
  current_database() AS database,
  current_user AS user,
  inet_server_addr() AS host,
  inet_server_port() AS port;
```

Resultado:

| Campo | Valor |
| --- | --- |
| database | `nanutech_local` |
| user | `postgres` |
| host | `::1` |
| port | `5432` |

---

## 3. Archivos de base de datos involucrados

| Archivo | Rol |
| --- | --- |
| `db/schema.sql` | Esquema SQL principal para PostgreSQL |
| `db/seed.sql` | Datos iniciales y datos de prueba |
| `db/schema.mjs` | Exporta `schemaSQL` para scripts Node |
| `db/seed.mjs` | Exporta `seedSQL` para scripts Node |
| `db/seed/seed.sql` | Seed en formato compatible con migraciones |
| `db/migrations/1775537760192_sprint1-database.sql` | Migracion/baseline SQL sincronizada |
| `scripts/db-init-local.mjs` | Script para reiniciar esquema, aplicar schema y cargar seed |

El script local actual realiza:

1. Conexion usando variables `DB_*`.
2. `DROP SCHEMA IF EXISTS public CASCADE`.
3. `CREATE SCHEMA public`.
4. Aplicacion de `schemaSQL`.
5. Aplicacion de `seedSQL`.

Esto implica que `node scripts\db-init-local.mjs` es destructivo para la base apuntada por `DB_NAME`: elimina el esquema `public` y lo reconstruye.

---

## 4. Objetos principales de la base de datos

La base validada contiene 29 tablas principales.

### 4.1 Tablas

| Tabla | Proposito funcional |
| --- | --- |
| `usuarios` | Usuarios internos, roles, estado y datos de perfil |
| `login_intentos` | Control de intentos fallidos de login local |
| `password_reset_tokens` | Tokens/codigos para recuperacion de cuenta |
| `sesiones_usuario` | Sesiones de usuario y estado de sesion |
| `auditoria_accesos` | Auditoria de accesos, intentos y acciones |
| `conductores` | Datos operativos de conductores |
| `contactos_emergencia` | Contactos de emergencia de conductores |
| `licencias_conducir` | Licencias de conductores |
| `conductores_historial` | Historial de cambios de conductores |
| `gps_dispositivos` | Dispositivos GPS asociados a unidades |
| `unidades` | Tabla principal de camiones/unidades modernas |
| `camiones` | Tabla legacy usada por endpoints actuales de camiones |
| `camion_mantenimientos` | Mantenimientos preventivos/correctivos |
| `asignaciones_conductor_unidad` | Asignacion activa o historica conductor-unidad |
| `contratos` | Contratos comerciales |
| `contrato_rutas` | Ruta origen/destino/distancia de contrato |
| `contrato_tarifas` | Tarifas por contrato |
| `contrato_unidades` | Unidades asignadas a contratos |
| `contratos_historial` | Historial de cambios del contrato |
| `jornadas` | Jornadas laborales y operativas |
| `alertas_jornada` | Alertas operativas asociadas a jornadas |
| `alertas_historial` | Historial de acciones sobre alertas |
| `ubicaciones_jornada` | Ubicaciones asociadas a una jornada |
| `gps_importaciones` | Cabecera de carga/importacion GPS |
| `gps_importacion_errores` | Errores por fila/campo durante importacion GPS |
| `gps_proveedor_formatos` | Mapeos de columnas por proveedor GPS |
| `gps_registros` | Registros GPS normalizados |
| `gps_eventos` | Eventos GPS operativos |
| `combustible_registros` | Abastecimientos de combustible |

### 4.2 Vistas

| Vista | Uso esperado |
| --- | --- |
| `vw_alertas_panel` | Panel operativo de alertas |
| `vw_camiones_operativos` | Vista completa para camiones/unidades |
| `vw_conductores_full` | Vista enriquecida de conductores |
| `vw_dashboard_resumen` | Resumen ejecutivo general |
| `vw_historial_jornadas_chofer` | Historial mensual/operativo del chofer |
| `vw_seguimiento_jornadas` | Seguimiento tabular de jornadas |
| `vw_tracking_gps` | Tracking GPS con placa y unidad |

### 4.3 Enums

| Enum | Valores |
| --- | --- |
| `categoria_licencia` | `A-I`, `A-II-a`, `A-II-b`, `A-III-a`, `A-III-b`, `A-III-c`, `C`, `D`, `E` |
| `estado_alerta_operativa` | `ACTIVA`, `EN_PROCESO`, `RESUELTA`, `FALSA_ALARMA` |
| `estado_asignacion` | `ACTIVA`, `FINALIZADA`, `CANCELADA` |
| `estado_combustible` | `BORRADOR`, `PENDIENTE_SINCRONIZACION`, `SINCRONIZADO`, `ANULADO` |
| `estado_contrato` | `VIGENTE`, `VENCIDO`, `SUSPENDIDO`, `INACTIVO` |
| `estado_importacion` | `PENDIENTE`, `PROCESADA`, `PROCESADA_CON_ERRORES`, `RECHAZADA` |
| `estado_jornada` | `REGISTRADA`, `PENDIENTE`, `EN_PROCESO`, `COMPLETADA`, `CANCELADA` |
| `estado_operacional_conductor` | `DISPONIBLE`, `EN_RUTA`, `DESCANSO`, `LICENCIA`, `INACTIVO` |
| `estado_sesion` | `ACTIVA`, `EXPIRADA`, `CERRADA`, `REVOCADA` |
| `estado_tracking` | `MOVIENDO`, `DETENIDO`, `EXCESO_VELOCIDAD` |
| `estado_unidad` | `DISPONIBLE`, `EN_JORNADA`, `EN_AUXILIO`, `MANTENIMIENTO`, `INACTIVA` |
| `estado_usuario` | `ACTIVO`, `INACTIVO`, `BLOQUEADO` |
| `proveedor_gps` | `GPSCONTROL`, `GLOBALGPS`, `OTRO` |
| `resultado_auditoria` | `EXITOSO`, `FALLIDO` |
| `rol_usuario` | `ADMIN`, `CHOFER`, `GERENTE` |
| `severidad_alerta` | `BAJA`, `MEDIA`, `ALTA`, `CRITICA` |
| `tipo_alerta` | `PANICO`, `AUXILIO_MECANICO`, `OBSERVACION` |
| `tipo_combustible` | `DIESEL`, `GASOLINA`, `GNV`, `GLP`, `ELECTRICO`, `HIBRIDO` |
| `tipo_comprobante_combustible` | `BOLETA`, `FACTURA`, `TICKET`, `OTRO` |
| `tipo_evento_gps` | `MOVIMIENTO`, `DETENCION`, `EXCESO_VELOCIDAD`, `FUERA_RUTA`, `GPS_OFFLINE` |
| `tipo_mantenimiento` | `PREVENTIVO`, `CORRECTIVO`, `INSPECCION` |
| `tipo_registro_ubicacion` | `INICIO`, `FIN`, `ALERTA`, `TRACKING`, `COMBUSTIBLE` |
| `tipo_servicio_contrato` | `POR_VIAJE`, `POR_HORA`, `POR_TONELADA`, `POR_KM`, `MENSUAL` |

Observacion importante: para `gps_registros.estado`, el valor correcto de movimiento es `MOVIENDO`, no `MOVIMIENTO`. `MOVIMIENTO` existe como `tipo_evento_gps`, no como `estado_tracking`.

---

## 5. Diccionario de tablas

Esta seccion resume las columnas reales leidas desde PostgreSQL.

### `usuarios`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `cognito_sub` | `varchar` | No |
| `correo` | `varchar` | Si |
| `nombres` | `varchar` | Si |
| `apellidos` | `varchar` | Si |
| `rol` | `rol_usuario` | Si |
| `telefono` | `varchar` | No |
| `dni` | `varchar` | No |
| `activo` | `boolean` | Si |
| `estado` | `estado_usuario` | Si |
| `ultimo_acceso` | `timestamp` | No |
| `created_at` | `timestamp` | Si |
| `updated_at` | `timestamp` | Si |

### `login_intentos`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `email` | `varchar` | Si |
| `intentos_fallidos` | `integer` | Si |
| `ultimo_intento` | `timestamp` | No |
| `bloqueado_hasta` | `timestamp` | No |

### `password_reset_tokens`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `usuario_id` | `uuid` | No |
| `email` | `varchar` | Si |
| `token` | `varchar` | Si |
| `expira_at` | `timestamp` | Si |
| `usado` | `boolean` | Si |
| `usado_at` | `timestamp` | No |
| `created_at` | `timestamp` | Si |

### `sesiones_usuario`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `usuario_id` | `uuid` | Si |
| `access_token_jti` | `varchar` | No |
| `refresh_token_jti` | `varchar` | No |
| `expira_at` | `timestamp` | Si |
| `ultimo_evento_at` | `timestamp` | Si |
| `estado` | `estado_sesion` | Si |
| `created_at` | `timestamp` | Si |

### `auditoria_accesos`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `usuario_id` | `uuid` | No |
| `correo` | `varchar` | No |
| `rol` | `rol_usuario` | No |
| `accion` | `varchar` | Si |
| `resultado` | `resultado_auditoria` | Si |
| `ip_address` | `inet` | No |
| `user_agent` | `text` | No |
| `dispositivo` | `varchar` | No |
| `detalle` | `text` | No |
| `created_at` | `timestamp` | Si |

### `conductores`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `usuario_id` | `uuid` | Si |
| `fecha_nacimiento` | `date` | No |
| `direccion` | `varchar` | No |
| `fecha_ingreso` | `date` | No |
| `estado_operacional` | `estado_operacional_conductor` | Si |
| `current_shift_id` | `uuid` | No |
| `observaciones` | `text` | No |
| `created_at` | `timestamp` | Si |
| `updated_at` | `timestamp` | Si |

### `contactos_emergencia`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `conductor_id` | `uuid` | Si |
| `nombre` | `varchar` | Si |
| `telefono` | `varchar` | Si |
| `parentesco` | `varchar` | No |
| `es_principal` | `boolean` | Si |
| `created_at` | `timestamp` | Si |

### `licencias_conducir`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `conductor_id` | `uuid` | Si |
| `numero_licencia` | `varchar` | Si |
| `categoria` | `categoria_licencia` | Si |
| `fecha_emision` | `date` | No |
| `fecha_vencimiento` | `date` | Si |
| `autoridad_emisora` | `varchar` | No |
| `activa` | `boolean` | Si |
| `created_at` | `timestamp` | Si |
| `updated_at` | `timestamp` | Si |

### `conductores_historial`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `conductor_id` | `uuid` | Si |
| `accion` | `varchar` | Si |
| `campo` | `varchar` | No |
| `valor_anterior` | `text` | No |
| `valor_nuevo` | `text` | No |
| `detalle` | `text` | No |
| `usuario_id` | `uuid` | No |
| `ip_address` | `inet` | No |
| `created_at` | `timestamp` | Si |

### `gps_dispositivos`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `codigo_equipo` | `varchar` | Si |
| `proveedor` | `proveedor_gps` | Si |
| `imei` | `varchar` | No |
| `numero_sim` | `varchar` | No |
| `activo` | `boolean` | Si |
| `ultima_sincronizacion` | `timestamp` | No |
| `created_at` | `timestamp` | Si |
| `updated_at` | `timestamp` | Si |

### `unidades`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `placa` | `varchar` | Si |
| `marca` | `varchar` | No |
| `modelo` | `varchar` | No |
| `anio` | `integer` | No |
| `capacidad_ton` | `numeric` | No |
| `estado` | `estado_unidad` | Si |
| `gps_habilitado` | `boolean` | Si |
| `activo` | `boolean` | Si |
| `vin` | `varchar` | No |
| `color` | `varchar` | No |
| `tipo_combustible` | `tipo_combustible` | No |
| `fecha_registro` | `date` | No |
| `ultima_fecha_mantenimiento` | `date` | No |
| `proxima_fecha_mantenimiento` | `date` | No |
| `kilometraje_actual` | `numeric` | Si |
| `gps_device_id` | `uuid` | No |
| `notas` | `text` | No |
| `created_at` | `timestamp` | Si |
| `updated_at` | `timestamp` | Si |

### `camiones`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `bigint` | Si |
| `unidad_id` | `uuid` | No |
| `placa` | `varchar` | Si |
| `marca` | `varchar` | No |
| `modelo` | `varchar` | No |
| `estado` | `varchar` | Si |
| `created_at` | `timestamp` | Si |
| `updated_at` | `timestamp` | Si |

Observacion: esta tabla es legacy y los endpoints actuales de camiones la usan. Para los endpoints futuros de detalle tecnico completo conviene usar `unidades` o `vw_camiones_operativos`.

### `camion_mantenimientos`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `unidad_id` | `uuid` | Si |
| `tipo` | `tipo_mantenimiento` | Si |
| `fecha_programada` | `date` | No |
| `fecha_ejecutada` | `date` | No |
| `kilometraje` | `numeric` | No |
| `costo` | `numeric` | No |
| `proveedor_taller` | `varchar` | No |
| `observaciones` | `text` | No |
| `created_at` | `timestamp` | Si |
| `updated_at` | `timestamp` | Si |

### `asignaciones_conductor_unidad`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `conductor_id` | `uuid` | Si |
| `unidad_id` | `uuid` | Si |
| `fecha_inicio` | `timestamp` | Si |
| `fecha_fin` | `timestamp` | No |
| `estado` | `estado_asignacion` | Si |
| `creado_por` | `uuid` | No |
| `observaciones` | `text` | No |
| `created_at` | `timestamp` | Si |

### `contratos`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `codigo` | `varchar` | Si |
| `cliente` | `varchar` | Si |
| `ruc` | `varchar` | No |
| `descripcion` | `text` | No |
| `tipo_servicio` | `tipo_servicio_contrato` | Si |
| `fecha_inicio` | `date` | Si |
| `fecha_fin` | `date` | No |
| `tarifa` | `numeric` | No |
| `moneda` | `varchar` | Si |
| `estado` | `estado_contrato` | Si |
| `activo` | `boolean` | Si |
| `updated_by` | `uuid` | No |
| `created_at` | `timestamp` | Si |
| `updated_at` | `timestamp` | Si |

### `contrato_rutas`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `contrato_id` | `uuid` | Si |
| `origen` | `varchar` | Si |
| `destino` | `varchar` | Si |
| `distancia_estimada_km` | `numeric` | Si |
| `created_at` | `timestamp` | Si |

### `contrato_tarifas`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `contrato_id` | `uuid` | Si |
| `tarifa_base` | `numeric` | Si |
| `tarifa_por_km` | `numeric` | Si |
| `tarifa_por_hora` | `numeric` | Si |
| `tarifa_por_tonelada` | `numeric` | Si |
| `tarifa_espera` | `numeric` | Si |
| `total_referencial` | `numeric` | Si |
| `created_at` | `timestamp` | Si |

Validacion especifica:

| Columna | Tipo | Precision | Escala | Default | Nullable |
| --- | --- | --- | --- | --- | --- |
| `tarifa_por_tonelada` | `numeric` | 12 | 2 | `0` | No |

### `contrato_unidades`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `contrato_id` | `uuid` | Si |
| `unidad_id` | `uuid` | Si |
| `assigned_at` | `timestamp` | Si |
| `assigned_by` | `uuid` | No |
| `activo` | `boolean` | Si |

### `contratos_historial`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `contrato_id` | `uuid` | Si |
| `accion` | `varchar` | Si |
| `campo` | `varchar` | No |
| `valor_anterior` | `text` | No |
| `valor_nuevo` | `text` | No |
| `detalle` | `text` | No |
| `usuario_id` | `uuid` | No |
| `ip_address` | `inet` | No |
| `created_at` | `timestamp` | Si |

### `jornadas`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `codigo` | `varchar` | No |
| `conductor_id` | `uuid` | Si |
| `unidad_id` | `uuid` | Si |
| `contrato_id` | `uuid` | Si |
| `creado_por` | `uuid` | Si |
| `fecha_jornada` | `date` | Si |
| `hora_inicio_programada` | `timestamp` | No |
| `hora_fin_programada` | `timestamp` | No |
| `hora_inicio` | `timestamp` | No |
| `hora_fin` | `timestamp` | No |
| `origen` | `varchar` | No |
| `destino` | `varchar` | No |
| `km_estimados` | `numeric` | Si |
| `km_recorridos` | `numeric` | Si |
| `tipo_carga` | `varchar` | No |
| `peso_carga_ton` | `numeric` | No |
| `observaciones` | `varchar` | No |
| `observacion_admin` | `text` | No |
| `estado` | `estado_jornada` | Si |
| `created_at` | `timestamp` | Si |
| `updated_at` | `timestamp` | Si |

Observacion: para observaciones simples, la tabla soporta texto en `observaciones` y `observacion_admin`. Si se requiere historial de muchas observaciones por jornada, convendria una tabla adicional en una siguiente iteracion.

### `alertas_jornada`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `codigo` | `varchar` | No |
| `jornada_id` | `uuid` | Si |
| `tipo` | `tipo_alerta` | Si |
| `estado` | `estado_alerta_operativa` | Si |
| `severidad` | `severidad_alerta` | Si |
| `detalle` | `text` | No |
| `tipo_falla_mecanica` | `varchar` | No |
| `latitud` | `numeric` | Si |
| `longitud` | `numeric` | Si |
| `direccion` | `varchar` | No |
| `fecha_hora` | `timestamp` | Si |
| `atendida` | `boolean` | Si |
| `atendida_por` | `uuid` | No |
| `atendida_at` | `timestamp` | No |
| `detalle_resolucion` | `text` | No |
| `servicio_tecnico_realizado` | `text` | No |
| `telefono_contactado` | `varchar` | No |
| `bloqueo_sos_activo` | `boolean` | Si |
| `created_at` | `timestamp` | Si |

### `alertas_historial`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `alerta_id` | `uuid` | Si |
| `accion` | `varchar` | Si |
| `detalle` | `text` | No |
| `usuario_id` | `uuid` | No |
| `created_at` | `timestamp` | Si |

### `ubicaciones_jornada`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `jornada_id` | `uuid` | Si |
| `unidad_id` | `uuid` | No |
| `latitud` | `numeric` | Si |
| `longitud` | `numeric` | Si |
| `direccion` | `varchar` | No |
| `fecha_hora` | `timestamp` | Si |
| `tipo_registro` | `tipo_registro_ubicacion` | Si |
| `velocidad_kmh` | `numeric` | No |
| `rumbo` | `numeric` | No |
| `odometro_km` | `numeric` | No |
| `proveedor` | `proveedor_gps` | No |
| `created_at` | `timestamp` | Si |

### `gps_importaciones`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `proveedor` | `proveedor_gps` | Si |
| `nombre_archivo` | `varchar` | Si |
| `cargado_por` | `uuid` | No |
| `total_registros` | `integer` | Si |
| `registros_validos` | `integer` | Si |
| `registros_invalidos` | `integer` | Si |
| `estado` | `estado_importacion` | Si |
| `observaciones` | `text` | No |
| `created_at` | `timestamp` | Si |
| `processed_at` | `timestamp` | No |

### `gps_importacion_errores`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `importacion_id` | `uuid` | Si |
| `numero_fila` | `integer` | Si |
| `campo` | `varchar` | No |
| `valor_recibido` | `text` | No |
| `motivo_error` | `text` | Si |
| `raw_payload` | `jsonb` | No |
| `created_at` | `timestamp` | Si |

Validacion especifica:

- Filas seed cargadas: `2`
- FK hacia `gps_importaciones(id)` con `ON DELETE CASCADE`
- Indice: `idx_gps_importacion_errores_importacion`

### `gps_proveedor_formatos`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `proveedor` | `varchar` | Si |
| `nombre_formato` | `varchar` | Si |
| `mapeo_columnas` | `jsonb` | Si |
| `activo` | `boolean` | Si |
| `created_at` | `timestamp` | Si |
| `updated_at` | `timestamp` | Si |

Validacion especifica:

- Filas seed cargadas: `3`
- Constraint unica: `UNIQUE (proveedor, nombre_formato)`
- Trigger de actualizacion: `tg_gps_proveedor_formatos_updated_at`

### `gps_registros`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `importacion_id` | `uuid` | No |
| `unidad_id` | `uuid` | Si |
| `jornada_id` | `uuid` | No |
| `fecha_hora` | `timestamp` | Si |
| `latitud` | `numeric` | Si |
| `longitud` | `numeric` | Si |
| `velocidad_kmh` | `numeric` | No |
| `rumbo` | `numeric` | No |
| `odometro_km` | `numeric` | No |
| `estado` | `estado_tracking` | No |
| `proveedor` | `proveedor_gps` | Si |
| `raw_payload` | `jsonb` | No |
| `created_at` | `timestamp` | Si |

Validacion especifica:

- Filas seed cargadas: `7`
- Indice unico: `uq_gps_registros_proveedor_unidad_fecha`
- Definicion: `UNIQUE (proveedor, unidad_id, fecha_hora)`

Distribucion de estados:

| Estado | Total |
| --- | ---: |
| `DETENIDO` | 2 |
| `EXCESO_VELOCIDAD` | 1 |
| `MOVIENDO` | 4 |

### `gps_eventos`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `unidad_id` | `uuid` | Si |
| `jornada_id` | `uuid` | No |
| `tipo_evento` | `tipo_evento_gps` | Si |
| `estado` | `estado_alerta_operativa` | No |
| `fecha_hora_inicio` | `timestamp` | Si |
| `fecha_hora_fin` | `timestamp` | No |
| `velocidad_maxima` | `numeric` | No |
| `latitud` | `numeric` | No |
| `longitud` | `numeric` | No |
| `distancia_km` | `numeric` | No |
| `detalle` | `text` | No |
| `created_at` | `timestamp` | Si |

### `combustible_registros`

| Columna | Tipo | Requerida |
| --- | --- | --- |
| `id` | `uuid` | Si |
| `jornada_id` | `uuid` | No |
| `unidad_id` | `uuid` | Si |
| `conductor_id` | `uuid` | Si |
| `contrato_id` | `uuid` | No |
| `tipo_comprobante` | `tipo_comprobante_combustible` | No |
| `numero_comprobante` | `varchar` | No |
| `galones` | `numeric` | Si |
| `costo_total` | `numeric` | Si |
| `kilometraje_actual` | `numeric` | Si |
| `kilometraje_anterior` | `numeric` | No |
| `rendimiento_km_galon` | `numeric` | No |
| `foto_comprobante_url` | `text` | No |
| `observaciones` | `text` | No |
| `latitud` | `numeric` | No |
| `longitud` | `numeric` | No |
| `estado` | `estado_combustible` | Si |
| `sincronizado` | `boolean` | Si |
| `registrado_at` | `timestamp` | Si |
| `created_at` | `timestamp` | Si |

---

## 6. Indices y constraints relevantes

Indices principales verificados:

| Indice | Tabla | Proposito |
| --- | --- | --- |
| `idx_usuarios_rol` | `usuarios` | Filtro por rol |
| `idx_usuarios_estado` | `usuarios` | Filtro por estado |
| `idx_sesiones_usuario` | `sesiones_usuario` | Busqueda de sesiones por usuario |
| `idx_sesiones_estado` | `sesiones_usuario` | Filtro por estado de sesion |
| `idx_reset_email` | `password_reset_tokens` | Recuperacion por email |
| `idx_auditoria_usuario` | `auditoria_accesos` | Auditoria por usuario |
| `idx_auditoria_fecha` | `auditoria_accesos` | Auditoria por fecha |
| `idx_conductores_estado_operacional` | `conductores` | Selectores de conductores disponibles |
| `idx_unidades_estado` | `unidades` | Selectores y panel de flota |
| `idx_unidades_gps_device` | `unidades` | Relacion con GPS |
| `idx_camiones_unidad_id` | `camiones` | Relacion legacy con unidades |
| `idx_camiones_estado` | `camiones` | Filtro legacy de camiones |
| `idx_mantenimientos_unidad` | `camion_mantenimientos` | Historial por unidad |
| `idx_contratos_estado` | `contratos` | Filtro por estado de contrato |
| `idx_contratos_tipo_servicio` | `contratos` | Reportes por tipo de servicio |
| `idx_jornadas_fecha` | `jornadas` | Reportes por fecha |
| `idx_jornadas_estado` | `jornadas` | Filtro por estado |
| `idx_jornadas_conductor` | `jornadas` | Jornadas por conductor |
| `idx_jornadas_unidad` | `jornadas` | Jornadas por unidad |
| `idx_jornadas_contrato` | `jornadas` | Jornadas por contrato |
| `idx_alertas_jornada` | `alertas_jornada` | Alertas por jornada |
| `idx_alertas_tipo` | `alertas_jornada` | Alertas por tipo |
| `idx_alertas_estado` | `alertas_jornada` | Alertas por estado |
| `idx_alertas_fecha_hora` | `alertas_jornada` | Alertas por fecha/hora |
| `idx_ubicaciones_jornada` | `ubicaciones_jornada` | Ubicaciones por jornada |
| `idx_ubicaciones_unidad` | `ubicaciones_jornada` | Ubicaciones por unidad |
| `idx_ubicaciones_fecha_hora` | `ubicaciones_jornada` | Tracking por fecha/hora |
| `idx_gps_importacion_errores_importacion` | `gps_importacion_errores` | Errores por importacion |
| `idx_gps_registros_unidad` | `gps_registros` | GPS por unidad |
| `idx_gps_registros_jornada` | `gps_registros` | GPS por jornada |
| `idx_gps_registros_fecha_hora` | `gps_registros` | GPS por fecha/hora |
| `idx_gps_eventos_unidad` | `gps_eventos` | Eventos por unidad |
| `idx_gps_eventos_jornada` | `gps_eventos` | Eventos por jornada |
| `idx_gps_eventos_tipo` | `gps_eventos` | Eventos por tipo |
| `idx_combustible_unidad` | `combustible_registros` | Combustible por unidad |
| `idx_combustible_conductor` | `combustible_registros` | Combustible por conductor |
| `idx_combustible_jornada` | `combustible_registros` | Combustible por jornada |

Constraints unicas relevantes:

| Constraint/indice | Tabla | Regla |
| --- | --- | --- |
| `uq_asignacion_activa_conductor` | `asignaciones_conductor_unidad` | Un conductor no debe tener mas de una asignacion activa |
| `uq_asignacion_activa_unidad` | `asignaciones_conductor_unidad` | Una unidad no debe tener mas de una asignacion activa |
| `uq_contrato_unidad_activa` | `contrato_unidades` | Evita duplicar una unidad activa en el mismo contrato |
| `uq_jornada_activa_unidad` | `jornadas` | Evita mas de una jornada activa por unidad |
| `uq_jornada_activa_chofer` | `jornadas` | Evita mas de una jornada activa por chofer |
| `uq_gps_registros_proveedor_unidad_fecha` | `gps_registros` | Evita duplicados GPS por proveedor, unidad y fecha/hora |
| `uq_gps_proveedor_formato` | `gps_proveedor_formatos` | Evita duplicar formato por proveedor y nombre |

---

## 7. Seed validado

Conteos aproximados de filas en `nanutech_local` despues de aplicar el seed:

| Tabla | Filas |
| --- | ---: |
| `usuarios` | 5 |
| `conductores` | 3 |
| `unidades` | 3 |
| `camiones` | 3 |
| `contratos` | 3 |
| `contrato_rutas` | 3 |
| `contrato_tarifas` | 3 |
| `contrato_unidades` | 3 |
| `jornadas` | 3 |
| `gps_dispositivos` | 3 |
| `gps_importaciones` | 2 |
| `gps_importacion_errores` | 2 |
| `gps_proveedor_formatos` | 3 |
| `gps_registros` | 7 |
| `gps_eventos` | 3 |
| `combustible_registros` | 1 |
| `auditoria_accesos` | 3 |
| `alertas_jornada` | 2 |
| `alertas_historial` | 2 |
| `camion_mantenimientos` | 2 |
| `ubicaciones_jornada` | 4 |
| `sesiones_usuario` | 2 |
| `login_intentos` | 1 |
| `password_reset_tokens` | 1 |

El seed incluye datos suficientes para probar:

- Usuarios por rol.
- Conductores disponibles/en ruta.
- Unidades disponibles/en jornada/mantenimiento.
- Contratos vigentes.
- Contrato por tonelada.
- Jornadas registradas/en proceso/completadas.
- GPS con movimiento, detenido y exceso de velocidad.
- Importacion GPS con errores de fila.
- Formatos de proveedores GPS.
- Combustible.
- Auditoria de accesos.
- Alertas operativas.

---

## 8. Prueba de inicializacion desde cero

Para no tocar la base real `nanutech_local`, se creo una base temporal con nombre similar a:

```txt
nanutech_tmp_codex_<timestamp>
```

Luego se ejecuto:

```powershell
node scripts\db-init-local.mjs
```

Resultado:

```txt
==> Inicializando base local para HU01
==> Limpiando esquema previo
==> Aplicando schema
==> Aplicando seed
==> Base local inicializada correctamente
```

Validacion posterior:

| Verificacion | Resultado |
| --- | --- |
| Tablas creadas | 29 |
| Usuarios cargados | 5 |
| Camiones cargados | 3 |
| Contratos cargados | 3 |
| GPS registros cargados | 7 |
| Errores importacion GPS cargados | 2 |
| Formatos proveedor GPS cargados | 3 |

La base temporal fue eliminada al terminar la prueba.

---

## 9. Endpoints implementados actualmente en codigo

El codigo actual no tiene todavia las 60-70 rutas propuestas. Estas son las rutas realmente implementadas en los handlers:

### Auth

| Metodo | Ruta | Handler |
| --- | --- | --- |
| `POST` | `/auth/login` | `src/functions/auth-services/authHandler.mjs` |
| `GET` | `/auth/me` | `src/functions/auth-services/authHandler.mjs` |
| `POST` | `/auth/forgot-password` | `src/functions/auth-services/authHandler.mjs` |
| `POST` | `/auth/forgot-password/confirm` | `src/functions/auth-services/authHandler.mjs` |

Observaciones:

- El contrato propuesto por frontend usa `correo`, `codigo`, `nuevaPassword`.
- El backend actual espera `email`, `code`, `newPassword`.
- El auth local actual usa usuarios en memoria, no PostgreSQL.
- En modo Cognito si usa PostgreSQL para resolver perfil interno.
- No existen todavia `/auth/logout` ni `/auth/refresh`.

### Jornadas

| Metodo | Ruta | Handler |
| --- | --- | --- |
| `POST` | `/jornadas` | `src/functions/jornada-services/jornadaHandler.mjs` |
| `GET` | `/jornadas` | `src/functions/jornada-services/jornadaHandler.mjs` |
| `GET` | `/jornadas/actual/{conductorId}` | `src/functions/jornada-services/jornadaHandler.mjs` |
| `POST` | `/jornadas/iniciar` | `src/functions/jornada-services/jornadaHandler.mjs` |
| `POST` | `/jornadas/finalizar` | `src/functions/jornada-services/jornadaHandler.mjs` |

Observaciones:

- Las rutas futuras proponen `/jornadas/{jornadaId}/iniciar-turno` y `/jornadas/{jornadaId}/finalizar-turno`.
- El backend actual usa body con `jornada_id` para iniciar/finalizar.
- No existen todavia resumen, selectores, seguimiento, detalle por ID, observaciones, export CSV ni endpoints de chofer.

### Camiones

| Metodo | Ruta | Handler |
| --- | --- | --- |
| `GET` | `/camiones` | `src/functions/camion-services/camionHandler.mjs` |
| `GET` | `/camiones/{id}` | `src/functions/camion-services/camionHandler.mjs` |

Observaciones:

- El backend actual usa tabla legacy `camiones`.
- Para los endpoints futuros tecnicos conviene migrar consultas a `unidades` o `vw_camiones_operativos`.
- No existen todavia PATCH, POST, export, GPS por camion ni mantenimientos.

### Conductores

| Metodo | Ruta | Handler |
| --- | --- | --- |
| `GET` | `/conductores` | `src/functions/conductor-services/conductorHandler.mjs` |

### Unidades

| Metodo | Ruta | Handler |
| --- | --- | --- |
| `GET` | `/unidades/disponibles` | `src/functions/unidad-services/unidadHandler.mjs` |

### Contratos

| Metodo | Ruta | Handler |
| --- | --- | --- |
| `GET` | `/contratos/vigentes` | `src/functions/contrato-services/contratoHandler.mjs` |

Observaciones:

- La base soporta el modulo completo de contratos, pero el backend aun solo expone vigentes.

---

## 10. Pruebas de endpoints/handlers realizadas

Las pruebas se ejecutaron contra `nanutech_local`, usando los handlers reales del proyecto. No se uso servidor HTTP externo; se invocaron handlers Lambda localmente con eventos equivalentes.

### 10.1 `GET /camiones`

Evento:

```json
{
  "httpMethod": "GET",
  "resource": "/camiones"
}
```

Resultado:

| Campo | Valor |
| --- | --- |
| statusCode | 200 |
| success | true |
| message | `Camiones obtenidos exitosamente` |
| registros devueltos | 3 |

Consulta observada:

```sql
SELECT id, placa, marca, modelo, estado
FROM camiones
ORDER BY id;
```

### 10.2 `GET /conductores`

Evento:

```json
{
  "httpMethod": "GET",
  "resource": "/conductores"
}
```

Resultado:

| Campo | Valor |
| --- | --- |
| statusCode | 200 |
| success | true |
| message | `Conductores obtenidos exitosamente` |
| registros devueltos | 3 |

### 10.3 `GET /unidades/disponibles`

Evento:

```json
{
  "httpMethod": "GET",
  "resource": "/unidades/disponibles"
}
```

Resultado:

| Campo | Valor |
| --- | --- |
| statusCode | 200 |
| success | true |
| message | `Unidades disponibles obtenidas exitosamente` |
| registros devueltos | 1 |

Consulta observada:

```sql
SELECT id, placa, marca, modelo, anio,
       capacidad_ton, estado, activo
FROM unidades
WHERE activo = TRUE
  AND estado = 'DISPONIBLE'
ORDER BY placa;
```

### 10.4 `GET /contratos/vigentes`

Evento:

```json
{
  "httpMethod": "GET",
  "resource": "/contratos/vigentes"
}
```

Resultado:

| Campo | Valor |
| --- | --- |
| statusCode | 200 |
| success | true |
| message | `Contratos obtenidos exitosamente` |
| registros devueltos | 3 |

Consulta observada:

```sql
SELECT id, codigo, cliente, descripcion,
       fecha_inicio, fecha_fin, tarifa, moneda, estado, activo
FROM contratos
WHERE activo = TRUE
  AND estado = 'VIGENTE'
  AND fecha_inicio <= CURRENT_DATE
  AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
ORDER BY cliente;
```

### 10.5 `GET /jornadas`

Evento:

```json
{
  "httpMethod": "GET",
  "resource": "/jornadas"
}
```

Resultado:

| Campo | Valor |
| --- | --- |
| statusCode | 200 |
| success | true |
| message | `Jornadas obtenidas exitosamente.` |
| registros devueltos | 3 |

---

## 11. Pruebas de auth local

Comando:

```powershell
node scripts\smoke-auth-local.mjs --mode=local
```

Resultado:

| Flujo | Status | Resultado |
| --- | ---: | --- |
| `POST /auth/login` local | 200 | OK |
| `GET /auth/me` local | 200 | OK |
| `POST /auth/forgot-password` local | 200 | OK |
| Confirmacion de recuperacion local | 200 | OK |
| Relogin local | 200 | OK |

Observacion importante:

El smoke de auth local usa el proveedor `local`, con usuarios en memoria. Es util para comprobar que la Lambda de auth responde, pero no valida la tabla `usuarios` de PostgreSQL para login local. Para validar usuarios reales en nube se debe usar Cognito o adaptar auth local a la base.

---

## 12. Tests automatizados

Comando:

```powershell
npm test
```

Resultado:

| Item | Resultado |
| --- | --- |
| Test suites | 15 passed |
| Tests | 60 passed |
| Snapshots | 0 |
| Estado general | OK |

Notas:

- Los tests de integracion de camiones usan helper de pruebas.
- Los tests unitarios cubren auth, jornadas, contratos, conductores, unidades y camiones.
- Se observo un `console.error` esperado en una prueba de jornada ya iniciada; la prueba pasa y valida el error esperado.

---

## 13. Pruebas de build y nube

### 13.1 `sam build`

Comando:

```powershell
sam build
```

Resultado:

| Item | Resultado |
| --- | --- |
| Build SAM | OK |
| Artefactos | `.aws-sam/build` |
| Template generado | `.aws-sam/build/template.yaml` |

Advertencias no bloqueantes:

- SAM intento crear enlaces simbolicos.
- Al no tener privilegios/configuracion suficiente para symlinks en Windows, uso copia de archivos.
- Esto no rompio el build.

### 13.2 `sam validate`

Comando:

```powershell
sam validate
```

Resultado:

| Item | Resultado |
| --- | --- |
| Validacion SAM | Falla |
| Causa | Runtime Lambda `nodejs20.x` deprecado |
| Archivo | `template.yaml` |
| Linea principal | `Globals.Function.Runtime` |

Mensaje observado:

```txt
Runtime 'nodejs20.x' was deprecated on '2026-04-30'.
Please consider updating to 'nodejs24.x'
```

En `template.yaml`:

```yaml
Globals:
  Function:
    Runtime: nodejs20.x
```

Al estar en `Globals.Function`, todas las Lambdas heredan ese runtime:

- `JornadaFunction`
- `CamionFunction`
- `ConductorFunction`
- `ContratoFunction`
- `UnidadFunction`
- `AuthFunction`
- `MigratorFunction`

Recomendacion para nube:

1. Cambiar `Runtime: nodejs20.x` a `Runtime: nodejs24.x`.
2. Ejecutar `npm test`.
3. Ejecutar `sam build`.
4. Ejecutar `sam validate`.
5. Probar en ambiente testing/staging antes de produccion.

---

## 14. Consultas de soporte para endpoints futuros

Aunque varios endpoints todavia no existen como codigo, se simularon consultas SQL para validar si la base los soporta.

### 14.1 Resumen de jornadas

Endpoint futuro relacionado:

```txt
GET /jornadas/resumen
```

Consulta usada:

```sql
SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (
    WHERE estado IN ('REGISTRADA', 'PENDIENTE', 'EN_PROCESO')
  )::int AS activas,
  COUNT(*) FILTER (WHERE estado = 'COMPLETADA')::int AS completadas,
  COALESCE(SUM(km_recorridos), 0)::numeric AS km_acumulados
FROM jornadas;
```

Resultado:

| total | activas | completadas | km_acumulados |
| ---: | ---: | ---: | ---: |
| 3 | 2 | 1 | 646.20 |

Conclusion: la base soporta este endpoint.

### 14.2 Resumen de contratos

Endpoint futuro relacionado:

```txt
GET /contratos/resumen
```

Consulta usada:

```sql
SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE estado = 'VIGENTE')::int AS activos,
  COUNT(*) FILTER (WHERE fecha_fin < CURRENT_DATE)::int AS vencidos,
  COUNT(DISTINCT unidad_id)::int AS camiones_asignados
FROM contratos c
LEFT JOIN contrato_unidades cu
  ON cu.contrato_id = c.id
 AND cu.activo;
```

Resultado:

| total | activos | vencidos | camiones_asignados |
| ---: | ---: | ---: | ---: |
| 3 | 3 | 0 | 3 |

Conclusion: la base soporta este endpoint.

### 14.3 Resumen GPS

Endpoint futuro relacionado:

```txt
GET /gps/resumen
```

Consulta usada:

```sql
SELECT
  COUNT(*)::int AS total_registros,
  COUNT(DISTINCT unidad_id) FILTER (WHERE estado = 'MOVIENDO')::int AS unidades_movimiento,
  COUNT(DISTINCT unidad_id) FILTER (WHERE estado = 'DETENIDO')::int AS unidades_detenidas,
  ROUND(AVG(velocidad_kmh), 2)::numeric AS velocidad_promedio
FROM gps_registros;
```

Resultado:

| total_registros | unidades_movimiento | unidades_detenidas | velocidad_promedio |
| ---: | ---: | ---: | ---: |
| 7 | 2 | 2 | 40.57 |

Conclusion: la base soporta este endpoint. Se debe usar `MOVIENDO`, no `MOVIMIENTO`, para estado de tracking.

### 14.4 Resumen de combustible

Endpoint futuro relacionado:

```txt
GET /combustible/resumen
```

Consulta usada:

```sql
SELECT
  COALESCE(SUM(galones), 0)::numeric AS galones,
  COALESCE(SUM(costo_total), 0)::numeric AS costo,
  ROUND(AVG(rendimiento_km_galon), 2)::numeric AS rendimiento_promedio,
  COUNT(*)::int AS abastecimientos
FROM combustible_registros;
```

Resultado:

| galones | costo | rendimiento_promedio | abastecimientos |
| ---: | ---: | ---: | ---: |
| 18.50 | 420.00 | 6.49 | 1 |

Conclusion: la base soporta el endpoint.

### 14.5 Resumen de auditoria

Endpoint futuro relacionado:

```txt
GET /auditoria/accesos/resumen
```

Consulta usada:

```sql
SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE resultado = 'EXITOSO')::int AS exitosos,
  COUNT(*) FILTER (WHERE resultado = 'FALLIDO')::int AS fallidos,
  COUNT(*) FILTER (WHERE accion ILIKE '%bloque%')::int AS bloqueos
FROM auditoria_accesos;
```

Resultado:

| total | exitosos | fallidos | bloqueos |
| ---: | ---: | ---: | ---: |
| 3 | 3 | 0 | 0 |

Conclusion: la base soporta el endpoint.

### 14.6 Dashboard resumen

Endpoint futuro relacionado:

```txt
GET /dashboard/ejecutivo/resumen
```

Consulta usada:

```sql
SELECT *
FROM vw_dashboard_resumen;
```

Resultado:

| total_camiones | camiones_en_uso | camiones_disponibles | camiones_mantenimiento | total_conductores | conductores_en_ruta | contratos_activos | jornadas_activas | alertas_activas | km_totales_operados |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3 | 1 | 1 | 1 | 3 | 1 | 3 | 2 | 1 | 525.40 |

Conclusion: la base soporta un resumen inicial del dashboard ejecutivo.

### 14.7 Proveedores GPS

Endpoint futuro relacionado:

```txt
GET /gps/proveedores
GET /catalogos/proveedores-gps
```

Consulta usada:

```sql
SELECT proveedor, COUNT(*)::int AS formatos
FROM gps_proveedor_formatos
WHERE activo
GROUP BY proveedor
ORDER BY proveedor;
```

Resultado:

| proveedor | formatos |
| --- | ---: |
| `GLOBALGPS` | 1 |
| `GPSCONTROL` | 2 |

Conclusion: la base soporta catalogo de proveedores GPS configurados.

### 14.8 Catalogo de conductores

Endpoint futuro relacionado:

```txt
GET /catalogos/conductores
```

Consulta usada:

```sql
SELECT COUNT(*)::int AS total
FROM vw_conductores_full
WHERE rol = 'CHOFER'
  AND estado_usuario = 'ACTIVO';
```

Resultado:

| total |
| ---: |
| 3 |

Conclusion: la base soporta selectores de conductores.

### 14.9 Seguimiento de jornadas

Endpoint futuro relacionado:

```txt
GET /jornadas/seguimiento
```

Consulta usada:

```sql
SELECT COUNT(*)::int AS total
FROM vw_seguimiento_jornadas;
```

Resultado:

| total |
| ---: |
| 3 |

Conclusion: la base soporta seguimiento de jornadas.

### 14.10 Tracking GPS

Endpoint futuro relacionado:

```txt
GET /gps/registros
GET /gps/tiempo-real
```

Consulta usada:

```sql
SELECT COUNT(*)::int AS total
FROM vw_tracking_gps;
```

Resultado:

| total |
| ---: |
| 7 |

Conclusion: la base soporta consultas de tracking GPS.

---

## 15. Revision de endpoints futuros por modulo

### 15.1 Auth y usuarios

Endpoints propuestos:

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/logout`
- `POST /auth/refresh`

Estado:

| Endpoint | Base soporta | Codigo existe | Observacion |
| --- | --- | --- | --- |
| `POST /auth/login` | Parcial | Si | Local usa memoria; Cognito resuelve perfil interno en BD |
| `GET /auth/me` | Parcial | Si | Local devuelve datos del token; Cognito cruza con BD |
| `POST /auth/forgot-password` | Si | Si | Codigo espera `email` |
| `POST /auth/reset-password` | Si | No con ese nombre | Existe `/auth/forgot-password/confirm` |
| `POST /auth/logout` | Si | No | Requiere actualizar `sesiones_usuario` |
| `POST /auth/refresh` | Si | No | Requiere flujo de refresh token |

Brechas:

- Alinear nombres de body: `correo` vs `email`.
- Definir si auth local debe usar PostgreSQL o seguir como fallback en memoria.
- Implementar logout y refresh si frontend los necesita.
- Registrar auditoria real de accesos en `auditoria_accesos`.

### 15.2 Jornadas laborales

Endpoints propuestos:

- `GET /jornadas/resumen`
- `GET /jornadas`
- `POST /jornadas`
- `GET /jornadas/selectores/conductores`
- `GET /jornadas/selectores/unidades`
- `GET /jornadas/selectores/contratos`
- `GET /chofer/jornada-actual`
- `POST /jornadas/{jornadaId}/iniciar-turno`
- `POST /jornadas/{jornadaId}/finalizar-turno`
- `GET /chofer/resumen-mensual`
- `POST /jornadas/{jornadaId}/observaciones`
- `GET /jornadas/{jornadaId}/observaciones`
- `GET /jornadas/seguimiento`
- `GET /jornadas/{jornadaId}`
- `GET /jornadas/{jornadaId}/detalle-observacion`
- `GET /jornadas/export.csv`

Estado:

| Endpoint | Base soporta | Codigo existe | Observacion |
| --- | --- | --- | --- |
| `GET /jornadas/resumen` | Si | No | Agregacion sobre `jornadas` |
| `GET /jornadas` | Si | Si | Actual sin filtros/paginacion completa |
| `POST /jornadas` | Si | Si | Actual cubre registro basico |
| Selectores | Si | Parcial | Existe `GET /unidades/disponibles`; faltan rutas especificas |
| `GET /chofer/jornada-actual` | Si | No | Puede basarse en token + `jornadas` |
| Iniciar/finalizar por path | Si | No con esa ruta | Existe iniciar/finalizar por body |
| Observaciones | Parcial | No | Texto existe en `jornadas`; no historial multiple |
| Seguimiento | Si | No | Existe `vw_seguimiento_jornadas` |
| Export CSV | Si | No | Requiere formato de respuesta CSV |

Brechas:

- Implementar filtros y paginacion.
- Definir contrato exacto para observaciones: simple texto o historial.
- Alinear rutas REST finales con frontend.

### 15.3 Contratos comerciales

Endpoints propuestos:

- `GET /contratos/resumen`
- `GET /contratos/grafica`
- `GET /contratos`
- `GET /contratos/{contratoId}`
- `PATCH /contratos/{contratoId}`
- `GET /contratos/{contratoId}/tarifas`
- `PATCH /contratos/{contratoId}/tarifas`
- `GET /contratos/{contratoId}/unidades`
- `POST /contratos/{contratoId}/unidades`
- `DELETE /contratos/{contratoId}/unidades/{unidadId}`
- `GET /contratos/{contratoId}/historial`
- `PATCH /contratos/{contratoId}/estado`
- `POST /contratos`
- `POST /contratos/calcular-tarifa`
- `GET /contratos/validar-codigo`
- `GET /contratos/validar-ruc`

Estado:

| Endpoint | Base soporta | Codigo existe | Observacion |
| --- | --- | --- | --- |
| `GET /contratos/vigentes` | Si | Si | Implementado |
| `GET /contratos` completo | Si | No | Requiere filtros/paginacion |
| Detalle por ID | Si | No | Tablas listas |
| Tarifas | Si | No | Incluye `tarifa_por_tonelada` |
| Unidades por contrato | Si | No | `contrato_unidades` listo |
| Historial | Si | No | `contratos_historial` listo |
| Calcular tarifa | Si | No | Puede ser logica de servicio sin escribir BD |

Brechas:

- Implementar repositorios/controladores.
- Registrar cambios en `contratos_historial`.
- Definir calculo de `total_referencial` por tipo de servicio.

### 15.4 GPS e importaciones

Endpoints propuestos:

- `GET /gps/resumen`
- `GET /gps/proveedores`
- `GET /gps/plantilla`
- `POST /gps/importaciones`
- `GET /gps/importaciones/{importacionId}`
- `GET /gps/importaciones/{importacionId}/errores`
- `GET /gps/registros`
- `GET /gps/unidades-estado`
- `GET /gps/eventos`
- `GET /gps/eventos/resumen`
- `GET /gps/eventos/{eventoId}`
- `GET /gps/tiempo-real`

Estado:

| Endpoint | Base soporta | Codigo existe | Observacion |
| --- | --- | --- | --- |
| Resumen GPS | Si | No | Consulta validada |
| Proveedores | Si | No | Usa `gps_proveedor_formatos` |
| Plantilla | Si | No | Puede generarse desde `mapeo_columnas` |
| Importaciones | Si | No | Tablas listas |
| Errores de importacion | Si | No | Tabla nueva lista |
| Registros GPS | Si | No | Indices listos |
| Unidades estado | Si | No | Puede usar `vw_tracking_gps` + `unidades` |
| Eventos GPS | Si | No | `gps_eventos` listo |
| Tiempo real | Si | No | Requiere ultima ubicacion por unidad |

Brechas:

- Implementar parser CSV/Excel o definir si solo CSV.
- Cuidar duplicados con `uq_gps_registros_proveedor_unidad_fecha`.
- Usar `MOVIENDO`, `DETENIDO`, `EXCESO_VELOCIDAD` para `estado_tracking`.

### 15.5 Camiones/unidades

Endpoints propuestos:

- `GET /camiones/{unidadId}`
- `PATCH /camiones/{unidadId}`
- `GET /camiones/{unidadId}/jornadas`
- `GET /camiones/{unidadId}/gps/ultimo`
- `GET /camiones/{unidadId}/gps/registros`
- `GET /camiones/{unidadId}/mantenimientos`
- `GET /camiones/resumen`
- `GET /camiones/movimiento-resumen`
- `GET /camiones`
- `POST /camiones`
- `GET /camiones/export.csv`

Estado:

| Endpoint | Base soporta | Codigo existe | Observacion |
| --- | --- | --- | --- |
| `GET /camiones` simple | Parcial | Si | Usa tabla legacy `camiones` |
| `GET /camiones/{id}` simple | Parcial | Si | Usa tabla legacy `camiones` |
| Detalle tecnico | Si | No | Debe usar `unidades` o `vw_camiones_operativos` |
| GPS ultimo/historial | Si | No | Usa `gps_registros` |
| Mantenimientos | Si | No | Usa `camion_mantenimientos` |
| Resumen | Si | No | Usa `unidades` |
| Movimiento resumen | Si | No | Usa `gps_registros` |
| Crear/actualizar | Si | No | Debe escribir en `unidades` y opcional legacy |

Brechas:

- Decidir si `camiones` queda como legacy o si endpoints nuevos usaran `unidades`.
- Evitar duplicar logica entre `camiones` y `unidades`.

### 15.6 Combustible

Endpoints propuestos:

- `GET /combustible/registros`
- `POST /combustible/registros`
- `GET /combustible/resumen`
- `GET /combustible/registros/{registroId}`

Estado:

| Endpoint | Base soporta | Codigo existe | Observacion |
| --- | --- | --- | --- |
| Lista | Si | No | Tabla lista con indices |
| Crear | Si | No | Puede calcular rendimiento km/galon |
| Resumen | Si | No | Consulta validada |
| Detalle | Si | No | Tabla lista |

Brechas:

- Definir validaciones de kilometraje.
- Definir si `rendimiento_km_galon` se calcula en backend o trigger.

### 15.7 Auditoria

Endpoints propuestos:

- `GET /auditoria/accesos`
- `GET /auditoria/accesos/resumen`
- `GET /auditoria/accesos/export.csv`

Estado:

| Endpoint | Base soporta | Codigo existe | Observacion |
| --- | --- | --- | --- |
| Lista | Si | No | Tabla lista |
| Resumen | Si | No | Consulta validada |
| Export CSV | Si | No | Requiere respuesta CSV |

Brechas:

- El flujo actual de auth no registra todos los eventos reales en `auditoria_accesos`.
- Implementar logging de accesos exitosos/fallidos/bloqueos.

### 15.8 Dashboard ejecutivo y gerencial

Endpoints propuestos:

- `GET /dashboard/ejecutivo/resumen`
- `GET /dashboard/ejecutivo/alertas`
- `GET /dashboard/ejecutivo/gps-estados`
- `GET /dashboard/ejecutivo/camiones`
- `GET /dashboard/ejecutivo/contratos`
- `GET /dashboard/gerencial/resumen`
- `GET /dashboard/gerencial/series`
- `GET /dashboard/gerencial/operaciones`
- `GET /dashboard/gerencial/rendimiento`
- `GET /dashboard/gerencial/historial`

Estado:

| Endpoint | Base soporta | Codigo existe | Observacion |
| --- | --- | --- | --- |
| Ejecutivo resumen | Si | No | `vw_dashboard_resumen` validada |
| Alertas | Si | No | `vw_alertas_panel` lista |
| GPS estados | Si | No | `gps_registros` listo |
| Camiones | Si | No | `vw_camiones_operativos` lista |
| Contratos | Si | No | Contratos y unidades listos |
| Gerencial resumen | Si | No | Requiere agregaciones |
| Series | Si | No | `jornadas` por fecha |
| Operaciones | Si | No | Jornadas, unidades y conductores |
| Rendimiento | Si | No | Jornadas + GPS + unidades |
| Historial | Si | No | `vw_seguimiento_jornadas` lista |

Brechas:

- Implementar servicios de agregacion.
- Definir rango de fechas y defaults.
- Definir si se usaran vistas existentes o consultas directas.

### 15.9 Catalogos

Endpoints propuestos:

- `GET /catalogos/conductores`
- `GET /catalogos/unidades`
- `GET /catalogos/contratos`
- `GET /catalogos/proveedores-gps`

Estado:

| Endpoint | Base soporta | Codigo existe | Observacion |
| --- | --- | --- | --- |
| Conductores | Si | No | `vw_conductores_full` |
| Unidades | Si | Parcial | Existe `/unidades/disponibles` |
| Contratos | Si | Parcial | Existe `/contratos/vigentes` |
| Proveedores GPS | Si | No | `gps_proveedor_formatos` |

Brechas:

- Crear `catalogo-services` o reutilizar servicios por dominio.
- Evitar duplicar logica con selectores de jornadas.

---

## 16. Riesgos y observaciones tecnicas

### 16.1 Runtime Lambda deprecado

Riesgo: `sam validate` falla porque `nodejs20.x` esta deprecado desde el 2026-04-30.

Impacto:

- Puede bloquear CI/CD.
- Puede bloquear nuevos despliegues si la politica de validacion se mantiene estricta.
- Afecta a todas las Lambdas porque el runtime esta en `Globals.Function`.

Accion recomendada:

- Migrar a `nodejs24.x`.
- Validar `npm test`, `sam build`, `sam validate`.
- Probar en ambiente testing antes de produccion.

### 16.2 Auth local no usa PostgreSQL

Riesgo: el modo local de auth usa un arreglo en memoria.

Impacto:

- `POST /auth/login` local no valida usuarios reales de la tabla `usuarios`.
- El contrato futuro de auditoria de accesos no queda completo si se mantiene asi.

Accion recomendada:

- Definir si el modo local seguira siendo fallback simple.
- Si frontend necesita auth real contra BD local, implementar repositorio PostgreSQL para auth local.

### 16.3 Diferencia de nombres en contrato de Auth

El frontend propuesto usa:

```json
{
  "correo": "usuario@correo.com",
  "password": "..."
}
```

El backend actual espera:

```json
{
  "email": "usuario@correo.com",
  "password": "..."
}
```

Accion recomendada:

- Aceptar ambos nombres temporalmente.
- O acordar un contrato unico entre frontend y backend.

### 16.4 `camiones` legacy vs `unidades`

La base moderna usa `unidades`, pero los endpoints actuales de camiones consultan `camiones`.

Impacto:

- `GET /camiones` actual devuelve pocos campos.
- Los endpoints futuros de detalle tecnico requieren `unidades`.

Accion recomendada:

- Reorientar endpoints nuevos de camiones hacia `unidades`/`vw_camiones_operativos`.
- Mantener `camiones` solo como compatibilidad si frontend viejo lo necesita.

### 16.5 Observaciones de jornada

La tabla `jornadas` permite guardar observaciones simples.

Impacto:

- Sirve para `POST /jornadas/{jornadaId}/observaciones` si solo se guarda un texto actual.
- No sirve para historial de multiples observaciones con fecha/usuario.

Accion recomendada:

- Si la HU exige historial real, crear una tabla `jornada_observaciones` en una migracion futura.
- Si solo se necesita campo editable, usar `jornadas.observaciones` y `jornadas.observacion_admin`.

### 16.6 Importacion GPS

La base ya tiene:

- Cabecera de importacion.
- Errores por fila/campo.
- Formatos por proveedor.
- Unicidad para duplicados GPS.

Pendiente:

- Implementar parser CSV/Excel.
- Decidir si la carga masiva sera Lambda directa, S3 + Lambda, o API con multipart.
- Definir limites de tamano de archivo.

---

## 17. Comandos para reproducir validaciones

### 17.1 Variables locales

```powershell
$env:DB_HOST="localhost"
$env:DB_USER="postgres"
$env:DB_PASSWORD="<tu password>"
$env:DB_NAME="nanutech_local"
$env:DB_PORT="5432"
$env:DB_SSL_ENABLED="false"
```

### 17.2 Reiniciar base local

Advertencia: comando destructivo para la base apuntada por `DB_NAME`.

```powershell
node scripts\db-init-local.mjs
```

### 17.3 Ejecutar tests

```powershell
npm test
```

### 17.4 Smoke local de auth

```powershell
node scripts\smoke-auth-local.mjs --mode=local
```

### 17.5 Build SAM

```powershell
sam build
```

### 17.6 Validate SAM

```powershell
sam validate
```

Estado actual esperado:

- `sam build`: OK.
- `sam validate`: falla hasta actualizar `Runtime: nodejs20.x`.

---

## 18. Orden recomendado para implementar los endpoints pendientes

Orden pragmatico para evitar rehacer trabajo:

1. Auth contrato final:
   - Alinear `correo/email`.
   - Decidir auth local con BD o Cognito.
   - Implementar logout/refresh si se usaran.

2. Catalogos/selectores:
   - Conductores.
   - Unidades.
   - Contratos.
   - Proveedores GPS.

3. Jornadas:
   - Resumen.
   - Filtros/paginacion.
   - Seguimiento.
   - Detalle.
   - Iniciar/finalizar por path.
   - Observaciones.

4. Contratos:
   - CRUD.
   - Tarifas.
   - Unidades.
   - Historial.
   - Validaciones.

5. GPS:
   - Proveedores.
   - Plantillas.
   - Registros.
   - Importaciones.
   - Errores.
   - Eventos.
   - Tiempo real.

6. Camiones:
   - Migrar lectura avanzada a `unidades`.
   - Detalle tecnico.
   - GPS por camion.
   - Mantenimientos.
   - Export.

7. Combustible:
   - Registros.
   - Resumen.
   - Calculo de rendimiento.

8. Auditoria:
   - Lista.
   - Resumen.
   - Export.
   - Integrar registros desde auth.

9. Dashboards:
   - Ejecutivo.
   - Gerencial.
   - Series y rendimiento.

---

## 19. Veredicto final

La base nueva esta bien encaminada y soporta la mayoria de HUs propuestas. Los cambios de Sprint 2 y Sprint 3 relacionados con GPS, carga masiva GPS y contratos estan cubiertos a nivel de estructura:

- Importaciones GPS: soportadas.
- Errores de importacion GPS: soportados.
- Formatos por proveedor GPS: soportados.
- Duplicados GPS: controlados por indice unico.
- Tarifa por tonelada: soportada.
- Contratos con rutas, tarifas, unidades e historial: soportados.
- Jornadas y seguimiento: soportados.
- Dashboard inicial: soportado por vistas y agregaciones.

El proyecto actual funciona localmente con los endpoints existentes. Para completar el backend de las 60-70 rutas propuestas, el trabajo pendiente es implementar servicios, controladores, repositorios y rutas por dominio, mas alinear contratos JSON con frontend.

Para nube, el bloqueo actual es independiente de la base: `nodejs20.x` esta deprecado y debe migrarse a un runtime vigente, preferiblemente `nodejs24.x`, validando luego con `sam validate`.
