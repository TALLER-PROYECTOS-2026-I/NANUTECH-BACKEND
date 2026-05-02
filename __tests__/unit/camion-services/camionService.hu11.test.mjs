import { jest } from "@jest/globals";
import { CamionService } from "../../../src/functions/camion-services/camionService.mjs";

describe("HU11 - CamionService", () => {
  let service;

  beforeEach(() => {
    service = new CamionService();

    service.repository = {
      getByPlaca: jest.fn(),
      create: jest.fn(),
      getByPlacaHu11: jest.fn(),
      getByVinHu11: jest.fn(),
      createHu11: jest.fn(),
      getPanelHu11: jest.fn(),
      exportCsvHu11: jest.fn(),
    };
  });

  const camionHu11Valido = {
    placa: "xyz-999",
    marca: "Volvo",
    modelo: "FH16",
    anio: 2024,
    capacidad_ton: 20,
    vin: "vinxyz999",
    color: "Blanco",
    combustible: "DIESEL",
    gps: true,
  };

  test("debe validar payload HU11 y normalizar campos", () => {
    const result = service.validateCreateCamionHu11(camionHu11Valido);

    expect(result.placa).toBe("XYZ-999");
    expect(result.vin).toBe("VINXYZ999");
    expect(result.estado).toBe("DISPONIBLE");
    expect(result.gps_habilitado).toBe(true);
    expect(result.capacidad_ton).toBe(20);
    expect(result.tipo_combustible).toBe("DIESEL");
  });

  test("debe rechazar placa vacía", () => {
    expect(() =>
      service.validateCreateCamionHu11({
        ...camionHu11Valido,
        placa: "",
      }),
    ).toThrow("placa");
  });

  test("debe rechazar año inválido", () => {
    expect(() =>
      service.validateCreateCamionHu11({
        ...camionHu11Valido,
        anio: 1800,
      }),
    ).toThrow("Año fuera del rango permitido");
  });

  test("debe rechazar capacidad cero", () => {
    expect(() =>
      service.validateCreateCamionHu11({
        ...camionHu11Valido,
        capacidad_ton: 0,
      }),
    ).toThrow("La capacidad debe ser mayor a 0 toneladas");
  });

  test("debe rechazar VIN vacío", () => {
    expect(() =>
      service.validateCreateCamionHu11({
        ...camionHu11Valido,
        vin: "",
      }),
    ).toThrow("vin");
  });

  test("debe registrar camión HU11 correctamente usando createCamion", async () => {
    service.repository.getByPlacaHu11.mockResolvedValue(null);
    service.repository.getByVinHu11.mockResolvedValue(null);
    service.repository.createHu11.mockResolvedValue({
      id: "unidad-001",
      placa: "XYZ-999",
      marca: "Volvo",
      modelo: "FH16",
      anio: 2024,
      capacidad_ton: 20,
      estado: "DISPONIBLE",
      gps_habilitado: true,
      vin: "VINXYZ999",
      color: "Blanco",
      tipo_combustible: "DIESEL",
      kilometraje_actual: 0,
    });

    const result = await service.createCamion(camionHu11Valido);

    expect(service.repository.getByPlacaHu11).toHaveBeenCalledWith("XYZ-999");
    expect(service.repository.getByVinHu11).toHaveBeenCalledWith("VINXYZ999");
    expect(service.repository.createHu11).toHaveBeenCalled();
    expect(result.estado).toBe("DISPONIBLE");
    expect(result.confirmacion.message).toBe("¡Camión registrado con éxito!");
    expect(result.confirmacion.placa).toBe("XYZ-999");
    expect(result.confirmacion.modelo).toBe("FH16");
  });

  test("debe rechazar placa duplicada en HU11 usando createCamion", async () => {
    service.repository.getByPlacaHu11.mockResolvedValue({
      id: "unidad-existente",
      placa: "XYZ-999",
    });

    await expect(service.createCamion(camionHu11Valido)).rejects.toThrow(
      "Ya existe un camión con esta placa",
    );

    expect(service.repository.createHu11).not.toHaveBeenCalled();
  });

  test("debe rechazar VIN duplicado en HU11 usando createCamion", async () => {
    service.repository.getByPlacaHu11.mockResolvedValue(null);
    service.repository.getByVinHu11.mockResolvedValue({
      id: "unidad-existente",
      vin: "VINXYZ999",
    });

    await expect(service.createCamion(camionHu11Valido)).rejects.toThrow(
      "Ya existe un camión con este VIN",
    );

    expect(service.repository.createHu11).not.toHaveBeenCalled();
  });

  test("debe obtener panel HU11 desde repository", async () => {
    const panelMock = {
      resumen: {
        total_camiones: 3,
        en_uso: 1,
        disponibles: 1,
        mantenimiento: 1,
      },
      grafica_movimiento: {
        horas_movimiento: 8,
        horas_detenido: 2,
        porcentaje_movimiento: 80,
        porcentaje_detenido: 20,
      },
      camiones: [],
    };

    service.repository.getPanelHu11.mockResolvedValue(panelMock);

    const result = await service.getPanel({
      estado: "DISPONIBLE",
    });

    expect(service.repository.getPanelHu11).toHaveBeenCalledWith({
      estado: "DISPONIBLE",
    });
    expect(result.resumen.total_camiones).toBe(3);
    expect(result.grafica_movimiento.porcentaje_movimiento).toBe(80);
  });

  test("debe exportar CSV HU11 desde repository", async () => {
    const csvMock =
      '"ID","Placa","Marca","Modelo","Año","Capacidad (ton)","Estado","VIN","Color","GPS","Kilometraje","Fecha de Registro","Último Mantenimiento","Próximo Mantenimiento"';

    service.repository.exportCsvHu11.mockResolvedValue(csvMock);

    const result = await service.exportCsv({
      estado: "DISPONIBLE",
    });

    expect(service.repository.exportCsvHu11).toHaveBeenCalledWith({
      estado: "DISPONIBLE",
    });
    expect(result).toContain("Placa");
    expect(result).toContain("Capacidad (ton)");
  });
});