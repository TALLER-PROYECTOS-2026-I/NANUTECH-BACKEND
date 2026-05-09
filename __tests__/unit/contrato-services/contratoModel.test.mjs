import { describe, it, expect } from "@jest/globals";
import { Contrato } from "../../../src/functions/contrato-services/contratoModel.mjs";

describe("ContratoModel", () => {
  const row = {
    id: "con-1",
    codigo: "CONT-001",
    cliente: "Empresa ABC",
    descripcion: "Servicio mensual",
    fecha_inicio: "2026-05-01",
    fecha_fin: "2026-08-01",
    tarifa: "1200.50",
    moneda: "PEN",
    estado: "VIGENTE",
    activo: true,
    ruc: "12345678901",
    tipo_servicio: "POR_KM",
    origen: "Arequipa",
    destino: "Matarani",
    distancia_estimada_km: "180.00",
    tarifa_por_km: "5.00",
    tarifa_por_hora: "30.00",
    tarifa_espera: "20.00",
    total_referencial: "900.00",
  };

  it("crea una instancia completa desde una fila de base de datos", () => {
    const contrato = Contrato.fromDatabase(row);

    expect(contrato).toBeInstanceOf(Contrato);
    expect(contrato).toMatchObject({
      id: "con-1",
      codigo: "CONT-001",
      cliente: "Empresa ABC",
      descripcion: "Servicio mensual",
      fecha_inicio: "2026-05-01",
      fecha_fin: "2026-08-01",
      tarifa: "1200.50",
      moneda: "PEN",
      estado: "VIGENTE",
      activo: true,
      ruc: "12345678901",
      tipo_servicio: "POR_KM",
      ruta: {
        origen: "Arequipa",
        destino: "Matarani",
        distancia_estimada_km: "180.00",
      },
      tarifas: {
        tarifa_por_km: "5.00",
        tarifa_por_hora: "30.00",
        tarifa_espera: "20.00",
        total_referencial: "900.00",
      },
    });
  });

  it("usa null en ruta y tarifas cuando la fila no trae datos opcionales", () => {
    const contrato = Contrato.fromDatabase({
      id: "con-2",
      codigo: "CONT-002",
      cliente: "Empresa XYZ",
      descripcion: null,
      fecha_inicio: "2026-05-01",
      fecha_fin: null,
      tarifa: "0.00",
      moneda: "PEN",
      estado: "VIGENTE",
      activo: true,
    });

    expect(contrato.ruc).toBeNull();
    expect(contrato.tipo_servicio).toBeNull();
    expect(contrato.ruta).toEqual({
      origen: null,
      destino: null,
      distancia_estimada_km: null,
    });
    expect(contrato.tarifas).toEqual({
      tarifa_por_km: null,
      tarifa_por_hora: null,
      tarifa_espera: null,
      total_referencial: null,
    });
  });

  it("mapea listas de contratos desde filas de base de datos", () => {
    const result = Contrato.fromDatabaseList([row]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Contrato);
    expect(result[0].codigo).toBe("CONT-001");
  });
});
