import { DashboardConductoresRepository } from "./dashboardConductoresRepository.mjs";
import { DashboardConductor } from "./dashboardConductorModel.mjs";

// Capa de servicio de la HU10
export class DashboardConductoresService {
  // Inicializa el repositorio encargado
  constructor() {
    // Instancia el repositorio para acceder a la BD
    this.repository = new DashboardConductoresRepository();
  }

  // Solo tarjetas e indicadores del dashboard
  // Se separó del listado para mejorar
  // el rendimiento y reducir el tiempo
  // de respuesta del dashboard.
  async getResumenDashboard() {
    // Obtiene tarjetas resumen
    const indicadores = await this.repository.getIndicadores();

    // Obtiene datos para Pie Chart
    const distribucionContrato = await this.repository.getDistribucionContrato();

    // Obtiene datos para Bar Chart
    const estadoOperacional = await this.repository.getEstadoOperacional();

    // Retorna información consolidada
    return {
      indicadores,
      graficos: {
        distribucionContrato,
        estadoOperacional,
      },
    };
  }

  // Solo listado paginado de conductores
  // La paginación fue implementada para:
  // - reducir carga del backend
  // - optimizar tiempos de respuesta
  // - soportar mejor concurrencia
  async getListadoConductores(filtros = {}) {
    // Convierte page y limit a número
    const page = Number(filtros.page || 1);
    const limit = Number(filtros.limit || 20);

    // Obtiene solo los registros necesarios
    // según page y limit
    const conductoresRows = await this.repository.findAllConductores({
      ...filtros,
      page,
      limit,
    });

    // Se utiliza para construir la paginación
    const total = await this.repository.countConductores(filtros);

    // Convierte filas de PostgreSQL
    const conductores = DashboardConductor.fromDatabaseList(conductoresRows);

    return {
      // Lista de conductores
      conductores,
      // Información de paginación
      paginacion: {
        page,
        limit,
        total,
        // Total de páginas disponibles
        totalPaginas: Math.ceil(total / limit),
      },
      // Mensaje cuando no existen resultados
      mensajeSinResultados: conductores.length === 0 ? "No se encontraron conductores" : null,
    };
  }
}
