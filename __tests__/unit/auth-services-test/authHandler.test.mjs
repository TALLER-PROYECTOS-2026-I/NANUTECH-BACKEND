import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";

let authHandler;
let authRepository;

beforeAll(async () => {
  ({ handler: authHandler } = await import(
    "../../../src/functions/auth-services/authHandler.mjs"
  ));
  authRepository = await import(
    "../../../src/functions/auth-services/authRepository.mjs"
  );
});

describe("AuthHandler", () => {
  beforeEach(async () => {
    delete process.env.AUTH_PROVIDER;
    delete process.env.COGNITO_USER_POOL_ID;
    delete process.env.COGNITO_CLIENT_ID;
    process.env.SESSION_TIMEOUT_SECONDS = "7200";
    await authRepository.resetUsersState();
  });

  it("responde login exitoso en la ruta /auth/login", async () => {
    const response = await authHandler({
      httpMethod: "POST",
      resource: "/auth/login",
      body: JSON.stringify({
        email: "test@test.com",
        password: "123456",
      }),
      headers: {},
    });

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user.role).toBe("admin");
    expect(body.data.session.accessToken).toBeTruthy();
  });

  it("valida token en /auth/me y devuelve el perfil usable por el cliente", async () => {
    const loginResponse = await authHandler({
      httpMethod: "POST",
      resource: "/auth/login",
      body: JSON.stringify({
        email: "chofer@test.com",
        password: "123456",
      }),
      headers: {},
    });
    const loginBody = JSON.parse(loginResponse.body);

    const meResponse = await authHandler({
      httpMethod: "GET",
      resource: "/auth/me",
      headers: {
        Authorization: `Bearer ${loginBody.data.session.accessToken}`,
      },
    });
    const meBody = JSON.parse(meResponse.body);

    expect(meResponse.statusCode).toBe(200);
    expect(meBody.data.user).toEqual({
      email: "chofer@test.com",
      role: "chofer",
    });
    expect(meBody.data.nextRoute).toBe("/dashboard/chofer");
  });

  it("retorna error 404 para rutas auth no registradas", async () => {
    const response = await authHandler({
      httpMethod: "GET",
      resource: "/auth/desconocida",
      headers: {},
    });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.success).toBe(false);
    expect(body.data.code).toBe("ROUTE_NOT_FOUND");
  });
});
