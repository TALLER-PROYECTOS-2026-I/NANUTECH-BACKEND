import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

let registrarAcceso, obtenerResumenAuditoria, obtenerRegistrosAuditoria, generarCsvAuditoria;
let insertAuditoriaAcceso, getResumenAccesosDB, getRegistrosDB;

jest.unstable_mockModule("../../../src/functions/auditoria-services/auditoriaRepository.mjs", () => ({
  insertAuditoriaAcceso: jest.fn(),
  getResumenAccesosDB: jest.fn(),
  getRegistrosDB: jest.fn()
}));

beforeAll(async () => {
  const repo = await import("../../../src/functions/auditoria-services/auditoriaRepository.mjs");
  insertAuditoriaAcceso = repo.insertAuditoriaAcceso;
  getResumenAccesosDB = repo.getResumenAccesosDB;
  getRegistrosDB = repo.getRegistrosDB;

  const service = await import("../../../src/functions/auditoria-services/auditoriaService.mjs");
  registrarAcceso = service.registrarAcceso;
  obtenerResumenAuditoria = service.obtenerResumenAuditoria;
  obtenerRegistrosAuditoria = service.obtenerRegistrosAuditoria;
  generarCsvAuditoria = service.generarCsvAuditoria;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("auditoriaService", () => {
  describe("registrarAcceso", () => {
    it("no debe registrar si no hay un id usuario", async () => {
      await registrarAcceso({}, { email: "test@test.com" });
      expect(insertAuditoriaAcceso).not.toHaveBeenCalled();
    });

    it("debe registrar con IP del header", async () => {
      await registrarAcceso({
        headers: { "X-Forwarded-For": "192.168.0.1", "User-Agent": "Mozilla" }
      }, { id: 1, email: "test@test.com" });

      expect(insertAuditoriaAcceso).toHaveBeenCalledWith(1, "192.168.0.1", "Mozilla");
    });
  });

  describe("obtenerResumenAuditoria", () => {
    it("debe retornar el resumen y progreso roles", async () => {
      getResumenAccesosDB.mockResolvedValue({
        metricas: { total_accesos: "5", accesos_hoy: "2" },
        roles: [{ rol: "ADMINISTRADOR", cantidad: "3" }, { rol: "CHOFER", cantidad: "1" }]
      });

      const result = await obtenerResumenAuditoria();
      expect(result.metricas.total_accesos).toBe(5);
      expect(result.progreso_roles).toEqual({ ADMINISTRADOR: 3, GERENTE: 0, CHOFER: 1 });
    });
  });

  describe("obtenerRegistrosAuditoria", () => {
    it("debe retornar registros parseados correctamente", async () => {
      const dbResponse = [{
        id_registro: 1,
        usuario: "Juan Perez",
        email: "juan@test.com",
        rol: "ADMINISTRADOR",
        fecha_hora: "2026-05-24T15:30:00.000Z",
        direccion_ip: "10.0.0.1",
        navegador: "Chrome"
      }];
      getRegistrosDB.mockResolvedValue(dbResponse);

      const result = await obtenerRegistrosAuditoria();
      expect(result).toHaveLength(1);
      expect(result[0].fecha).toBe("24/05/2026");
      expect(result[0].hora).toBe("10:30:00"); // asumiendo UTC-5 de desface al parselo por defecto pero vamos a verificar las partes existan
      expect(result[0].id_registro).toBe(1);
    });
  });

  describe("generarCsvAuditoria", () => {
    it("debe exportar la lista de registros en formato CSV", async () => {
      getRegistrosDB.mockResolvedValue([{
        id_registro: 1,
        usuario: "Juan Perez",
        email: "juan@test.com",
        rol: "ADMINISTRADOR",
        fecha_hora: "2026-05-24T15:30:00.000Z",
        direccion_ip: "10.0.0.1",
        navegador: "Chrome"
      }]);

      const result = await generarCsvAuditoria();
      expect(result).toContain("1,Juan Perez,juan@test.com,ADMINISTRADOR,24/05/2026");
      expect(result).toContain("10.0.0.1,\"Chrome\"");
    });
  });
});