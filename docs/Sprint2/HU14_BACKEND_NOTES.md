# HU14 Backend Notes

## Proposito
HU14 implementa el registro de nuevos contratos comerciales y sus reglas iniciales de tarifa desde el modulo `contrato-services`.

## Modulo principal
- `src/functions/contrato-services`

## Archivos relacionados
- `src/functions/contrato-services/contratoHandler.mjs`
- `src/functions/contrato-services/contratoController.mjs`
- `src/functions/contrato-services/contratoService.mjs`
- `src/functions/contrato-services/contratoRepository.mjs`
- `src/functions/contrato-services/contratoModel.mjs`
- `src/shared/utils/validators/contratoValidator.mjs`
- `__tests__/unit/contrato-services/contratoController.test.mjs`
- `__tests__/unit/contrato-services/contratoService.test.mjs`
- `__tests__/unit/contrato-services/contratoRepository.test.mjs`

## Endpoint disponible
- `POST /contratos`

## Funcionamiento actual
- El controller obtiene el token desde `Authorization`.
- La sesion se valida con `getCurrentSession`.
- El registro se permite para rol `gerente`.
- El body JSON se parsea y se envia al service.
- El service valida reglas de negocio con `ContratoValidator`.
- El repository crea el contrato dentro de una transaccion.

## Flujo de creacion
1. Se inicia transaccion.
2. Se genera codigo unico de contrato.
3. Se calcula el total referencial.
4. Se inserta el contrato principal.
5. Se inserta la ruta del contrato.
6. Se insertan tarifas del contrato.
7. Se consulta el contrato completo creado.
8. Se confirma la transaccion.

## Datos registrados
- Datos principales del contrato:
  - codigo
  - cliente
  - RUC
  - descripcion
  - tipo de servicio
  - fechas
  - tarifa
  - moneda
  - estado
- Ruta:
  - origen
  - destino
  - distancia estimada
- Tarifas:
  - tarifa por kilometro
  - tarifa por hora
  - tarifa de espera
  - total referencial

## Calculo de tarifa
- El total referencial se calcula como:
  - `distancia_estimada_km * tarifa_por_km`
- El resultado se redondea a 2 decimales.

## Validaciones aplicadas
- Cliente obligatorio.
- RUC obligatorio con 11 digitos numericos.
- Tipo de servicio obligatorio.
- Fecha de inicio obligatoria.
- Ruta obligatoria.
- Distancia estimada valida.
- Tarifa por kilometro valida.

## Pruebas relacionadas
- Registro de contrato valido.
- Rechazo de RUC invalido.
- Generacion de codigo.
- Calculo de tarifa referencial.
- Transaccion de creacion.
- Rollback ante error.
- Control de acceso por rol gerente.
