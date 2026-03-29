export const ERROR_MESSAGES = {
  // Common errors
  INVALID_REQUEST_BODY: "Cuerpo de solicitud inválido",
  METHOD_NOT_ALLOWED: "Método no permitido",
  INTERNAL_SERVER_ERROR: "Error interno del servidor",

  // Camion errors
  CAMION_NOT_FOUND: "Camión no encontrado",
  CAMION_ALREADY_EXISTS: "Ya existe un camión con este ID",
  CAMION_ID_REQUIRED: "El ID del camión es requerido",
  CAMION_PLACA_REQUIRED: "La placa es requerida",
  CAMION_MODELO_REQUIRED: "El modelo es requerido",
  CAMION_CAPACIDAD_REQUIRED: "La capacidad es requerida",
  CAMION_CAPACIDAD_INVALID: "La capacidad debe ser un número",
  CAMION_PLACA_EXISTS: "Ya existe un camión con esta placa",
  CAMION_YEAR_INVALID: "El año debe estar entre 2000 y el año actual",
  CAMION_ESTADO_INVALID:
    "Estado inválido. Debe ser ACTIVO, INACTIVO o MANTENIMIENTO",
  CAMION_PLACA_FORMAT: "Formato de placa inválido. Use formato: ABC-123",

  // Contrato errors
  CONTRATO_NOT_FOUND: "Contrato no encontrado",
  CONTRATO_ALREADY_EXISTS: "Ya existe un contrato con este ID",
  CONTRATO_ID_REQUIRED: "El ID del contrato es requerido",
  CONTRATO_CLIENTE_REQUIRED: "El cliente es requerido",
  CONTRATO_FECHA_INICIO_REQUIRED: "La fecha de inicio es requerida",
  CONTRATO_FECHA_FIN_REQUIRED: "La fecha de fin es requerida",
  CONTRATO_FECHA_INVALIDA:
    "La fecha de fin debe ser posterior a la fecha de inicio",
  CONTRATO_MONTO_REQUIRED: "El monto es requerido",
  CONTRATO_MONTO_INVALID: "El monto debe ser un número",
  CONTRATO_CAMION_ID_REQUIRED: "El ID del camión es requerido",
  CONTRATO_ESTADO_INVALID:
    "Estado inválido. Debe ser ACTIVO, VENCIDO o CANCELADO",
};
