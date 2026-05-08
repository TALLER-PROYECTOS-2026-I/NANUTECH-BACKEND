/**
 * Velocidad mínima considerada como movimiento.
 */

const PROVIDERS = {
  GPSCONTROL: {
    code: "GPSCONTROL",
    displayName: "GPSControl.pe",
    headers: [
      "fecha",
      "hora",
      "placa",
      "latitud",
      "longitud",
      "velocidad",
      "rumbo",
      "distancia_total",
    ],
    aliases: {
      fecha: "fecha",
      hora: "hora",
      placa: "placa",
      latitud: "latitud",
      longitud: "longitud",
      velocidad: "velocidad",
      rumbo: "rumbo",
      distancia_total: "distancia_total",
    },
  },

  GLOBALGPS: {
    code: "GLOBALGPS",
    displayName: "GlobalGPSPeru.com",
    headers: [
      "event_date",
      "event_time",
      "vehicle_plate",
      "latitude",
      "longitude",
      "speed",
      "heading",
      "mileage",
    ],
    aliases: {
      fecha: "event_date",
      hora: "event_time",
      placa: "vehicle_plate",
      latitud: "latitude",
      longitud: "longitude",
      velocidad: "speed",
      rumbo: "heading",
      distancia_total: "mileage",
    },
  },
};

export const MOVEMENT_THRESHOLD_KMH = 5;
export const SPEED_LIMIT_KMH = Number(process.env.GPS_SPEED_LIMIT_KMH || 90);

/**
 * Obtiene configuración asociada al proveedor GPS.
 */

export function getProviderConfigs() {
  return Object.values(PROVIDERS);
}

/**
 * Normaliza nombres de proveedores GPS.
 */

export function normalizeProvider(provider) {
  const value = String(provider || "")
    .trim()
    .toUpperCase()
    .replaceAll(".", "")
    .replaceAll("-", "")
    .replaceAll("_", "");

  if (["GPSCONTROL", "GPSCONTROLPE"].includes(value)) {
    return "GPSCONTROL";
  }

  if (["GLOBALGPS", "GLOBALGPSPERU", "GLOBALGPSPERUCOM"].includes(value)) {
    return "GLOBALGPS";
  }

  const error = new Error("Proveedor GPS inválido. Use GPSCONTROL o GLOBALGPS.");
  error.statusCode = 400;
  error.code = "GPS_PROVIDER_INVALID";
  throw error;
}

export function getProviderConfig(provider) {
  const normalizedProvider = normalizeProvider(provider);
  return PROVIDERS[normalizedProvider];
}

/**
 * Verifica que el archivo recibido sea CSV válido.
 */

export function assertCsvFilename(filename = "") {
  const value = String(filename || "").trim().toLowerCase();

  if (!value.endsWith(".csv")) {
    const error = new Error("Solo se permiten archivos CSV.");
    error.statusCode = 400;
    error.code = "GPS_FILE_TYPE_INVALID";
    throw error;
  }
}

export function getCsvFromEvent(event) {
  if (!event.body) {
    const error = new Error("El cuerpo de la solicitud es obligatorio.");
    error.statusCode = 400;
    error.code = "GPS_BODY_REQUIRED";
    throw error;
  }

  let body;

  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    const error = new Error("El cuerpo de la solicitud no es un JSON válido.");
    error.statusCode = 400;
    error.code = "GPS_BODY_INVALID";
    throw error;
  }

  return {
    proveedor: body.proveedor,
    nombreArchivo: body.nombre_archivo || body.nombreArchivo || "gps.csv",
    csvContent: body.csv || body.csvContent || body.contenido,
    cargadoPor: body.cargado_por || body.cargadoPor || null,
  };
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (const char of line) {
    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(csvContent) {
  const content = String(csvContent || "").trim();

  if (!content) {
    const error = new Error("El contenido CSV es obligatorio.");
    error.statusCode = 400;
    error.code = "GPS_CSV_EMPTY";
    throw error;
  }

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    const error = new Error("El CSV debe contener encabezados y al menos una fila.");
    error.statusCode = 400;
    error.code = "GPS_CSV_WITHOUT_ROWS";
    throw error;
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.trim().toLowerCase(),
  );

  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = { __rowNumber: index + 2 };

    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });

    return row;
  });

  return { headers, rows };
}

function validateHeaders(headers, config) {
  const expected = config.headers.map((header) => header.toLowerCase());
  const received = headers.map((header) => header.toLowerCase());

  const missing = expected.filter((header) => !received.includes(header));
  const extra = received.filter((header) => !expected.includes(header));

  return {
    valid: missing.length === 0 && extra.length === 0,
    expected: config.headers,
    received: headers,
    missing,
    extra,
  };
}

function getValue(row, config, logicalField) {
  const column = config.aliases[logicalField];
  return row[column];
}

function toNumber(value, field, rowNumber, errors) {
  const raw = String(value ?? "").trim();

  if (raw === "") {
    errors.push({
      row: rowNumber,
      field,
      message: `El campo ${field} es obligatorio.`,
      value,
    });
    return null;
  }

  const number = Number(raw);

  if (Number.isNaN(number)) {
    errors.push({
      row: rowNumber,
      field,
      message: `El campo ${field} debe ser numérico.`,
      value,
    });
    return null;
  }

  return number;
}

