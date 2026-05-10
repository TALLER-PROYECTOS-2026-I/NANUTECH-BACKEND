import { describe, it, expect } from "@jest/globals";
import { CamionValidator } from "../../../src/shared/utils/validators/camionValidator.mjs";

describe("CamionValidator", () => {
  it("validateId normaliza ids numericos validos", () => {
    expect(CamionValidator.validateId("15")).toBe(15);
  });

  it("validateId rechaza valores invalidos", () => {
    expect(() => CamionValidator.validateId("0")).toThrow();
    expect(() => CamionValidator.validateId("abc")).toThrow();
  });

  it("normaliza placa, marca, modelo y estado", () => {
    expect(CamionValidator.validatePlaca(" abc-123 ")).toBe("ABC-123");
    expect(CamionValidator.validateMarca(" Volvo ")).toBe("Volvo");
    expect(CamionValidator.validateModelo(" FH ")).toBe("FH");
    expect(CamionValidator.validateEstado("EN_USO")).toBe("en_uso");
    expect(CamionValidator.validateEstado()).toBe("disponible");
  });

  it("rechaza campos de texto invalidos", () => {
    expect(() => CamionValidator.validatePlaca(" ")).toThrow("La placa no puede estar");
    expect(() => CamionValidator.validatePlaca(123)).toThrow("La placa debe ser texto");
    expect(() => CamionValidator.validateMarca("")).toThrow("La marca es requerida");
    expect(() => CamionValidator.validateMarca(123)).toThrow("La marca debe ser texto");
    expect(() => CamionValidator.validateModelo("")).toThrow();
    expect(() => CamionValidator.validateModelo(123)).toThrow("El modelo debe ser texto");
    expect(() => CamionValidator.validateEstado("NO_EXISTE")).toThrow();
  });

  it("validateCreateCamion retorna datos normalizados", () => {
    const result = CamionValidator.validateCreateCamion({
      placa: " abc-123 ",
      marca: " Volvo ",
      modelo: " FH ",
      estado: "Disponible",
    });

    expect(result).toEqual({
      placa: "ABC-123",
      marca: "Volvo",
      modelo: "FH",
      estado: "disponible",
    });
  });

  it("validateCreateCamion acumula errores de validacion", () => {
    expect(() =>
      CamionValidator.validateCreateCamion({
        placa: "",
        marca: "",
        modelo: "",
        estado: "INVALIDO",
      })
    ).toThrow("Errores de validaci");
  });

  it("validateUpdateCamion permite cambios parciales y rechaza payload vacio", () => {
    expect(CamionValidator.validateUpdateCamion({ placa: " xyz-999 " })).toEqual({
      placa: "XYZ-999",
    });

    expect(() => CamionValidator.validateUpdateCamion({})).toThrow(
      "No hay campos"
    );
  });

  it("validateUpdateCamion acumula errores de campos presentes", () => {
    expect(() =>
      CamionValidator.validateUpdateCamion({
        placa: "",
        estado: "INVALIDO",
      })
    ).toThrow("Errores de validaci");
  });

  it("validateRequestBody parsea JSON y rechaza body invalido", () => {
    expect(CamionValidator.validateRequestBody('{"placa":"ABC-123"}')).toEqual({
      placa: "ABC-123",
    });

    expect(() => CamionValidator.validateRequestBody()).toThrow();
    expect(() => CamionValidator.validateRequestBody("{bad-json")).toThrow();
  });
});
