// Conexión a base de datos PostgreSQL
import db from "../../shared/config/database.mjs";

/**
 * Repository encargado de interactuar directamente con la base de datos para operaciones relacionadas a conductores.
 */
export class ConductorRepository {
  /**
   * Obtiene todos los conductores activos.
   *
   * Filtros aplicados:
   * - rol = CHOFER
   * - activo = TRUE
   * - estado = ACTIVO
   *
   * Retorna:
   * Lista de conductores ordenados por apellidos y nombres.
   */
  async getAllActive() {
    const result = await db.query(
      `SELECT
          id,
          cognito_sub,
          correo,
          nombres,
          apellidos,
          rol,
          telefono,
          dni,
          activo,
          estado

       FROM usuarios

       WHERE rol = 'CHOFER'
         AND activo = TRUE
         AND estado = 'ACTIVO'

       ORDER BY apellidos, nombres`
    );

    // Retorna únicamente las filas obtenidas
    return result.rows;
  }

  /**
   * Obtiene estadísticas agregadas de un conductor específico.
   *
   * Funcionalidades:
   * - Total de jornadas
   * - Jornadas completadas
   * - Jornadas activas
   * - Horas totales trabajadas
   * - Promedio de horas por jornada
   * - Estado actual del conductor
   */
  async getConductorStatistics(conductorId) {
    /**
     * Query SQL de agregación.
     *
     * Utiliza:
     * - COUNT()
     * - SUM()
     * - AVG()
     * - CASE
     * - LEFT JOIN
     *
     * para calcular métricas del conductor.
     */
    const query = `

      SELECT
        u.id,
        u.nombres,
        u.apellidos,

        /**
         * Total general de jornadas
         * asociadas al conductor
         */
        COUNT(j.id) AS total_jornadas,

        /**
         * Cantidad de jornadas completadas
         */
        COUNT(
          CASE
            WHEN j.estado = 'COMPLETADA'
            THEN 1
          END
        ) AS jornadas_completadas,

        /**
         * Cantidad de jornadas activas
         * actualmente en proceso
         */
        COUNT(
          CASE
            WHEN j.estado = 'EN_PROCESO'
            THEN 1
          END
        ) AS jornadas_activas,

        /**
         * Suma total de horas trabajadas.
         *
         * Convierte:
         * segundos -> horas decimales
         */
        COALESCE(
          SUM(
            CASE
              WHEN j.estado = 'COMPLETADA'
                AND j.hora_inicio IS NOT NULL
                AND j.hora_fin IS NOT NULL

              THEN EXTRACT(
                EPOCH FROM (
                  j.hora_fin - j.hora_inicio
                )
              ) / 3600

              ELSE 0
            END
          ),
          0
        ) AS horas_totales,

        /**
         * Promedio de horas trabajadas
         * por jornada completada
         */
        COALESCE(
          AVG(
            CASE
              WHEN j.estado = 'COMPLETADA'
                AND j.hora_inicio IS NOT NULL
                AND j.hora_fin IS NOT NULL

              THEN EXTRACT(
                EPOCH FROM (
                  j.hora_fin - j.hora_inicio
                )
              ) / 3600
            END
          ),
          0
        ) AS promedio_horas,

        /**
         * Estado calculado del conductor.
         *
         * Si tiene al menos una jornada
         * EN_PROCESO:
         * -> ACTIVO
         *
         * Caso contrario:
         * -> INACTIVO
         */
        CASE
          WHEN COUNT(
            CASE
              WHEN j.estado = 'EN_PROCESO'
              THEN 1
            END
          ) > 0

          THEN 'ACTIVO'

          ELSE 'INACTIVO'

        END AS estado_actual

      FROM usuarios u

      /**
       * Relación entre conductor
       * y jornadas registradas
       */
      LEFT JOIN jornadas j
        ON j.conductor_id = u.id

      /**
       * Filtra únicamente
       * el conductor solicitado
       */
      WHERE u.id = $1

      /**
       * Agrupación necesaria
       * para funciones agregadas
       */
      GROUP BY
        u.id,
        u.nombres,
        u.apellidos
    `;

    // Ejecuta la query parametrizada
    const result = await db.query(query, [conductorId]);

    // Retorna únicamente una fila
    return result.rows[0];
  }
  /**
   * HU18
   * Obtiene detalle completo del conductor
   */
 async getConductorDetail(conductorId) {
    const query = `
        SELECT
            u.id,
            u.nombres,
            u.apellidos,
            u.correo,
            u.telefono,
            u.dni,
            u.created_at AS fecha_contratacion,

            lc.numero_licencia,
            lc.categoria,
            lc.fecha_emision,
            lc.fecha_vencimiento,
            lc.autoridad_emisora,

            (
                SELECT json_build_object(
                    'placa', un.placa,
                    'marca', un.marca,
                    'modelo', un.modelo,
                    'anio', un.anio,
                    'capacidad_ton', un.capacidad_ton
                )
                FROM asignaciones_conductor_unidad acu
                JOIN unidades un ON un.id = acu.unidad_id
                WHERE acu.conductor_id = u.id
                AND acu.estado = 'ACTIVA'
                LIMIT 1
            ) AS camion_asignado,

            (
                SELECT CASE
                    WHEN COUNT(*) > 0 THEN 'ACTIVO'
                    ELSE 'INACTIVO'
                END
                FROM jornadas j
                WHERE j.conductor_id = u.id
                AND j.estado = 'EN_PROCESO'
            ) AS estado_actual

        FROM usuarios u
        JOIN conductores c ON c.usuario_id = u.id
        LEFT JOIN licencias_conducir lc
            ON lc.conductor_id = u.id
            AND lc.activa = TRUE

        WHERE u.id = $1
    `;

    const result = await db.query(query, [conductorId]);

    return result.rows[0];
}
  /**
   * HU18
   * Actualiza licencia del conductor
   */
  async updateLicencia(conductorId, licenciaData) {
    const query = `
      UPDATE licencias_conducir
      SET
        numero_licencia = $2,
        categoria = $3,
        fecha_emision = $4,
        fecha_vencimiento = $5,
        autoridad_emisora = $6,
        updated_at = NOW()

      WHERE conductor_id = $1

      RETURNING *
    `;

    const result = await db.query(query, [
      conductorId,
      licenciaData.numeroLicencia,
      licenciaData.categoria,
      licenciaData.fechaEmision,
      licenciaData.fechaVencimiento,
      licenciaData.autoridadEmisora,
    ]);

    return result.rows[0];
  }
  /**
   * HU18
   * Obtiene licencia actual
   */
  async getLicenciaActual(conductorId) {
    const result = await db.query(
      `
        SELECT
          id,
          categoria,
          fecha_vencimiento
        FROM licencias_conducir
        WHERE conductor_id = $1
        AND activa = TRUE
        LIMIT 1
        `,
      [conductorId]
    );

    return result.rows[0];
  }
  /**
   * Valida duplicados por DNI, correo o número de licencia.
   */
  async validarDuplicadosConductor({ dni, email, numeroLicencia }) {
    const result = await db.query(
      `
      SELECT 1
      FROM usuarios u
      LEFT JOIN licencias_conducir l
        ON l.conductor_id = u.id
      WHERE u.dni = $1
         OR u.correo = $2
         OR l.numero_licencia = $3
      LIMIT 1;
      `,
      [dni, email, numeroLicencia]
    );

    return result.rowCount > 0;
  }