function parseDateTime(fecha, hora, rowNumber, errors) {
  const dateValue = String(fecha ?? "").trim();
  const timeValue = String(hora ?? "").trim();

  if (!dateValue || !timeValue) {
    errors.push({
      row: rowNumber,
      field: "fecha_hora",
      message: "Los campos fecha y hora son obligatorios.",
      value: `${dateValue} ${timeValue}`,
    });
    return null;
  }

  const isoLike = `${dateValue}T${timeValue}`;
  const parsed = new Date(isoLike);

  if (Number.isNaN(parsed.getTime())) {
    errors.push({
      row: rowNumber,
      field: "fecha_hora",
      message: "Formato de fecha u hora inválido.",
      value: `${dateValue} ${timeValue}`,
    });
    return null;
  }

  return `${dateValue} ${timeValue}`;
}

function getTrackingStatus(velocidad) {
  if (velocidad > SPEED_LIMIT_KMH) {
    return "EXCESO_VELOCIDAD";
  }

  if (velocidad > MOVEMENT_THRESHOLD_KMH) {
    return "MOVIENDO";
  }

  return "DETENIDO";
}

/**
 * Valida estructura y contenido del archivo CSV.
 */

export function validateCsvContent(csvContent, provider) {
  const normalizedProvider = normalizeProvider(provider);
  const config = getProviderConfig(normalizedProvider);
  const { headers, rows } = parseCsv(csvContent);

  const headerValidation = validateHeaders(headers, config);

  if (!headerValidation.valid) {
    return {
      valid: false,
      totalRows: rows.length,
      headers: headerValidation,
      validRows: [],
      errors: [
        ...headerValidation.missing.map((field) => ({
          row: 1,
          field,
          message: `Falta la columna obligatoria ${field}.`,
        })),
        ...headerValidation.extra.map((field) => ({
          row: 1,
          field,
          message: `Columna no esperada: ${field}.`,
        })),
      ],
    };
  }

  const validRows = [];
  const errors = [];

  for (const row of rows) {
    const rowNumber = row.__rowNumber;

    const placa = String(getValue(row, config, "placa") || "")
      .trim()
      .toUpperCase();

    const fechaHora = parseDateTime(
      getValue(row, config, "fecha"),
      getValue(row, config, "hora"),
      rowNumber,
      errors,
    );

    const latitud = toNumber(
      getValue(row, config, "latitud"),
      "latitud",
      rowNumber,
      errors,
    );

    const longitud = toNumber(
      getValue(row, config, "longitud"),
      "longitud",
      rowNumber,
      errors,
    );

    const velocidad = toNumber(
      getValue(row, config, "velocidad"),
      "velocidad",
      rowNumber,
      errors,
    );

    const rumbo = toNumber(
      getValue(row, config, "rumbo"),
      "rumbo",
      rowNumber,
      errors,
    );

    const distanciaTotal = toNumber(
      getValue(row, config, "distancia_total"),
      "distancia_total",
      rowNumber,
      errors,
    );

    if (!placa) {
      errors.push({
        row: rowNumber,
        field: "placa",
        message: "El campo placa es obligatorio.",
      });
    }

    if (latitud !== null && (latitud < -90 || latitud > 90)) {
      errors.push({
        row: rowNumber,
        field: "latitud",
        message: "Latitud fuera de rango permitido (-90 a 90).",
        value: latitud,
      });
    }

    if (longitud !== null && (longitud < -180 || longitud > 180)) {
      errors.push({
        row: rowNumber,
        field: "longitud",
        message: "Longitud fuera de rango permitido (-180 a 180).",
        value: longitud,
      });
    }

    if (velocidad !== null && velocidad < 0) {
      errors.push({
        row: rowNumber,
        field: "velocidad",
        message: "La velocidad no puede ser negativa.",
        value: velocidad,
      });
    }

    if (rumbo !== null && (rumbo < 0 || rumbo > 360)) {
      errors.push({
        row: rowNumber,
        field: "rumbo",
        message: "Rumbo fuera de rango permitido (0 a 360).",
        value: rumbo,
      });
    }

    if (distanciaTotal !== null && distanciaTotal < 0) {
      errors.push({
        row: rowNumber,
        field: "distancia_total",
        message: "La distancia total no puede ser negativa.",
        value: distanciaTotal,
      });
    }

    const hasRowErrors = errors.some((error) => error.row === rowNumber);

    if (!hasRowErrors) {
      validRows.push({
        rowNumber,
        placa,
        proveedor: normalizedProvider,
        fecha_hora: fechaHora,
        latitud,
        longitud,
        velocidad_kmh: velocidad,
        rumbo,
        odometro_km: distanciaTotal,
        estado: getTrackingStatus(velocidad),
        raw_payload: row,
      });
    }
  }

  return {
    valid: errors.length === 0,
    totalRows: rows.length,
    headers: headerValidation,
    validRows,
    errors,
  };
}