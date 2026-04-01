import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

let authService;
let authRepository;

beforeAll(async () => {
  authService = await import(
    "../../../src/functions/auth-services/authService.mjs"
  );
  authRepository = await import(
    "../../../src/functions/auth-services/authRepository.mjs"
  );
});

describe("AuthService", () => {
  beforeEach(async () => {
    delete process.env.AUTH_PROVIDER;
    delete process.env.COGNITO_USER_POOL_ID;
    delete process.env.COGNITO_CLIENT_ID;
    process.env.SESSION_TIMEOUT_SECONDS = "7200";
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
    expect(result.nextRoute).toBe("/dashboard/admin");
    expect(result.session.provider).toBe("local");
    expect(result.session.accessToken).toBeTruthy();
    expect(result.session.idleTimeoutSeconds).toBe(7200);
  });

  it("mantiene la lógica de bloqueo tras 5 intentos fallidos", async () => {
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

  it("expone la sesión actual cuando el token es válido", async () => {
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
    expect(session.nextRoute).toBe("/dashboard/chofer");
    expect(session.session.isAuthenticated).toBe(true);
  });

  it("marca la sesión como expirada cuando el token supera el timeout", async () => {
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
});
