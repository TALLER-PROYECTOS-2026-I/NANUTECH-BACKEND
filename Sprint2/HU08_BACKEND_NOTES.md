# HU08 Backend Notes

## Proposito
HU08 implementa la integracion GPS y la carga masiva de datos GPS desde el modulo `gps-services`, usando validacion CSV, proveedores configurados, importacion de registros, control de duplicados, errores de importacion y resumen operativo.

## Modulo principal
- `src/functions/gps-services`

## Archivos relacionados
- `src/functions/gps-services/gpsHandler.mjs`
- `src/functions/gps-services/gpsController.mjs`
- `src/functions/gps-services/gpsService.mjs`
- `src/functions/gps-services/gpsRepository.mjs`
- `src/functions/gps-services/gpsValidator.mjs`
- `__tests__/unit/gps-services/gpsHandler.test.mjs`
- `__tests__/unit/gps-services/gpsController.test.mjs`
- `__tests__/unit/gps-services/gpsService.test.mjs`
- `__tests__/unit/gps-services/gpsRepository.test.mjs`
- `__tests__/unit/gps-services/gpsValidator.test.mjs`

## Endpoints disponibles
- `GET /gps/proveedores`
- `GET /gps/plantilla`
- `GET /gps/plantilla/{proveedor}`
- `POST /gps/validar`
- `POST /gps/importar`
- `GET /gps/resumen`
- `GET /gps/registros`

## Proveedores soportados
- `GPSCONTROL`
- `GLOBALGPS`

## Funcionamiento actual
- `GET /gps/proveedores` retorna proveedores soportados, nombre visible y encabezados requeridos.
- `GET /gps/plantilla` genera una plantilla CSV segun proveedor.
- `POST /gps/validar` recibe contenido CSV, valida estructura y devuelve si la importacion queda habilitada.
- `POST /gps/importar` procesa filas validas, registra cabecera de importacion, guarda errores y omite duplicados.
- `GET /gps/resumen` calcula metricas desde los ultimos registros GPS por unidad.
- `GET /gps/registros` lista registros GPS con filtros por proveedor y placa.

## Validaciones CSV
- Se valida extension `.csv`.
- Se valida proveedor.
- Se validan encabezados esperados.
- Se validan columnas obligatorias.
- Se valida fecha y hora.
- Se validan rangos de latitud y longitud.
- Se valida velocidad no negativa.
- Se valida rumbo entre 0 y 360.
- Se valida distancia total no negativa.

## Estados GPS calculados
- `MOVIENDO`: velocidad mayor a 5 km/h.
- `DETENIDO`: velocidad menor o igual a 5 km/h.
- `EXCESO_VELOCIDAD`: velocidad mayor al limite configurado.

## Importacion
- Se crea registro en `gps_importaciones`.
- Se insertan filas validas en `gps_registros`.
- Se registran errores en `gps_importacion_errores`.
- Se verifica duplicado por proveedor, unidad y fecha/hora.
- Se retorna conteo de importados, duplicados omitidos e invalidos.

## Pruebas relacionadas
- Proveedores GPS.
- Plantillas GPSControl y GlobalGPS.
- Validacion de CSV correcto.
- Deteccion de columnas requeridas ausentes.
- Validacion de coordenadas.
- Validacion de velocidad.
- Importacion de registros.
- Omision de duplicados.
- Registro de errores de importacion.
- Resumen GPS.
- Listado de registros GPS.
