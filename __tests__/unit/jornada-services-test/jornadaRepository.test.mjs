import { jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockRelease = jest.fn();

jest.unstable_mockModule('../../../src/shared/config/database.mjs', () => ({
  getClient: jest.fn().mockResolvedValue({
    query: mockQuery,
    release: mockRelease,
  })
}));

const { JornadaRepository } = await import('../../../src/functions/jornada-services/jornadaRepository.mjs');

describe('JornadaRepository - Pruebas', () => {
  let repo;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new JornadaRepository();
  });

  test('Debe llamar al SQL correcto en create()', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: '123' }] });
    const payload = { conductor_id: 'c', unidad_id: 'u', contrato_id: 'co', creado_por: 'cre', origen: 'Lima', destino: 'Ica', observaciones: 'obs' };
    
    const result = await repo.create(payload);
    
    expect(mockQuery).toHaveBeenCalled();
    expect(mockQuery.mock.calls[0][1]).toEqual(['c', 'u', 'co', 'cre', 'Lima', 'Ica', 'obs']);
    expect(result.id).toBe('123');
    expect(mockRelease).toHaveBeenCalled();
  });

  test('checkUnidadActiva debe retornar true si existe jornada', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: '99' }] });
    
    const rs = await repo.checkUnidadActiva('uuid1');
    
    expect(rs).toBe(true);
    expect(mockQuery.mock.calls[0][1]).toEqual(['uuid1']);
    expect(mockRelease).toHaveBeenCalled();
  });

  test('checkConductorActivo debe retornar false si no existe jornada', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    
    const rs = await repo.checkConductorActivo('uuid9');
    
    expect(rs).toBe(false);
    expect(mockRelease).toHaveBeenCalled();
  });
});
