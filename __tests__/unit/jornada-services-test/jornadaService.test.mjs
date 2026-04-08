import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../src/functions/jornada-services/jornadaRepository.mjs', () => {
  return {
    JornadaRepository: jest.fn().mockImplementation(() => ({
      checkUnidadActiva: jest.fn(),
      checkConductorActivo: jest.fn(),
      create: jest.fn(),
    }))
  };
});

const { JornadaService } = await import('../../../src/functions/jornada-services/jornadaService.mjs');

describe('JornadaService - Pruebas', () => {
  let jornadaService;

  beforeEach(() => {
    jest.clearAllMocks();
    jornadaService = new JornadaService();
  });

  test('Debe lanzar error si la unidad ya tiene jornada (activa o en proceso)', async () => {
    jornadaService.repository.checkUnidadActiva.mockResolvedValue(true);
    const data = { conductor_id: 'uuid1', unidad_id: 'uuid2', contrato_id: 'uuid3', creado_por: 'admin1' };

    await expect(jornadaService.createJornada(data)).rejects.toThrow('La unidad ya tiene una jornada en proceso o registrada.');
    expect(jornadaService.repository.create).not.toHaveBeenCalled();
  });

  test('Debe lanzar error si el conductor ya esta en jornada (activa o en proceso)', async () => {
    jornadaService.repository.checkUnidadActiva.mockResolvedValue(false);
    jornadaService.repository.checkConductorActivo.mockResolvedValue(true);
    const data = { conductor_id: 'uuid1', unidad_id: 'uuid2', contrato_id: 'uuid3', creado_por: 'admin1' };

    await expect(jornadaService.createJornada(data)).rejects.toThrow('El conductor ya tiene una jornada en proceso o registrada.');
    expect(jornadaService.repository.create).not.toHaveBeenCalled();
  });

  test('Debe registrar jornada si todo esta disponible', async () => {
    jornadaService.repository.checkUnidadActiva.mockResolvedValue(false);
    jornadaService.repository.checkConductorActivo.mockResolvedValue(false);

    const dbResponse = {
      id: 'uuid99', conductor_id: 'uuid1', unidad_id: 'uuid2', contrato_id: 'uuid3', creado_por: 'admin1', estado: 'REGISTRADA'
    };
    jornadaService.repository.create.mockResolvedValue(dbResponse);

    const data = { conductor_id: 'uuid1', unidad_id: 'uuid2', contrato_id: 'uuid3', creado_por: 'admin1' };
    const result = await jornadaService.createJornada(data);

    expect(result.id).toBe('uuid99');
    expect(jornadaService.repository.create).toHaveBeenCalled();
  });
});
