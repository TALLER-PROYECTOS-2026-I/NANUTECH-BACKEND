import { describe, it, expect } from "@jest/globals";
import { Conductor } from "../../../src/functions/conductor-services/conductorModel.mjs";

describe("ConductorModel", () => {
  const row = {
    id: "usr-1",
    cognito_sub: "sub-1",
    correo: "chofer@nanutech.com",
    nombres: "Carlos",
    apellidos: "Gomez",
    rol: "CHOFER",
    telefono: "999888777",
    dni: "12345678",
    activo: true,
    estado: "ACTIVO",
  };

  it("crea una instancia desde una fila de base de datos", () => {
    const conductor = Conductor.fromDatabase(row);

    expect(conductor).toBeInstanceOf(Conductor);
    expect(conductor).toMatchObject(row);
  });

  it("mapea listas desde filas de base de datos", () => {
    const result = Conductor.fromDatabaseList([row]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Conductor);
    expect(result[0].correo).toBe("chofer@nanutech.com");
  });
});
