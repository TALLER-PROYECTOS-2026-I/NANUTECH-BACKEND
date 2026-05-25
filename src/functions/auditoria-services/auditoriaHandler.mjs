/**
 * Handler: Auditoría de Accesos
 * HU13 - Punto de entrada Lambda para API Gateway
 *
 * Rutas registradas en template.yaml (AuditoriaFunction):
 *   GET /dashboard/auditoria  → getAuditoria (solo ADMIN)
 *
 * Patrón idéntico al de los demás handlers del proyecto.
 */

import { errorResponse } from '../../shared/utils/response/response.mjs';
import { getAuditoria } from './auditoriaController.mjs';

// ─── Tabla de rutas ───────────────────────────────────────────────────────────
const routes = {
  'GET /dashboard/auditoria': getAuditoria,
};

// ─── Entry point Lambda ───────────────────────────────────────────────────────
export const handler = async (event) => {
  const routeKey = `${event.httpMethod} ${event.resource}`;
  const controller = routes[routeKey];

  if (!controller) {
    return errorResponse('Ruta no encontrada', 404, { code: 'ROUTE_NOT_FOUND' });
  }

  return await controller(event);
};
