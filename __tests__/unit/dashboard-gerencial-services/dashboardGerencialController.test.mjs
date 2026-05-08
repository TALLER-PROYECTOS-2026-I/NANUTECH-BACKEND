import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

jest.unstable_mockModule('../../../src/functions/dashboard-gerencial-services/dashboardGerencialService.mjs', () => ({
  getDashboardGerencialService: jest.fn()
}));

jest.unstable_mockModule('../../../src/functions/auth-services/authService.mjs', () => ({
  getCurrentSession: jest.fn()
}));

let getDashboardGerencialController;
let getDashboardGerencialService;
let getCurrentSession;

beforeAll(async () => {
  ({ getDashboardGerencialService } = await import('../../../src/functions/dashboard-gerencial-services/dashboardGerencialService.mjs'));
  ({ getCurrentSession } = await import('../../../src/functions/auth-services/authService.mjs'));
  ({ getDashboardGerencialController } = await import('../../../src/functions/dashboard-gerencial-services/dashboardGerencialController.mjs'));
});

describe('Dashboard Gerencial - Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const generateEvent = (role = 'gerente', hasToken = true) => ({
    headers: hasToken ? { Authorization: 'Bearer test-token' } : {},
    queryStringParameters: { tiempo: 'hoy', search: '123' },
    requestContext: {}
  });

  it('debería retornar 401 si no hay token de Authorization', async () => {
    const event = generateEvent('gerente', false);
    const result = await getDashboardGerencialController(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).message).toBe('Token requerido');
  });

  it('debería retornar 403 si el rol no es gerente o admin', async () => {
    const event = generateEvent('chofer', true);
    getCurrentSession.mockResolvedValue({ role: 'chofer' });

    const result = await getDashboardGerencialController(event);

    expect(getCurrentSession).toHaveBeenCalledWith('Bearer test-token');
    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('Solo Gerencia o Administrador puede acceder');
  });

  it('debería retornar 200 y llamar al servicio con filtros correctos si es gerente', async () => {
    const event = generateEvent('gerente', true);
    getCurrentSession.mockResolvedValue({ role: 'gerente' });
    
    getDashboardGerencialService.mockResolvedValue({ resumen: { total: 10 } });

    const result = await getDashboardGerencialController(event);

    expect(getDashboardGerencialService).toHaveBeenCalledWith('hoy', '123');
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.resumen.total).toBe(10);
  });

  it('debería manejar errores y retornar 500', async () => {
    const event = generateEvent('gerente', true);
    getCurrentSession.mockResolvedValue({ role: 'gerente' });
    getDashboardGerencialService.mockRejectedValue(new Error('DB Error'));

    const result = await getDashboardGerencialController(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('Error interno del servidor');
  });
});
