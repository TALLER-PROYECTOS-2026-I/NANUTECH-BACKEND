import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let getAuditoriaResumenController, getAuditoriaRegistrosController, exportAuditoriaCsvController;
let getCurrentSession, obtenerResumenAuditoria, obtenerRegistrosAuditoria, generarCsvAuditoria;

jest.unstable_mockModule("../../../src/functions/auth-services/authService.mjs", () => ({
  getCurrentSession: jest.fn()
}));

jest.unstable_mockModule("../../../src/functions/auditoria-services/auditoriaService.mjs", () => ({
  obtenerResumenAuditoria: jest.fn(),
  obtenerRegistrosAuditoria: jest.fn(),
  generarCsvAuditoria: jest.fn()
}));

beforeAll(async () => {
  const authService = await import("../../../src/functions/auth-services/authService.mjs");
  getCurrentSession = authService.getCurrentSession;
  
  const auditoriaService = await import("../../../src/functions/auditoria-services/auditoriaService.mjs");
  obtenerResumenAuditoria = auditoriaService.obtenerResumenAuditoria;
  obtenerRegistrosAuditoria = auditoriaService.obtenerRegistrosAuditoria;
  generarCsvAuditoria = auditoriaService.generarCsvAuditoria;
  
  const auditoriaController = await import("../../../src/functions/auditoria-services/auditoriaController.mjs");
  getAuditoriaResumenController = auditoriaController.getAuditoriaResumenController;
  getAuditoriaRegistrosController = auditoriaController.getAuditoriaRegistrosController;
  exportAuditoriaCsvController = auditoriaController.exportAuditoriaCsvController;
});

beforeEach(() => {
  jest.clearAllMocks();
});

const mockAdminEvent = { headers: { Authorization: "Bearer token-admin" } };
const mockUserEvent = { headers: { Authorization: "Bearer token-user" } };

describe("auditoriaController", () => {
  describe("getAuditoriaResumenController", () => {
    it("debería retornar 403 si el token no es de administrador", async () => {
      getCurrentSession.mockResolvedValue({ role: "conductor" });
      const result = await getAuditoriaResumenController(mockUserEvent);
      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body).success).toBe(false);
    });

    it("debería retornar 200 y el resumen de auditoría", async () => {
      getCurrentSession.mockResolvedValue({ role: "admin" });
      obtenerResumenAuditoria.mockResolvedValue({ accesosHora: 10 });
      const result = await getAuditoriaResumenController(mockAdminEvent);
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).data).toEqual({ accesosHora: 10 });
    });
  });

  describe("getAuditoriaRegistrosController", () => {
    it("debería retornar los registros filtrados", async () => {
      getCurrentSession.mockResolvedValue({ role: "admin" });
      obtenerRegistrosAuditoria.mockResolvedValue([{ act_id: 1, usuario: "test" }]);
      
      const event = { ...mockAdminEvent, queryStringParameters: { search: "test", rol: "admin" } };
      const result = await getAuditoriaRegistrosController(event);
      
      expect(result.statusCode).toBe(200);
      expect(obtenerRegistrosAuditoria).toHaveBeenCalledWith("test", "admin");
      expect(JSON.parse(result.body).data).toEqual([{ act_id: 1, usuario: "test" }]);
    });
  });

  describe("exportAuditoriaCsvController", () => {
    it("debería retornar un CSV con status 200", async () => {
      getCurrentSession.mockResolvedValue({ role: "admin" });
      generarCsvAuditoria.mockResolvedValue("id,usuario\n1,test");
      
      const result = await exportAuditoriaCsvController(mockAdminEvent);
      expect(result.statusCode).toBe(200);
      expect(result.headers["Content-Type"]).toBe("text/csv; charset=utf-8");
      expect(result.body).toBe("id,usuario\n1,test");
    });
  });
});