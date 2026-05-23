# HU12 Backend Notes

## Proposito
HU12 implementa un dashboard ejecutivo desde el modulo `dashboard-services`, orientado a indicadores generales, alertas, graficas, ranking de camiones y contratos activos.

## Modulo principal
- `src/functions/dashboard-services`

## Archivos relacionados
- `src/functions/dashboard-services/dashboardHandler.mjs`
- `src/functions/dashboard-services/dashboardController.mjs`
- `src/functions/dashboard-services/dashboardService.mjs`
- `src/functions/dashboard-services/dashboardRepository.mjs`
- `src/functions/dashboard-services/dashboardModel.mjs`
- `__tests__/unit/dashboard-services/dashboardHandler.test.mjs`
- `__tests__/unit/dashboard-services/dashboardController.test.mjs`
- `__tests__/unit/dashboard-services/dashboardService.test.mjs`
- `__tests__/unit/dashboard-services/dashboardRepository.test.mjs`
- `__tests__/unit/dashboard-services/dashboardModel.test.mjs`

## Endpoint disponible
- `GET /dashboard`

## Funcionamiento actual
- El handler delega la solicitud al controller principal.
- El controller valida que exista token `Authorization`.
- La sesion se resuelve con `getCurrentSession`.
- El acceso se permite para rol `admin`.
- El service ejecuta consultas en paralelo para obtener:
  - KPIs
  - alertas
  - graficas
  - top de camiones
  - contratos
- El model arma una respuesta consolidada para el cliente.

## KPIs
- Total de camiones registrados.
- Contratos activos por fecha.
- Alertas activas.
- Ingresos estimados desde contratos activos.

## Alertas
- Se consultan alertas activas desde `alertas_jornada`.
- Se consultan contratos por expirar dentro de los proximos 30 dias.
- La respuesta separa alertas activas y contratos por expirar.

## Graficas
- Eventos GPS agrupados por tipo.
- Estados de camiones agrupados por estado.

## Ranking y contratos
- Top de camiones por kilometros recorridos.
- Contratos activos ordenados por fecha de fin.

## Pruebas relacionadas
- Validacion de token requerido.
- Control de acceso por rol admin.
- Respuesta exitosa del dashboard.
- Construccion de respuesta del model.
- Consultas del repository.
- Orquestacion paralela del service.
