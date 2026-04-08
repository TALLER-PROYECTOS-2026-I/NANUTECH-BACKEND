import { jest } from '@jest/globals';

const mockCreateJornada = jest.fn();

jest.unstable_mockModule('../../../src/functions/jornada-services/jornadaService.mjs', () => ({
  JornadaService: jest.fn().mockImplementation(() => ({
    createJornada: mockCreateJornada,
  }))
}));

const { createJornadaController } = await import('../../../src/functions/jornada-services/jornadaController.mjs');

describe('JornadaController - Pruebas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Exito: debe regresar statusCode 201', async () => {
    mockCreateJornada.mockResolvedValue({ id: 'uuid99', estado: 'REGISTRADA' });
    const event = { body: JSON.stringify({ conductor_id: 'c', unidad_id: 'u', contrato_id: 'co', creado_por: 'a' }) };

    const res = await createJornadaController(event);
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).message).toBe('Jornada registrada exitosamente.');
  });

  test('Error 400 si faltan parametros', async () => {
    mockCreateJornada.mockRejectedValue(new Error('requerido'));
    const event = { body: JSON.stringify({}) };

    const res = await createJornadaController(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).message).toBe('requerido');
  });

  test('Toma creado_por desde authorizer (Cognito) si no viene en body', async () => {
    mockCreateJornada.mockResolvedValue({ id: 'uuid99' });
    const event = { 
        body: JSON.stringify({ conductor_id: 'c', unidad_id: 'u', contrato_id: 'co' }),
        requestContext: { authorizer: { claims: { sub: 'cognito-sub-123' } } }
    };

    const res = await createJornadaController(event);
    expect(mockCreateJornada).toHaveBeenCalledWith(expect.objectContaining({
        creado_por: 'cognito-sub-123'
    }));
    expect(res.statusCode).toBe(201);
  });
});
