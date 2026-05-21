const securityHeaders = {
  "Content-Type": "application/json",

  // CORS
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,X-Amz-Date,X-Api-Key",

  // Seguridad OWASP
  "Content-Security-Policy":
    "default-src 'self'; object-src 'none'; frame-ancestors 'none';",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};


export const createResponse = (statusCode, success, message, data = null) => {
  const body = {
    success,
    message,
  };

  if (data !== null) {
    body.data = data;
  }

  return {
    statusCode,
    body: JSON.stringify(body),
    headers: securityHeaders,
  };
};

export const successResponse = (
  data = null,
  message = null,
  statusCode = 200,
) => {
  const body = {
    success: true,
  };

  if (message !== null) {
    body.message = message;
  }

  if (data !== null) {
    body.data = data;
  }

  return {
    statusCode,
    body: JSON.stringify(body),
    headers: securityHeaders,
  };
};

export const errorResponse = (message, statusCode = 500, data = null) => {
  const body = {
    success: false,
    message,
  };

  if (data !== null) {
    body.data = data;
  }

  return {
    statusCode,
    body: JSON.stringify(body),
    headers: securityHeaders,
  };
};
