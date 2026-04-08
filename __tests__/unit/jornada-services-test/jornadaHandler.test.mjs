import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../src/functions/jornada-services/jornadaController.mjs', () => ({
  createJornadaController: jest.fn(),
}));

const { handler } = await import('../../../src/functions/jornada-services/jornadaHandler.mjs');
const { createJornadaController } = await import('../../../src/functions/jornada-services/jornadaController.mjs');

describe('JornadaHandler - Rutas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Debe llamar a createJornadaController si el metod es POST', async () => {
    createJornadaController.mockResolvedValue({ statusCode: 201 });
    const event = { requestContext: { http: { method: 'POST' } } };
    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    expect(createJornadaController).toHaveBeenCalled();
  });

  test('Debe regresar 404 si el metodo NO es POST', async () => {
    const event = { requestContext: { http: { method: 'GET' } } };
    const res = await handler(event);
    expect(res.statusCode).toBe(404);
  });
});
