export function buildApiGatewayEvent({
  method = "GET",
  resource = "/",
  pathParameters = null,
  queryStringParameters = null,
  body = null,
} = {}) {
  return {
    httpMethod: method,
    resource,
    pathParameters,
    queryStringParameters,
    body: body ? JSON.stringify(body) : null,
    requestContext: {
      http: {
        method,
      },
    },
  };
}