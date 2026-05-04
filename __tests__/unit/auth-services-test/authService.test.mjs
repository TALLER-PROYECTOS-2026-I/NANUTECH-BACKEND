import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  GetUserCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { mockClient } from "aws-sdk-client-mock";

const mockDbQuery = jest.fn();

jest.unstable_mockModule("../../../src/shared/config/database.mjs", () => ({
  default: {
    query: mockDbQuery,
  },
  query: mockDbQuery,
  getClient: jest.fn(),
  closePool: jest.fn(),
}));

let authService;
let authRepository;
const cognitoClientMock = mockClient(CognitoIdentityProviderClient);

const createJwtLikeToken = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
    .toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
};

const buildDbUser = (overrides = {}) => ({
  id: "user-1",
  cognito_sub: "real-sub-001",
  correo: "admin@nanutech.com",
  nombres: "Jimena",
  apellidos: "Rodriguez",
  rol: "ADMIN",
  estado: "ACTIVO",
  ultimo_acceso: null,
  ...overrides,
});

beforeAll(async () => {
  authRepository = await import(
    "../../../src/functions/auth-services/authRepository.mjs"
  );
  authService = await import(
    "../../../src/functions/auth-services/authService.mjs"
  );
});

describe("AuthService", () => {
  beforeEach(async () => {
    delete process.env.AUTH_PROVIDER;
    delete process.env.COGNITO_USER_POOL_ID;
    delete process.env.COGNITO_CLIENT_ID;
    delete process.env.AWS_REGION;
    process.env.SESSION_TIMEOUT_SECONDS = "7200";
    mockDbQuery.mockReset();
    cognitoClientMock.reset();
    await authRepository.resetUsersState();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("retorna login estructurado con token y rol en modo local", async () => {
    const result = await authService.handleLoginAttempt(
      "test@test.com",
      "123456",
    );

    expect(result.user).toEqual({
      email: "test@test.com",
      role: "admin",
    });
    expect(result.role).toBe("admin");
    expect(result.nextRoute).toBe("/dashboard/admin");
    expect(result.session.provider).toBe("local");
    expect(result.session.accessToken).toBeTruthy();
    expect(result.session.idleTimeoutSeconds).toBe(7200);
  });

  it("mantiene la logica de bloqueo tras 5 intentos fallidos", async () => {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(
        authService.handleLoginAttempt("test@test.com", "incorrecta"),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
      });
    }

    await expect(
      authService.handleLoginAttempt("test@test.com", "incorrecta"),
    ).rejects.toMatchObject({
      statusCode: 423,
      code: "ACCOUNT_LOCKED",
    });
  });

  it("expone la sesion actual cuando el token es valido", async () => {
    const login = await authService.handleLoginAttempt(
      "chofer@test.com",
      "123456",
    );

    const session = await authService.getCurrentSession(
      `Bearer ${login.session.accessToken}`,
    );

    expect(session.user).toEqual({
      email: "chofer@test.com",
      role: "chofer",
    });
    expect(session.role).toBe("chofer");
    expect(session.nextRoute).toBe("/dashboard/chofer");
    expect(session.session.isAuthenticated).toBe(true);
  });

  it("marca la sesion como expirada cuando el token supera el timeout", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-01T10:00:00.000Z"));
    process.env.SESSION_TIMEOUT_SECONDS = "1";

    const login = await authService.handleLoginAttempt(
      "test@test.com",
      "123456",
    );

    jest.setSystemTime(new Date("2026-04-01T10:00:02.000Z"));

    await expect(
      authService.getCurrentSession(`Bearer ${login.session.accessToken}`),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "TOKEN_EXPIRED",
    });
  });

  it("mantiene forgot password usable en modo local", async () => {
    const result = await authService.handleForgotPassword("test@test.com");

    expect(result.provider).toBe("local");
    expect(result.email).toBe("test@test.com");
    expect(result.message).toContain("simulado");
  });

  it("confirma forgot password en modo local y permite login con la nueva contrasena", async () => {
    await authService.handleForgotPassword("test@test.com");

    const result = await authService.handleConfirmForgotPassword(
      "test@test.com",
      "123456",
      "NuevaClave123",
    );

    expect(result).toEqual({
      email: "test@test.com",
      provider: "local",
      message: "La contrasena fue actualizada",
    });

    await expect(
      authService.handleLoginAttempt("test@test.com", "123456"),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });

    const login = await authService.handleLoginAttempt(
      "test@test.com",
      "NuevaClave123",
    );
    expect(login.user.email).toBe("test@test.com");
  });

  it("rechaza confirm forgot password local con codigo invalido", async () => {
    await authService.handleForgotPassword("test@test.com");

    await expect(
      authService.handleConfirmForgotPassword(
        "test@test.com",
        "999999",
        "NuevaClave123",
      ),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "RESET_CODE_INVALID",
    });
  });

  it("usa el provider Cognito para confirmar recuperacion cuando el modo es cognito", async () => {
    process.env.AUTH_PROVIDER = "cognito";
    process.env.COGNITO_USER_POOL_ID = "pool-id";
    process.env.COGNITO_CLIENT_ID = "client-id";
    process.env.AWS_REGION = "us-east-1";

    cognitoClientMock.on(ConfirmForgotPasswordCommand).resolves({});

    const result = await authService.handleConfirmForgotPassword(
      "test@test.com",
      "123456",
      "NuevaClave123",
    );

    expect(result.provider).toBe("cognito");
    expect(result.message).toBe("La contraseña fue actualizada");
  });

  it("resuelve login Cognito usando el usuario encontrado por cognito_sub", async () => {
    process.env.AUTH_PROVIDER = "cognito";
    process.env.COGNITO_USER_POOL_ID = "pool-id";
    process.env.COGNITO_CLIENT_ID = "client-id";
    process.env.AWS_REGION = "us-east-1";

    const idToken = createJwtLikeToken({
      sub: "real-sub-001",
      email: "admin@nanutech.com",
      "custom:role": "chofer",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const accessToken = createJwtLikeToken({
      sub: "real-sub-001",
      username: "admin@nanutech.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    cognitoClientMock.on(InitiateAuthCommand).resolves({
      AuthenticationResult: {
        AccessToken: accessToken,
        IdToken: idToken,
        ExpiresIn: 3600,
      },
    });

    mockDbQuery
      .mockResolvedValueOnce({ rows: [buildDbUser()] })
      .mockResolvedValueOnce({ rows: [buildDbUser({ ultimo_acceso: "2026-04-05T10:00:00.000Z" })] });

    const result = await authService.handleLoginAttempt(
      "admin@nanutech.com",
      "123456",
    );

    expect(result.user).toEqual({
      id: "user-1",
      email: "admin@nanutech.com",
      nombres: "Jimena",
      apellidos: "Rodriguez",
      role: "admin",
      estado: "ACTIVO",
    });
    expect(result.role).toBe("admin");
    expect(result.nextRoute).toBe("/dashboard/admin");
    expect(result.session.provider).toBe("cognito");
    expect(mockDbQuery).toHaveBeenCalledTimes(2);
  });

  it("resuelve login Cognito por correo y vincula el cognito_sub cuando el perfil tiene placeholder", async () => {
    process.env.AUTH_PROVIDER = "cognito";
    process.env.COGNITO_USER_POOL_ID = "pool-id";
    process.env.COGNITO_CLIENT_ID = "client-id";
    process.env.AWS_REGION = "us-east-1";

    const idToken = createJwtLikeToken({
      sub: "real-sub-999",
      email: "admin@nanutech.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const accessToken = createJwtLikeToken({
      sub: "real-sub-999",
      username: "admin@nanutech.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    cognitoClientMock.on(InitiateAuthCommand).resolves({
      AuthenticationResult: {
        AccessToken: accessToken,
        IdToken: idToken,
        ExpiresIn: 3600,
      },
    });

    mockDbQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [buildDbUser({ cognito_sub: "cognito-admin-001" })] })
      .mockResolvedValueOnce({ rows: [buildDbUser({ cognito_sub: "real-sub-999" })] })
      .mockResolvedValueOnce({ rows: [buildDbUser({ cognito_sub: "real-sub-999", ultimo_acceso: "2026-04-05T10:00:00.000Z" })] });

    const result = await authService.handleLoginAttempt(
      "admin@nanutech.com",
      "123456",
    );

    expect(result.role).toBe("admin");
    expect(result.user.role).toBe("admin");
    expect(mockDbQuery).toHaveBeenCalledTimes(4);
    expect(mockDbQuery.mock.calls[2][0]).toContain("UPDATE usuarios");
  });

  it("rechaza login Cognito cuando el usuario no existe en la tabla usuarios", async () => {
    process.env.AUTH_PROVIDER = "cognito";
    process.env.COGNITO_USER_POOL_ID = "pool-id";
    process.env.COGNITO_CLIENT_ID = "client-id";
    process.env.AWS_REGION = "us-east-1";

    const idToken = createJwtLikeToken({
      sub: "real-sub-404",
      email: "missing@nanutech.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const accessToken = createJwtLikeToken({
      sub: "real-sub-404",
      username: "missing@nanutech.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    cognitoClientMock.on(InitiateAuthCommand).resolves({
      AuthenticationResult: {
        AccessToken: accessToken,
        IdToken: idToken,
        ExpiresIn: 3600,
      },
    });

    mockDbQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    await expect(
      authService.handleLoginAttempt("missing@nanutech.com", "123456"),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "USER_NOT_PROVISIONED",
    });
  });

  it("rechaza login Cognito cuando el usuario interno esta INACTIVO", async () => {
    process.env.AUTH_PROVIDER = "cognito";
    process.env.COGNITO_USER_POOL_ID = "pool-id";
    process.env.COGNITO_CLIENT_ID = "client-id";
    process.env.AWS_REGION = "us-east-1";

    const idToken = createJwtLikeToken({
      sub: "real-sub-001",
      email: "admin@nanutech.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const accessToken = createJwtLikeToken({
      sub: "real-sub-001",
      username: "admin@nanutech.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    cognitoClientMock.on(InitiateAuthCommand).resolves({
      AuthenticationResult: {
        AccessToken: accessToken,
        IdToken: idToken,
        ExpiresIn: 3600,
      },
    });

    mockDbQuery.mockResolvedValueOnce({
      rows: [buildDbUser({ estado: "INACTIVO" })],
    });

    await expect(
      authService.handleLoginAttempt("admin@nanutech.com", "123456"),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "USER_INACTIVE",
    });
  });

  it("rechaza login Cognito cuando el usuario interno esta BLOQUEADO", async () => {
    process.env.AUTH_PROVIDER = "cognito";
    process.env.COGNITO_USER_POOL_ID = "pool-id";
    process.env.COGNITO_CLIENT_ID = "client-id";
    process.env.AWS_REGION = "us-east-1";

    const idToken = createJwtLikeToken({
      sub: "real-sub-001",
      email: "admin@nanutech.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const accessToken = createJwtLikeToken({
      sub: "real-sub-001",
      username: "admin@nanutech.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    cognitoClientMock.on(InitiateAuthCommand).resolves({
      AuthenticationResult: {
        AccessToken: accessToken,
        IdToken: idToken,
        ExpiresIn: 3600,
      },
    });

    mockDbQuery.mockResolvedValueOnce({
      rows: [buildDbUser({ estado: "BLOQUEADO" })],
    });

    await expect(
      authService.handleLoginAttempt("admin@nanutech.com", "123456"),
    ).rejects.toMatchObject({
      statusCode: 423,
      code: "USER_BLOCKED",
    });
  });

  it("expone /auth/me Cognito con el perfil interno final", async () => {
    process.env.AUTH_PROVIDER = "cognito";
    process.env.COGNITO_USER_POOL_ID = "pool-id";
    process.env.COGNITO_CLIENT_ID = "client-id";
    process.env.AWS_REGION = "us-east-1";

    const accessToken = createJwtLikeToken({
      sub: "real-sub-001",
      username: "admin@nanutech.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    cognitoClientMock.on(GetUserCommand).resolves({
      UserAttributes: [
        { Name: "email", Value: "admin@nanutech.com" },
        { Name: "custom:role", Value: "CHOFER" },
      ],
    });

    mockDbQuery.mockResolvedValueOnce({
      rows: [buildDbUser({ rol: "CHOFER" })],
    });

    const result = await authService.getCurrentSession(`Bearer ${accessToken}`);

    expect(result.user).toEqual({
      id: "user-1",
      email: "admin@nanutech.com",
      nombres: "Jimena",
      apellidos: "Rodriguez",
      role: "chofer",
      estado: "ACTIVO",
    });
    expect(result.role).toBe("chofer");
    expect(result.nextRoute).toBe("/dashboard/chofer");
    expect(result.session.provider).toBe("cognito");
  });

  it("propaga el error traducido del provider Cognito al confirmar recuperacion", async () => {
    process.env.AUTH_PROVIDER = "cognito";
    process.env.COGNITO_USER_POOL_ID = "pool-id";
    process.env.COGNITO_CLIENT_ID = "client-id";
    process.env.AWS_REGION = "us-east-1";

    cognitoClientMock
      .on(ConfirmForgotPasswordCommand)
      .rejects({ name: "CodeMismatchException" });

    await expect(
      authService.handleConfirmForgotPassword(
        "test@test.com",
        "999999",
        "NuevaClave123",
      ),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "RESET_CODE_INVALID",
    });
  });
});
