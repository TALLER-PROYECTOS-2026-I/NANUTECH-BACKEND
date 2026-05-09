# HU11 Backend Notes

## Proposito
HU11 implementa el panel de monitoreo y gestion de camiones desde el modulo `camion-services`, permitiendo listar unidades, consultar detalle, registrar camiones, construir metricas del panel y exportar CSV.

## Modulo principal
- `src/functions/camion-services`

## Archivos relacionados
- `src/functions/camion-services/camionHandler.mjs`
- `src/functions/camion-services/camionController.mjs`
- `src/functions/camion-services/camionService.mjs`
- `src/functions/camion-services/camionRepository.mjs`
- `src/functions/camion-services/camionModel.mjs`
- `__tests__/unit/camion-services/camionHandler.hu11.test.mjs`
- `__tests__/unit/camion-services/camionController.hu11.test.mjs`
- `__tests__/unit/camion-services/camionService.hu11.test.mjs`
- `__tests__/unit/camion-services/camionRepository.hu11.test.mjs`
- `__tests__/unit/camion-services/camionModel.hu11.test.mjs`

## Endpoints disponibles
- `GET /camiones`
- `GET /camiones/{id}`
- `POST /camiones`
- `GET /camiones/panel`
- `GET /camiones/exportar/csv`

## Funcionamiento actual
- `GET /camiones` lista unidades activas y puede filtrar por placa y estado.
- `GET /camiones/{id}` obtiene una unidad por UUID y tambien soporta fallback ordinal cuando el ID recibido es numerico.
- `POST /camiones` registra una nueva unidad con estado inicial `DISPONIBLE`.
- `GET /camiones/panel` retorna resumen operativo, grafica de movimiento y listado de camiones.
- `GET /camiones/exportar/csv` genera un CSV compatible con Excel.

## Registro de camion
- Se validan campos obligatorios:
  - placa
  - marca
  - modelo
  - anio
  - capacidad
  - VIN
  - color
  - combustible
  - GPS
- Se normaliza placa y VIN en mayusculas.
- Se valida anio dentro de rango.
- Se valida capacidad mayor que cero.
- Se valida combustible contra catalogo interno.
- Se valida duplicidad por placa y VIN.
- El resultado incluye confirmacion con placa y modelo.

## Panel de camiones
- El repository consulta `unidades`.
- Si existe `gps_registros`, agrega metricas GPS por unidad.
- Calcula:
  - total de camiones
  - en uso
  - disponibles
  - mantenimiento
  - horas en movimiento
  - horas detenido
  - porcentajes de movimiento y detenido
- Para movimiento GPS usa velocidad mayor a 5 km/h.

## Exportacion CSV
- Exporta ID, placa, marca, modelo, anio, capacidad, estado, VIN, color, GPS, kilometraje, fecha de registro y mantenimiento.
- Respeta los filtros enviados al panel.

## Pruebas relacionadas
- Ruteo de endpoints de camiones.
- Listado con filtros.
- Detalle por ID.
- Registro correcto de camion.
- Validaciones de placa, VIN, anio, capacidad y combustible.
- Panel con metricas GPS.
- Panel sin tabla GPS.
- Exportacion CSV.