  /**
   * Registra un nuevo conductor en el sistema.
   *
   * Flujo:
   * 1. Inicia transacción PostgreSQL
   * 2. Registra usuario
   * 3. Registra conductor
   * 4. Registra licencia
   * 5. Crea usuario en AWS Cognito
   * 6. Guarda el cognito_sub
   * 7. Ejecuta COMMIT
   *
   * Si Cognito falla:
   * - Ejecuta ROLLBACK
   * - Elimina usuario Cognito creado
   * - Retorna mensaje de error controlado
   */
  async registrarNuevoConductor(data, cognitoService) {
    /**
     * Variable utilizada para controlar
     * si el usuario fue creado exitosamente
     * en AWS Cognito.
     */
    let emailCreadoEnCognito = null;

    try {
      /**
       * Inicia transacción de base de datos.
       */
      await db.query("BEGIN");

      const { nombreCompleto, email, dni, telefono, numeroLicencia, categoria, fechaVencimiento } =
        data;

      /**
       * Separa nombres y apellidos
       * a partir del nombre completo enviado.
       */
      const partesNombre = nombreCompleto.trim().split(" ");

      const nombres = partesNombre.slice(0, -1).join(" ") || nombreCompleto;

      const apellidos = partesNombre.length > 1 ? partesNombre.slice(-1).join(" ") : "";

      /**
       * Registra usuario base en la tabla usuarios.
       *
       * Estado inicial:
       * - ACTIVO
       * - Rol CHOFER
       */
      const usuarioResult = await db.query(
        `
      INSERT INTO usuarios (
        correo,
        nombres,
        apellidos,
        rol,
        telefono,
        dni,
        activo,
        estado,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        'CHOFER',
        $4,
        $5,
        TRUE,
        'ACTIVO',
        NOW(),
        NOW()
      )
      RETURNING
        id,
        correo,
        nombres,
        apellidos,
        rol,
        telefono,
        dni,
        activo,
        estado;
      `,
        [email, nombres, apellidos, telefono, dni]
      );

      const usuario = usuarioResult.rows[0];

      /**
       * Registra conductor operativo.
       *
       * Estado inicial:
       * DISPONIBLE
       */
      await db.query(
        `
      INSERT INTO conductores (
        usuario_id,
        estado_operacional,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        'DISPONIBLE',
        NOW(),
        NOW()
      );
      `,
        [usuario.id]
      );

      /**
       * Registra licencia inicial del conductor.
       */
      const licenciaResult = await db.query(
        `
      INSERT INTO licencias_conducir (
        conductor_id,
        numero_licencia,
        categoria,
        fecha_vencimiento,
        activa,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        TRUE,
        NOW(),
        NOW()
      )
      RETURNING
        numero_licencia,
        categoria,
        fecha_vencimiento,
        activa;
      `,
        [usuario.id, numeroLicencia, categoria, fechaVencimiento]
      );

      /**
       * Crea usuario en AWS Cognito.
       *
       * Cognito enviará automáticamente
       * las credenciales temporales
       * al correo corporativo registrado.
       */
      const usuarioCognito = await cognitoService.crearUsuarioConductor({
        email,
        dni,
        nombreCompleto,
      });

      /**
       * Marca que Cognito fue creado
       * correctamente.
       */
      emailCreadoEnCognito = email;

      /**
       * Guarda el identificador único
       * generado por Cognito.
       */
      await db.query(
        `
      UPDATE usuarios
      SET cognito_sub = $1,
          updated_at = NOW()
      WHERE id = $2;
      `,
        [usuarioCognito.cognitoSub, usuario.id]
      );

      /**
       * Confirma la transacción.
       */
      await db.query("COMMIT");

      /**
       * Retorna información registrada.
       */
      return {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        email: usuario.correo,
        dni: usuario.dni,
        telefono: usuario.telefono,
        rol: usuario.rol,
        activo: usuario.activo,
        estado: usuario.estado,
        estadoOperacional: "DISPONIBLE",
        licencia: licenciaResult.rows[0],
        camionAsignado: "Sin asignar",
        cognito: {
          username: usuarioCognito.username,
          cognitoSub: usuarioCognito.cognitoSub,
        },
      };
    } catch (error) {
      /**
       * Revierte todos los cambios
       * realizados en PostgreSQL.
       */
      await db.query("ROLLBACK");

      /**
       * Si Cognito alcanzó a crear
       * un usuario antes del error,
       * se elimina para evitar
       * inconsistencias.
       */
      if (emailCreadoEnCognito) {
        try {
          await cognitoService.eliminarUsuarioConductor(emailCreadoEnCognito);
        } catch (deleteError) {
          console.error("Error eliminando usuario Cognito:", deleteError);
        }
      }

      console.error("Error en registrarNuevoConductor:", error);

      /**
       * Error funcional solicitado
       * por la HU22.
       */
      const customError = new Error(
        "Error en la creación de credenciales. Registro no guardado. Intente nuevamente"
      );
      customError.statusCode = error.statusCode || 500;
      throw customError;
    }
  }
}
