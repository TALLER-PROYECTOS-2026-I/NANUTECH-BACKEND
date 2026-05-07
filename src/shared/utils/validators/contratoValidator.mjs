export class ContratoValidator {
  /**
   * Método principal de validación del contrato
   *
   * Responsabilidades:
   * - Centralizar todas las validaciones
   * - Validar datos generales del contrato
   * - Ejecutar reglas de negocio antes del registro
   */
  static validateContrato(data) {
    // Valida nombre del cliente
    this.validateCliente(data.cliente);

    // Valida RUC del cliente
    this.validateRuc(data.ruc);

    // Valida tipo de servicio permitido
    this.validateTipoServicio(data.tipo_servicio);

    // Valida fechas del contrato
    this.validateFechas(data.fecha_inicio, data.fecha_fin);

    // Valida origen y destino de la ruta
    this.validateRuta(data.origen, data.destino);

    // Valida distancia estimada
    this.validateDistancia(data.distancia_estimada_km);

    // Valida tarifas económicas
    this.validateTarifas(data);
  }

  /**
   * Valida el nombre del cliente
   *
   * Reglas:
   * - No debe ser null
   * - No debe estar vacío
   */
  static validateCliente(cliente) {
    // Verifica que el cliente tenga contenido
    if (!cliente || cliente.trim() === "") {
      throw new Error("El nombre del cliente no puede estar vacío");
    }
  }

  /**
   * Valida el RUC del cliente
   *
   * Reglas:
   * - Obligatorio
   * - Debe tener 11 caracteres
   * - Solo números
   * - No puede ser 00000000000
   */
  static validateRuc(rucValue) {
    // Convierte el valor recibido a string
    const ruc = String(rucValue || "").trim();

    // Valida obligatoriedad
    if (!ruc) throw new Error("El RUC es obligatorio");

    // Valida longitud exacta
    if (ruc.length !== 11) throw new Error("El RUC debe tener exactamente 11 dígitos");

    // Valida que solo existan números
    if (!/^\d{11}$/.test(ruc)) throw new Error("El RUC debe contener solo dígitos numéricos");

    // Evita RUC inválido genérico
    if (ruc === "00000000000") throw new Error("El RUC ingresado no es válido");
  }

  /**
   * Valida el tipo de servicio
   *
   * Reglas:
   * - Debe existir
   * - Debe pertenecer a la lista permitida
   */
  static validateTipoServicio(tipoServicio) {
    // Lista de tipos de servicio válidos
    const tiposPermitidos = ["POR_VIAJE", "POR_HORA", "POR_TONELADA", "POR_KM", "MENSUAL"];

    // Verifica obligatoriedad
    if (!tipoServicio) throw new Error("Tipo de Servicio es obligatorio");

    // Verifica que el valor exista en la lista permitida
    if (!tiposPermitidos.includes(tipoServicio)) {
      throw new Error("El tipo de servicio no es válido");
    }
  }

  /**
   * Valida fechas del contrato
   *
   * Reglas:
   * - Fecha inicio obligatoria
   * - Fecha fin no puede ser menor
   */
  static validateFechas(fechaInicio, fechaFin) {
    // Verifica fecha de inicio
    if (!fechaInicio) throw new Error("La fecha de inicio es obligatoria");

    // Valida rango de fechas
    if (fechaFin && fechaFin < fechaInicio) {
      throw new Error("La fecha fin no puede ser menor que la fecha inicio");
    }
  }

  /**
   * Valida información de la ruta
   *
   * Reglas:
   * - Origen obligatorio
   * - Destino obligatorio
   */
  static validateRuta(origen, destino) {
    // Valida punto de partida
    if (!origen || origen.trim() === "") {
      throw new Error("El punto de partida es obligatorio");
    }

    // Valida punto de llegada
    if (!destino || destino.trim() === "") {
      throw new Error("El punto de llegada es obligatorio");
    }
  }

  /**
   * Valida distancia estimada
   *
   * Reglas:
   * - Obligatoria
   * - Debe ser mayor a 0
   */
  static validateDistancia(distancia) {
    // Verifica valor válido
    if (
      distancia === undefined ||
      distancia === null ||
      distancia === "" ||
      Number(distancia) <= 0
    ) {
      throw new Error("La distancia debe ser mayor a 0");
    }
  }

  /**
   * Valida tarifas del contrato
   *
   * Reglas:
   * - Tarifa por km obligatoria y positiva
   * - Tarifa por hora obligatoria
   * - Tarifa espera obligatoria
   */
  static validateTarifas(data) {
    // Valida tarifa por kilómetro
    if (
      data.tarifa_por_km === undefined ||
      data.tarifa_por_km === null ||
      data.tarifa_por_km === "" ||
      Number(data.tarifa_por_km) <= 0
    ) {
      throw new Error("La tarifa debe ser un valor positivo");
    }

    // Valida tarifa por hora obligatoria
    if (
      data.tarifa_por_hora === undefined ||
      data.tarifa_por_hora === null ||
      data.tarifa_por_hora === ""
    ) {
      throw new Error("La tarifa por hora es obligatoria");
    }

    // Valida que no sea negativa
    if (Number(data.tarifa_por_hora) < 0) {
      throw new Error("La tarifa por hora debe ser mayor o igual a 0");
    }

    // Valida tarifa de espera obligatoria
    if (
      data.tarifa_espera === undefined ||
      data.tarifa_espera === null ||
      data.tarifa_espera === ""
    ) {
      throw new Error("La tarifa por espera es obligatoria");
    }

    // Valida que no sea negativa
    if (Number(data.tarifa_espera) < 0) {
      throw new Error("La tarifa por espera debe ser mayor o igual a 0");
    }
  }
}
