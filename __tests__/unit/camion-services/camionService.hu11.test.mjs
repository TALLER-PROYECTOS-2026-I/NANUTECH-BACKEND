import { jest } from "@jest/globals";
import { CamionService } from "../../../src/functions/camion-services/camionService.mjs";

describe("HU11 - CamionService", () => {
  let service;

  beforeEach(() => {
    service = new CamionService();

    service.repository = {
      getAll: jest.fn(),
      getById: jest.fn(),
      getByPlaca: jest.fn(),
      getByVin: jest.fn(),
      create: jest.fn(),
      getPanel: jest.fn(),
      exportCsv: jest.fn(),
    };
  });

  const camionValido = {
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

  test("debe validar camión completo y normalizar campos", () => {
    const result = service.validateCreateCamion(camionValido);

    expect(result.placa).toBe("XYZ-999");
    expect(result.vin).toBe("VINXYZ999");
    expect(result.estado).toBe("DISPONIBLE");
    expect(result.gps_habilitado).toBe(true);
    expect(result.capacidad_ton).toBe(20);
    expect(result.tipo_combustible).toBe("DIESEL");
  });

  test("debe normalizar EN_USO a EN_JORNADA", () => {
    const result = service.validateCreateCamion({
      ...camionValido,
      estado: "EN_USO",
    });

    expect(result.estado).toBe("EN_JORNADA");
  });

  test("debe rechazar placa vacía", () => {
    expect(() =>
      service.validateCreateCamion({
        ...camionValido,
        placa: "",
      }),
    ).toThrow("placa");
  });

  test("debe rechazar marca vacía", () => {
    expect(() =>
      service.validateCreateCamion({
        ...camionValido,
        marca: "   ",
      }),
    ).toThrow("marca");
  });

  test("debe rechazar modelo vacío", () => {
    expect(() =>
      service.validateCreateCamion({
        ...camionValido,
        modelo: "   ",
      }),
    ).toThrow("modelo");
  });

  test("debe rechazar año inválido", () => {
    expect(() =>
      service.validateCreateCamion({
        ...camionValido,
        anio: 1800,
      }),
    ).toThrow("Año fuera del rango permitido");
  });

  test("debe rechazar capacidad cero", () => {
    expect(() =>
      service.validateCreateCamion({
        ...camionValido,
        capacidad_ton: 0,
      }),
    ).toThrow("La capacidad debe ser mayor a 0 toneladas");
  });

  test("debe rechazar VIN vacío", () => {
    expect(() =>
      service.validateCreateCamion({
        ...camionValido,
        vin: "",
      }),
    ).toThrow("vin");
  });

  test("debe rechazar color vacío", () => {
    expect(() =>
      service.validateCreateCamion({
        ...camionValido,
        color: " ",
      }),
    ).toThrow("color");
  });

  test("debe rechazar combustible inválido", () => {
    expect(() =>
      service.validateCreateCamion({
        ...camionValido,
        combustible: "CARBON",
      }),
    ).toThrow("Combustible inválido");
  });

  test("debe rechazar estado inválido", () => {
    expect(() =>
      service.validateCreateCamion({
        ...camionValido,
        estado: "OCUPADO",
      }),
    ).toThrow("Estado de camión inválido");
  });

  test("getAllCamiones debe retornar lista de modelos", async () => {
    service.repository.getAll.mockResolvedValue([
      {
        id: "unidad-001",
        placa: "ABC-123",
        marca: "Volvo",
        modelo: "FH16",
        estado: "DISPONIBLE",
      },
    ]);

    const result = await service.getAllCamiones({ estado: "DISPONIBLE" });

    expect(service.repository.getAll).toHaveBeenCalledWith({
      estado: "DISPONIBLE",
    });
    expect(result).toHaveLength(1);
    expect(result[0].placa).toBe("ABC-123");
  });

  test("getCamionById debe retornar camión", async () => {
    service.repository.getById.mockResolvedValue({
      id: "unidad-001",
      placa: "ABC-123",
      marca: "Volvo",
      modelo: "FH16",
      estado: "DISPONIBLE",
    });

    const result = await service.getCamionById("unidad-001");

    expect(service.repository.getById).toHaveBeenCalledWith("unidad-001");
    expect(result.placa).toBe("ABC-123");
  });

  test("getCamionById debe fallar sin id", async () => {
    await expect(service.getCamionById()).rejects.toThrow("El id es requerido");
  });

  test("getCamionById debe fallar si no existe", async () => {
    service.repository.getById.mockResolvedValue(null);

    await expect(service.getCamionById("unidad-x")).rejects.toThrow(
      "Camión no encontrado",
    );
  });

  test("debe registrar camión correctamente", async () => {
    service.repository.getByPlaca.mockResolvedValue(null);
    service.repository.getByVin.mockResolvedValue(null);
    service.repository.create.mockResolvedValue({
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

    const result = await service.createCamion(camionValido);

    expect(service.repository.getByPlaca).toHaveBeenCalledWith("XYZ-999");
    expect(service.repository.getByVin).toHaveBeenCalledWith("VINXYZ999");
    expect(service.repository.create).toHaveBeenCalled();
    expect(result.estado).toBe("DISPONIBLE");
    expect(result.confirmacion.message).toBe("¡Camión registrado con éxito!");
  });

  test("debe rechazar placa duplicada", async () => {
    service.repository.getByPlaca.mockResolvedValue({
      id: "unidad-existente",
      placa: "XYZ-999",
    });

    await expect(service.createCamion(camionValido)).rejects.toThrow(
      "Ya existe un camión con esta placa",
    );

    expect(service.repository.create).not.toHaveBeenCalled();
  });

  test("debe rechazar VIN duplicado", async () => {
    service.repository.getByPlaca.mockResolvedValue(null);
    service.repository.getByVin.mockResolvedValue({
      id: "unidad-existente",
      vin: "VINXYZ999",
    });

    await expect(service.createCamion(camionValido)).rejects.toThrow(
      "Ya existe un camión con este VIN",
    );

    expect(service.repository.create).not.toHaveBeenCalled();
  });

  test("debe obtener panel desde repository", async () => {
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

    service.repository.getPanel.mockResolvedValue(panelMock);

    const result = await service.getPanel({
      estado: "DISPONIBLE",
    });

    expect(service.repository.getPanel).toHaveBeenCalledWith({
      estado: "DISPONIBLE",
    });
    expect(result.resumen.total_camiones).toBe(3);
  });

  test("debe exportar CSV desde repository", async () => {
    const csvMock =
      '"ID","Placa","Marca","Modelo","Año","Capacidad (ton)","Estado","VIN","Color","GPS","Kilometraje","Fecha de Registro","Último Mantenimiento","Próximo Mantenimiento"';

    service.repository.exportCsv.mockResolvedValue(csvMock);

    const result = await service.exportCsv({
      estado: "DISPONIBLE",
    });

    expect(service.repository.exportCsv).toHaveBeenCalledWith({
      estado: "DISPONIBLE",
    });
    expect(result).toContain("Placa");
    expect(result).toContain("Capacidad (ton)");
  });
});