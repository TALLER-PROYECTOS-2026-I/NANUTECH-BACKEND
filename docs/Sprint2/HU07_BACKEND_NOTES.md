# HU07 Backend Notes

## Proposito
HU07 implementa operaciones de detalle y configuracion de contrato en `contrato-services`, incluyendo consulta del contrato seleccionado, actualizacion de campos configurables, actualizacion de tarifas, historial de cambios y asignacion de unidades.

## Modulo principal
- `src/functions/contrato-services`

## Archivos relacionados
- `src/functions/contrato-services/contratoHandler.mjs`
- `src/functions/contrato-services/contratoController.mjs`
- `src/functions/contrato-services/contratoService.mjs`
- `src/functions/contrato-services/contratoRepository.mjs`
- `src/functions/contrato-services/contratoModel.mjs`
- `__tests__/unit/contrato-services/contratoController.test.mjs`
- `__tests__/unit/contrato-services/contratoService.test.mjs`
- `__tests__/unit/contrato-services/contratoRepository.test.mjs`

## Endpoints manejados por el codigo
- `GET /contratos/{id}`
- `PUT /contratos/{id}`
- `PUT /contratos/{id}/unidades`

## Funcionamiento actual
- `GET /contratos/{id}` obtiene el contrato por identificador y retorna informacion general, fechas, estado, datos calculados y unidades asociadas.
- `PUT /contratos/{id}` lee el body JSON, captura la IP de la solicitud y delega la actualizacion al service.
- `PUT /contratos/{id}/unidades` recibe una lista de unidades y delega la asignacion al service.

## Actualizacion de contrato
- El service obtiene el contrato actual antes de modificarlo.
- Valida reglas basicas:
  - fecha fin mayor o igual a fecha inicio
  - tarifa mayor que cero
  - descripcion con contenido cuando se envia
- Registra historial cuando cambian:
  - `fecha_fin`
  - `tarifa`
  - `descripcion`
- Luego actualiza la tabla `contratos`.
- Si se reciben tarifas, actualiza `contrato_tarifas`.

## Historial
- El repository registra cambios en `contratos_historial`.
- Se guarda:
  - contrato
  - accion
  - campo
  - valor anterior
  - valor nuevo
  - IP

## Asignacion de unidades
- El service elimina asignaciones anteriores del contrato.
- Luego inserta cada unidad recibida en `contrato_unidades`.

## Pruebas relacionadas
- Detalle de contrato por ID.
- Contrato inexistente.
- Validacion de ID requerido.
- Actualizacion de contrato.
- Registro de historial.
- Actualizacion de tarifas.
- Asignacion de unidades.
- Eliminacion previa de unidades asignadas.
