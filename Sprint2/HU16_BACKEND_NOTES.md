# HU16 Backend Notes

## Proposito
HU16 implementa el dashboard gerencial desde el modulo `dashboard-gerencial-services`, consolidando resumen, graficas, operaciones, rendimiento e historial de jornadas para usuarios con rol gerencial o administrador.

## Modulo principal
- `src/functions/dashboard-gerencial-services`

## Archivos relacionados
- `src/functions/dashboard-gerencial-services/dashboardGerencialHandler.mjs`
- `src/functions/dashboard-gerencial-services/dashboardGerencialController.mjs`
- `src/functions/dashboard-gerencial-services/dashboardGerencialService.mjs`
- `src/functions/dashboard-gerencial-services/dashboardGerencialRepository.mjs`
- `src/functions/dashboard-gerencial-services/dashboardGerencialModel.mjs`
- `__tests__/unit/dashboard-gerencial-services/dashboardGerencialHandler.test.mjs`
- `__tests__/unit/dashboard-gerencial-services/dashboardGerencialController.test.mjs`
- `__tests__/unit/dashboard-gerencial-services/dashboardGerencialService.test.mjs`
- `__tests__/unit/dashboard-gerencial-services/dashboardGerencialRepository.test.mjs`
- `__tests__/unit/dashboard-gerencial-services/dashboardGerencialModel.test.mjs`

## Endpoint manejado por el codigo
- `GET /dashboard/gerencial`

## Funcionamiento actual
- El handler recibe `GET /dashboard/gerencial` y llama al controller.
- El controller valida token `Authorization`.
- La sesion se resuelve con `getCurrentSession`.
- El acceso se permite para roles:
  - `gerente`
  - `admin`
- El controller lee filtros:
  - `tiempo`
  - `search`
- El service consulta en paralelo:
  - resumen
  - graficas
  - operaciones
  - rendimiento
  - historial
- El model arma una respuesta con `success`, `data`, `estado_sistema` y `ultimo_actualizacion`.

## Filtros de tiempo
- `hoy`
- `semana`
- `mes`
- `todas`

## Resumen general
- Total de jornadas.
- Jornadas completadas.
- Horas acumuladas.
- Kilometros totales.
- Eficiencia.
- Flota activa.
- Conductores activos.
- Contratos activos.
- Ingresos estimados.

## Graficas
- Jornadas por dia.
- Kilometros por dia.
- Sectores por estado de jornadas.
- Sectores por estado de camiones.
- Sectores por estado de conductores.

## Operaciones
- Jornadas en progreso o pendientes.
- Camiones en mantenimiento.
- Conductores disponibles.

## Rendimiento
- Top 5 conductores por kilometros.
- Top 5 camiones por uso.

## Historial
- ID de jornada.
- Conductor.
- Camion.
- Hora inicio.
- Hora fin.
- Kilometros recorridos.
- Duracion en horas.
- Estado.

## Pruebas relacionadas
- Ruteo del dashboard gerencial.
- Token requerido.
- Control de acceso para gerente/admin.
- Respuesta exitosa con filtros.
- Manejo de errores del controller.
- Construccion de respuesta del model.
- Consultas del repository.
