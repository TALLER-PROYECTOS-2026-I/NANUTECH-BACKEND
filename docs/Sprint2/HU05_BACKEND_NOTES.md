# HU05 Backend Notes

## Proposito
HU05 implementa el seguimiento de jornadas laborales desde el modulo `jornada-services`, permitiendo consultar jornadas con informacion de conductor, unidad, contrato, horarios, duracion, estado y observaciones.

## Modulo principal
- `src/functions/jornada-services`

## Archivos relacionados
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

## Endpoints disponibles
- `GET /jornadas`
- `GET /jornadas/exportar`

## Funcionamiento actual
- El handler recibe la combinacion `METHOD + resource` y redirige al controller correspondiente.
- `GET /jornadas` valida la sesion con `getCurrentSession`.
- El controller acepta filtros por:
  - `q`
  - `conductor_id`
  - `fecha_desde`
  - `fecha_hasta`
- El repository arma filtros SQL parametrizados y consulta jornadas uniendo:
  - `jornadas`
  - `usuarios`
  - `unidades`
  - `contratos`
- La respuesta incluye datos enriquecidos:
  - fecha
  - conductor
  - camion
  - contrato
  - horario
  - kilometros
  - estado
  - observaciones
  - duracion total
  - indicador `tiene_observaciones`
- La duracion total se calcula desde SQL:
  - con hora de fin: formato `HH:MM`
  - en proceso: `En curso`
  - registrada: `Sin iniciar`
- Las jornadas se ordenan por `created_at DESC`.

## Exportacion CSV
- `GET /jornadas/exportar` usa los mismos filtros de listado.
- El service genera el CSV con columnas de jornada, conductor, placa, contrato, horas, duracion, kilometros, estado y observaciones.
- Los valores del CSV se escapan para soportar comas, comillas y saltos de linea.

## Reglas aplicadas
- Se valida que `fecha_desde` no sea mayor que `fecha_hasta`.
- Todas las consultas usan parametros SQL para los filtros.
- La vista de seguimiento usa datos ya enriquecidos desde el repository.

## Pruebas relacionadas
- Listado sin filtros.
- Listado con busqueda por texto.
- Filtro por conductor.
- Filtro por rango de fechas.
- Exportacion CSV sin filtros.
- Exportacion CSV con filtros.
- Escape correcto de valores CSV.
