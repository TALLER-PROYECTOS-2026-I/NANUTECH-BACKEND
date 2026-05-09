import { describe, it, expect } from "@jest/globals";
import { Unidad } from "../../../src/functions/unidad-services/unidadModel.mjs";

describe("UnidadModel", () => {
  const row = {
    id: "uni-1",
    placa: "ABC-123",
    marca: "Volvo",
    modelo: "FH",
    anio: 2020,
    capacidad_ton: "30.5",
    estado: "DISPONIBLE",
    activo: true,
  };

  it("crea una instancia desde una fila de base de datos", () => {
    const unidad = Unidad.fromDatabase(row);

    expect(unidad).toBeInstanceOf(Unidad);
    expect(unidad).toMatchObject(row);
  });

  it("mapea listas desde filas de base de datos", () => {
    const result = Unidad.fromDatabaseList([row]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Unidad);
    expect(result[0].placa).toBe("ABC-123");
  });
});
