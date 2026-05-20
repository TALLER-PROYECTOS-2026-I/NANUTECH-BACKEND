/**
 * @openapi
 * components:
 *   schemas:
 *
 *     CamionInput:
 *       type: object
 *       required:
 *         - placa
 *         - marca
 *         - modelo
 *         - anio
 *         - capacidad_ton
 *         - vin
 *         - color
 *         - combustible
 *         - gps
 *       properties:
 *         placa:
 *           type: string
 *           example: ABC-123
 *           description: Placa única del camión (se normaliza a mayúsculas)
 *         marca:
 *           type: string
 *           example: Volvo
 *         modelo:
 *           type: string
 *           example: FH16
 *         anio:
 *           type: integer
 *           minimum: 1990
 *           example: 2020
 *           description: Año del camión (máximo año actual + 1)
 *         capacidad_ton:
 *           type: number
 *           format: float
 *           minimum: 0.01
 *           example: 20.00
 *           description: Capacidad en toneladas, debe ser mayor a 0
 *         vin:
 *           type: string
 *           example: VINVOLVO0001
 *           description: Número de identificación vehicular único
 *         color:
 *           type: string
 *           example: Blanco
 *         combustible:
 *           type: string
 *           enum: [DIESEL, GASOLINA, GNV, GLP, ELECTRICO, HIBRIDO]
 *           example: DIESEL
 *         gps:
 *           type: boolean
 *           example: true
 *           description: Indica si el camión tiene GPS habilitado
 *         estado:
 *           type: string
 *           enum: [DISPONIBLE, EN_JORNADA, EN_AUXILIO, MANTENIMIENTO, INACTIVA]
 *           default: DISPONIBLE
 *           example: DISPONIBLE
 *         kilometraje_actual:
 *           type: number
 *           format: float
 *           default: 0
 *           example: 25430.50
 *         fecha_registro:
 *           type: string
 *           format: date
 *           example: "2025-01-15"
 *           description: Fecha de registro. Por defecto la fecha actual.
 *         ultima_fecha_mantenimiento:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2026-03-10"
 *         proxima_fecha_mantenimiento:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2026-06-10"
 *         notas:
 *           type: string
 *           nullable: true
 *           example: Unidad operativa
 *
 *     CamionResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: aaaa0001-0000-0000-0000-000000000001
 *         placa:
 *           type: string
 *           example: ABC-123
 *         marca:
 *           type: string
 *           example: Volvo
 *         modelo:
 *           type: string
 *           example: FH16
 *         anio:
 *           type: integer
 *           nullable: true
 *           example: 2020
 *         capacidad_ton:
 *           type: number
 *           example: 20.00
 *         estado:
 *           type: string
 *           enum: [DISPONIBLE, EN_JORNADA, EN_AUXILIO, MANTENIMIENTO, INACTIVA]
 *           example: DISPONIBLE
 *         gps_habilitado:
 *           type: boolean
 *           example: true
 *         vin:
 *           type: string
 *           nullable: true
 *           example: VINVOLVO0001
 *         color:
 *           type: string
 *           nullable: true
 *           example: Blanco
 *         tipo_combustible:
 *           type: string
 *           nullable: true
 *           enum: [DIESEL, GASOLINA, GNV, GLP, ELECTRICO, HIBRIDO]
 *           example: DIESEL
 *         kilometraje_actual:
 *           type: number
 *           example: 25430.50
 *         fecha_registro:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2025-01-15"
 *         ultima_fecha_mantenimiento:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2026-03-10"
 *         proxima_fecha_mantenimiento:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2026-06-10"
 *         horas_movimiento:
 *           type: number
 *           description: Horas calculadas desde gps_registros (intervalos de 30 min con velocidad > 5 km/h)
 *           example: 8.5
 *         horas_detenido:
 *           type: number
 *           example: 1.5
 *         horas_totales:
 *           type: number
 *           example: 10.0
 *         kilometros_totales:
 *           type: number
 *           description: Odómetro máximo registrado en gps_registros
 *           example: 25430.50
 *         ultimo_gps_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-04-26T10:00:00Z"
 *         activo:
 *           type: boolean
 *           example: true
 *
 *     CamionCreadoResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/CamionResponse'
 *         - type: object
 *           properties:
 *             confirmacion:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "¡Camión registrado con éxito!"
 *                 placa:
 *                   type: string
 *                   example: ABC-123
 *                 modelo:
 *                   type: string
 *                   example: FH16
 *
 *     PanelResumen:
 *       type: object
 *       properties:
 *         total_camiones:
 *           type: integer
 *           example: 3
 *         en_uso:
 *           type: integer
 *           description: Camiones en estado EN_JORNADA
 *           example: 1
 *         disponibles:
 *           type: integer
 *           example: 1
 *         mantenimiento:
 *           type: integer
 *           example: 1
 *
 *     PanelGraficaMovimiento:
 *       type: object
 *       properties:
 *         horas_movimiento:
 *           type: number
 *           example: 8.5
 *         horas_detenido:
 *           type: number
 *           example: 1.5
 *         porcentaje_movimiento:
 *           type: number
 *           format: float
 *           example: 85.00
 *         porcentaje_detenido:
 *           type: number
 *           format: float
 *           example: 15.00
 *
 *     PanelCamionesResponse:
 *       type: object
 *       properties:
 *         resumen:
 *           $ref: '#/components/schemas/PanelResumen'
 *         grafica_movimiento:
 *           $ref: '#/components/schemas/PanelGraficaMovimiento'
 *         camiones:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CamionResponse'
 */

