import { DashboardConductoresRepository } from "./dashboardConductoresRepository.mjs";
import { DashboardConductor } from "./dashboardConductorModel.mjs";

// Capa de servicio de la HU10
export class DashboardConductoresService {
  constructor() {
    // Instancia el repositorio para acceder a la BD
    this.repository = new DashboardConductoresRepository();
  }

  // Obtiene toda la información del panel
  async getDashboardConductores(filtros = {}) {
    // Tarjetas principales
    const indicadores = await this.repository.getIndicadores();
    // Datos para gráfico de activos/inactivos
    const distribucionContrato = await this.repository.getDistribucionContrato();
    // Datos para gráfico de estados operacionales
    const estadoOperacional = await this.repository.getEstadoOperacional();
    // Listado de conductores con filtros
    const conductoresRows = await this.repository.findAllConductores(filtros);

    // Convierte las filas de BD al modelo de respuesta
    const conductores = DashboardConductor.fromDatabaseList(conductoresRows);

    // Retorna la información procesada del dashboard hacia el controller,
    // para que posteriormente sea enviada como respuesta al frontend
    return {
      indicadores,
      graficos: {
        distribucionContrato,
        estadoOperacional,
      },
      conductores,
      mensajeSinResultados:
        conductores.length === 0 ? "No se encontraron conductores" : null,
    };
  }
}