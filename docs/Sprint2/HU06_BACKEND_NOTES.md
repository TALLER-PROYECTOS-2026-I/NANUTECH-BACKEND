# HU06 Backend Notes

## Proposito
HU06 implementa el panel de gestion de contratos comerciales desde el modulo `contrato-services`, permitiendo consultar indicadores, contratos vigentes, listado paginado, busqueda y detalle de contrato.

## Modulo principal
- `src/functions/contrato-services`

## Archivos relacionados
- `src/functions/contrato-services/contratoHandler.mjs`
- `src/functions/contrato-services/contratoController.mjs`
- `src/functions/contrato-services/contratoService.mjs`
- `src/functions/contrato-services/contratoRepository.mjs`
- `src/functions/contrato-services/contratoModel.mjs`
- `src/shared/utils/validators/contratoValidator.mjs`
- `__tests__/unit/contrato-services/contratoHandler.test.mjs`
- `__tests__/unit/contrato-services/contratoController.test.mjs`
- `__tests__/unit/contrato-services/contratoService.test.mjs`
- `__tests__/unit/contrato-services/contratoRepository.test.mjs`
- `__tests__/unit/contrato-services/contratoModel.test.mjs`

## Endpoints disponibles
- `GET /contratos/indicadores`
- `GET /contratos/vigentes`
- `GET /contratos`
- `GET /contratos/{id}`

## Funcionamiento actual
- El handler redirige cada ruta de contratos al controller correspondiente.
- Los controllers validan sesion con `getCurrentSession` para las consultas principales.
- `GET /contratos/indicadores` calcula metricas agregadas del modulo:
  - total de contratos
  - contratos activos
  - contratos vencidos
  - proximos a vencer
  - camiones asignados
  - distribucion por estado
  - distribucion por tipo de servicio
- `GET /contratos` permite listar contratos con:
  - busqueda por codigo o cliente usando `q`
  - filtro por `estado`
  - paginacion con `page` y `limit`
  - ordenamiento controlado con `order_by`
- `GET /contratos/vigentes` retorna contratos activos con estado `VIGENTE` y fechas validas.
- `GET /contratos/{id}` retorna el detalle del contrato con datos calculados y unidades asignadas.

## Reglas aplicadas
- El listado usa paginacion con limite controlado.
- El ordenamiento usa una lista de campos permitidos para evitar ordenar por columnas no previstas.
- La busqueda por texto se ejecuta con parametros SQL.
- Los indicadores se calculan con consultas agregadas y JSON desde PostgreSQL.

## Pruebas relacionadas
- Consulta de contratos vigentes.
- Indicadores del panel.
- Listado paginado.
- Busqueda por codigo o cliente.
- Filtro por estado.
- Detalle por ID.
- Rutas del handler de contratos.