/**
 * @openapi
 * /camiones:
 *   get:
 *     tags:
 *       - Camiones
 *     summary: Listar todos los camiones
 *     description: >
 *       Devuelve el listado completo de camiones activos (`activo = TRUE`).
 *       Soporta filtrado por placa (parcial, case-insensitive) y por estado.
 *       Las métricas GPS (horas_movimiento, kilometros_totales, etc.) se calculan
 *       en tiempo real desde `gps_registros` si la tabla existe; de lo contrario retornan 0.
 *     parameters:
 *       - in: query
 *         name: placa
 *         schema:
 *           type: string
 *         description: Filtro parcial por placa (ILIKE). Ejemplo: "ABC" coincide con "ABC-123"
 *         example: ABC
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [DISPONIBLE, EN_JORNADA, EN_USO, EN_AUXILIO, MANTENIMIENTO, INACTIVA, TODOS]
 *         description: >
 *           Filtra por estado operativo. `EN_USO` se normaliza a `EN_JORNADA`.
 *           `TODOS` o ausente devuelve todos los estados.
 *         example: DISPONIBLE
 *     responses:
 *       200:
 *         description: Lista de camiones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CamionResponse'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

/**
 * @openapi
 * /camiones/{id}:
 *   get:
 *     tags:
 *       - Camiones
 *     summary: Obtener camión por ID
 *     description: >
 *       Retorna el detalle completo de un camión incluyendo métricas GPS.
 *       Acepta UUID (`aaaa0001-...`) o número entero como índice ordinal por placa.
 *       Si no existe, retorna 404.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID del camión o índice numérico ordinal
 *         example: aaaa0001-0000-0000-0000-000000000001
 *     responses:
 *       200:
 *         description: Camión encontrado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CamionResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

/**
 * @openapi
 * /camiones:
 *   post:
 *     tags:
 *       - Camiones
 *     summary: Registrar un nuevo camión
 *     description: >
 *       Crea una nueva unidad de transporte en la tabla `unidades`.
 *       El trigger `tg_unidad_to_camion_ins` sincroniza automáticamente
 *       la tabla legacy `camiones`. El estado inicial siempre es `DISPONIBLE`.
 *
 *       **Validaciones aplicadas:**
 *       - `placa` única (case-insensitive)
 *       - `vin` único (case-insensitive)
 *       - `anio` entre 1990 y año actual + 1
 *       - `capacidad_ton` mayor a 0
 *       - `combustible` debe ser uno de los valores del enum
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CamionInput'
 *           example:
 *             placa: XYZ-999
 *             marca: Scania
 *             modelo: R500
 *             anio: 2023
 *             capacidad_ton: 18.5
 *             vin: VINSCANIA9990
 *             color: Rojo
 *             combustible: DIESEL
 *             gps: true
 *             kilometraje_actual: 0
 *             fecha_registro: "2026-05-01"
 *             notas: Unidad nueva
 *     responses:
 *       201:
 *         description: Camión registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CamionCreadoResponse'
 *       400:
 *         description: Error de validación (placa/VIN duplicado, campo inválido, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               placaDuplicada:
 *                 summary: Placa ya registrada
 *                 value:
 *                   success: false
 *                   message: Ya existe un camión con esta placa
 *               vinDuplicado:
 *                 summary: VIN ya registrado
 *                 value:
 *                   success: false
 *                   message: Ya existe un camión con este VIN
 *               campoObligatorio:
 *                 summary: Campo requerido faltante
 *                 value:
 *                   success: false
 *                   message: El campo combustible es obligatorio
 *               combustibleInvalido:
 *                 summary: Tipo de combustible no permitido
 *                 value:
 *                   success: false
 *                   message: "Combustible inválido. Use: DIESEL, GASOLINA, GNV, GLP, ELECTRICO, HIBRIDO"
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

/**
 * @openapi
 * /camiones/panel:
 *   get:
 *     tags:
 *       - Camiones
 *     summary: Panel consolidado de monitoreo
 *     description: >
 *       Retorna un resumen operativo y métricas GPS agregadas de todas las unidades.
 *       Incluye conteo por estado, porcentajes de actividad y el listado completo
 *       de camiones con sus métricas individuales. Soporta los mismos filtros que
 *       `GET /camiones`.
 *
 *       Las métricas GPS se calculan desde `gps_registros` (intervalos de 30 min):
 *       - Velocidad > 5 km/h → cuenta como movimiento
 *       - Velocidad ≤ 5 km/h o NULL → cuenta como detenido
 *     parameters:
 *       - in: query
 *         name: placa
 *         schema:
 *           type: string
 *         description: Filtro parcial por placa
 *         example: DEF
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [DISPONIBLE, EN_JORNADA, EN_USO, EN_AUXILIO, MANTENIMIENTO, INACTIVA, TODOS]
 *         example: EN_JORNADA
 *     responses:
 *       200:
 *         description: Panel de camiones obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PanelCamionesResponse'
 *             example:
 *               success: true
 *               message: Panel de camiones obtenido exitosamente.
 *               data:
 *                 resumen:
 *                   total_camiones: 3
 *                   en_uso: 1
 *                   disponibles: 1
 *                   mantenimiento: 1
 *                 grafica_movimiento:
 *                   horas_movimiento: 8.5
 *                   horas_detenido: 1.5
 *                   porcentaje_movimiento: 85.00
 *                   porcentaje_detenido: 15.00
 *                 camiones: []
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

/**
 * @openapi
 * /camiones/exportar/csv:
 *   get:
 *     tags:
 *       - Camiones
 *     summary: Exportar camiones en formato CSV
 *     description: >
 *       Genera y descarga un archivo CSV con la información operativa de los camiones.
 *       Compatible con Excel (UTF-8, coma como separador). Soporta los mismos
 *       filtros que `GET /camiones`.
 *
 *       **Columnas exportadas:** ID, Placa, Marca, Modelo, Año, Capacidad (ton),
 *       Estado, VIN, Color, GPS, Kilometraje, Fecha de Registro,
 *       Último Mantenimiento, Próximo Mantenimiento.
 *     parameters:
 *       - in: query
 *         name: placa
 *         schema:
 *           type: string
 *         example: ABC
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [DISPONIBLE, EN_JORNADA, EN_USO, EN_AUXILIO, MANTENIMIENTO, INACTIVA, TODOS]
 *     responses:
 *       200:
 *         description: Archivo CSV generado
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *             example: 'attachment; filename="camiones.csv"'
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *             example: |
 *               "ID","Placa","Marca","Modelo","Año","Capacidad (ton)","Estado"
 *               "aaaa0001-...","ABC-123","Volvo","FH16","2020","20","DISPONIBLE"
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

// Este archivo solo registra la documentación OpenAPI para swagger-jsdoc.
// No exporta lógica de negocio.
