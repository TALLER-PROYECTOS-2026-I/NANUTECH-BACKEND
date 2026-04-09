# HU03 Backend Notes

## Proposito
HU03 implementa el marcado de inicio y fin de turno sobre el modulo `jornada-services`, usando la tabla `jornadas` y los estados reales del schema.

## Archivos modificados
- `src/functions/jornada-services/jornadaHandler.mjs`
- `src/functions/jornada-services/jornadaController.mjs`
- `src/functions/jornada-services/jornadaService.mjs`
- `src/functions/jornada-services/jornadaRepository.mjs`
- `src/functions/jornada-services/jornadaModel.mjs`
- `src/shared/utils/validators/jornadaValidator.mjs`
- `__tests__/unit/jornada-services-test/jornadaHandler.test.mjs`
- `__tests__/unit/jornada-services-test/jornadaController.test.mjs`
- `__tests__/unit/jornada-services-test/jornadaService.test.mjs`
- `__tests__/unit/jornada-services-test/jornadaRepository.test.mjs`

## Endpoints implementados
- `POST /jornadas`
- `GET /jornadas/actual/{conductorId}`
- `POST /jornadas/iniciar`
- `POST /jornadas/finalizar`

## Estados validos de jornada
- `REGISTRADA`
- `EN_PROCESO`
- `COMPLETADA`
- `CANCELADA`

Reglas aplicadas en HU03:
- la jornada visible en dashboard es la que sigue en `REGISTRADA` o `EN_PROCESO`
- iniciar turno solo permite `REGISTRADA -> EN_PROCESO`
- finalizar turno solo permite `EN_PROCESO -> COMPLETADA`

## Que se valido localmente
- creacion de jornada alineada al schema real
- obtencion de jornada actual por conductor
- inicio de turno con timestamp del servidor
- rechazo de inicio cuando la jornada ya esta iniciada
- finalizacion de turno con timestamp del servidor
- devolucion de `duracion_total_segundos`
- rechazo de cierre fuera de `EN_PROCESO`

## Que falta para nube
- registrar `JornadaFunction` y sus eventos en `template.yaml`
- desplegar API Gateway/Lambda
- validar conectividad Lambda -> PostgreSQL en el ambiente real

## Que debe recibir DevSecOps
- el parche de `template.yaml` por separado
- la lista de endpoints de HU03
- la confirmacion de que el modulo ya fue probado localmente con unit tests

## Que no entra en el PR funcional
- cambios de infraestructura
- cambios a `template.yaml`
- cambios a otros modulos
- pruebas de integracion o scripts cloud
