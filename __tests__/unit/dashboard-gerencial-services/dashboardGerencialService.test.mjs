import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

const mockRepository = {
  getResumen: jest.fn(),
  getGraficas: jest.fn(),
  getOperaciones: jest.fn(),
  getRendimiento: jest.fn(),
  getHistorial: jest.fn()
};

jest.unstable_mockModule('../../../src/functions/dashboard-gerencial-services/dashboardGerencialRepository.mjs', () => ({
  dashboardGerencialRepository: mockRepository
}));

const mockBuildResponse = jest.fn();

jest.unstable_mockModule('../../../src/functions/dashboard-gerencial-services/dashboardGerencialModel.mjs', () => ({
  buildDashboardGerencialResponse: mockBuildResponse
}));

let getDashboardGerencialService;
let dashboardGerencialRepository;
let buildDashboardGerencialResponse;

beforeAll(async () => {
  ({ dashboardGerencialRepository } = await import('../../../src/functions/dashboard-gerencial-services/dashboardGerencialRepository.mjs'));
  ({ buildDashboardGerencialResponse } = await import('../../../src/functions/dashboard-gerencial-services/dashboardGerencialModel.mjs'));
  ({ getDashboardGerencialService } = await import('../../../src/functions/dashboard-gerencial-services/dashboardGerencialService.mjs'));
});

describe('Dashboard Gerencial - Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería consultar el pipeline del repositorio y construir la respuesta', async () => {
    dashboardGerencialRepository.getResumen.mockResolvedValue({ totalJornadas: 10 });
    dashboardGerencialRepository.getGraficas.mockResolvedValue({ values: [1,2,3] });
    dashboardGerencialRepository.getOperaciones.mockResolvedValue({ status: 'ok' });
    dashboardGerencialRepository.getRendimiento.mockResolvedValue({ obj: 'test' });
    dashboardGerencialRepository.getHistorial.mockResolvedValue([{ id: 1 }]);

    buildDashboardGerencialResponse.mockReturnValue('FORMATTED_RESPONSE');

    const result = await getDashboardGerencialService('mes', 'camion-ab');

    expect(dashboardGerencialRepository.getResumen).toHaveBeenCalledWith('mes');
    expect(dashboardGerencialRepository.getGraficas).toHaveBeenCalledWith('mes');
    expect(dashboardGerencialRepository.getOperaciones).toHaveBeenCalled();
    expect(dashboardGerencialRepository.getRendimiento).toHaveBeenCalledWith('mes');
    expect(dashboardGerencialRepository.getHistorial).toHaveBeenCalledWith('mes', 'camion-ab');

    expect(buildDashboardGerencialResponse).toHaveBeenCalledWith(
      { totalJornadas: 10 },
      { values: [1,2,3] },
      { status: 'ok' },
      { obj: 'test' },
      [{ id: 1 }]
    );

    expect(result).toBe('FORMATTED_RESPONSE');
  });

  it('debería propagar errores si algún repositorio falla', async () => {
    dashboardGerencialRepository.getResumen.mockRejectedValue(new Error('Fallo la base de datos'));
    
    await expect(getDashboardGerencialService('hoy', ''))
      .rejects
      .toThrow('Fallo la base de datos');
      
    expect(buildDashboardGerencialResponse).not.toHaveBeenCalled();
  });
});
