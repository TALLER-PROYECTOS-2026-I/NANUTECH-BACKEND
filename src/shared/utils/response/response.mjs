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
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
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
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
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
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  };
};
