# =============================================================================
# zap_translations.py
# Diccionario completo de traducciones de hallazgos OWASP ZAP al español.
# Clave: Plugin ID de ZAP (string) — es el identificador más estable.
# Fallback: nombre del hallazgo en inglés (normalizado a minúsculas).
#
# Campos traducidos por hallazgo:
#   - name        → nombre del hallazgo
#   - description → descripción técnica
#   - solution    → acción correctiva recomendada
#   - other_info  → información adicional (cuando aplica)
# =============================================================================

ZAP_TRANSLATIONS = {

    # =========================================================================
    # HIGH — Riesgo Alto
    # =========================================================================

    "40012": {
        "name": "Cross Site Scripting (Reflejado)",
        "description": (
            "Se ha detectado una vulnerabilidad de Cross-Site Scripting (XSS) reflejado. "
            "Un atacante puede inyectar scripts maliciosos en páginas web vistas por otros usuarios. "
            "El script se incluye en la respuesta del servidor inmediatamente, sin almacenamiento previo. "
            "Puede usarse para robar cookies de sesión, redirigir usuarios o ejecutar acciones no autorizadas."
        ),
        "solution": (
            "No permita que datos suministrados por el usuario se incluyan en la respuesta sin validación ni codificación. "
            "Aplique codificación de salida apropiada según el contexto (HTML, JavaScript, URL). "
            "Use una biblioteca probada de sanitización como DOMPurify. "
            "Implemente una Content Security Policy (CSP) estricta."
        ),
        "other_info": "El parámetro afectado refleja el valor ingresado directamente en la respuesta HTML.",
    },

    "40014": {
        "name": "Cross Site Scripting (Persistente)",
        "description": (
            "Se ha detectado una vulnerabilidad de Cross-Site Scripting (XSS) persistente o almacenado. "
            "Un atacante puede inyectar scripts maliciosos que quedan almacenados en el servidor "
            "y se ejecutan automáticamente cuando otros usuarios cargan la página afectada. "
            "Es más peligroso que el XSS reflejado porque no requiere que la víctima haga clic en un enlace especial."
        ),
        "solution": (
            "Aplique validación de entrada estricta en el servidor para todos los datos almacenados. "
            "Aplique codificación de salida apropiada al renderizar datos almacenados en HTML. "
            "Implemente Content Security Policy (CSP). "
            "Use cabeceras X-XSS-Protection y X-Content-Type-Options."
        ),
        "other_info": "El script inyectado persiste en la base de datos y se ejecuta para todos los usuarios que acceden a la página.",
    },

    "40018": {
        "name": "SQL Injection",
        "description": (
            "Se ha detectado una vulnerabilidad de inyección SQL. "
            "Un atacante puede manipular las consultas SQL de la aplicación enviando datos maliciosos. "
            "Esto puede permitir acceso no autorizado a la base de datos, modificación o eliminación de datos, "
            "ejecución de comandos del sistema operativo o bypass de autenticación."
        ),
        "solution": (
            "Use consultas parametrizadas o prepared statements en lugar de concatenación de cadenas SQL. "
            "Aplique validación de entrada estricta con listas blancas. "
            "Use un ORM que maneje automáticamente el escape de valores. "
            "Aplique el principio de mínimo privilegio en las cuentas de base de datos. "
            "Implemente un Web Application Firewall (WAF)."
        ),
        "other_info": "El parámetro afectado es incluido directamente en una consulta SQL sin sanitización.",
    },

    "40019": {
        "name": "SQL Injection (MySQL)",
        "description": (
            "Se ha detectado una vulnerabilidad de inyección SQL específica de MySQL. "
            "Un atacante puede explotar la sintaxis particular de MySQL para extraer datos, "
            "modificar registros o ejecutar procedimientos almacenados maliciosos."
        ),
        "solution": (
            "Use consultas parametrizadas con PDO o prepared statements de MySQL. "
            "Deshabilite el multi-statement execution si no es necesario. "
            "Aplique validación de entrada y escape de caracteres especiales de MySQL."
        ),
        "other_info": "Se detectaron patrones de error o comportamiento característicos de MySQL ante entradas maliciosas.",
    },

    "40020": {
        "name": "SQL Injection (Hiperlinking)",
        "description": (
            "Se ha detectado una posible inyección SQL a través de parámetros en URL o hipervínculos. "
            "Un atacante puede modificar los parámetros de consulta en la URL para manipular "
            "las consultas SQL del servidor."
        ),
        "solution": (
            "Valide y sanitice todos los parámetros recibidos por GET. "
            "Use consultas parametrizadas. "
            "No confíe en datos provenientes de la URL sin validación previa."
        ),
        "other_info": "El parámetro afectado se transmite en la URL y es procesado en consultas SQL.",
    },

    "40021": {
        "name": "SQL Injection (Oracle)",
        "description": (
            "Se ha detectado una vulnerabilidad de inyección SQL específica de Oracle Database. "
            "Un atacante puede aprovechar la sintaxis particular de Oracle para extraer datos "
            "del diccionario de datos o ejecutar procedimientos del sistema."
        ),
        "solution": (
            "Use consultas parametrizadas con JDBC PreparedStatement. "
            "Restrinja privilegios de la cuenta de base de datos. "
            "Aplique auditoría de consultas en Oracle."
        ),
        "other_info": "Se detectaron patrones de error característicos de Oracle Database.",
    },

    "40022": {
        "name": "SQL Injection (PostgreSQL)",
        "description": (
            "Se ha detectado una vulnerabilidad de inyección SQL específica de PostgreSQL. "
            "Un atacante puede explotar funciones específicas de PostgreSQL como COPY, "
            "pg_read_file o extensiones del sistema."
        ),
        "solution": (
            "Use consultas parametrizadas con node-postgres ($1, $2, ...) o equivalente. "
            "Restrinja privilegios de la cuenta de base de datos. "
            "Deshabilite extensiones peligrosas como plpgsql si no son necesarias."
        ),
        "other_info": "Se detectaron patrones de error característicos de PostgreSQL.",
    },

    "43": {
        "name": "Divulgación de Código Fuente — Inclusión de Archivos (Path Traversal)",
        "description": (
            "La técnica de Path Traversal permite a un atacante acceder a archivos, directorios y comandos "
            "que residen fuera del directorio raíz del servidor web. "
            "Un atacante puede manipular parámetros de la URL de forma que el servidor ejecute o revele "
            "el contenido de archivos arbitrarios en cualquier parte del sistema de archivos. "
            "Las variaciones incluyen codificación Unicode, barras invertidas en Windows, "
            "codificación URL y doble codificación URL."
        ),
        "solution": (
            "Trate toda entrada del usuario como potencialmente maliciosa. "
            "Use una estrategia de validación de lista blanca: acepte solo entradas que se ajusten estrictamente a las especificaciones. "
            "Para nombres de archivo, use listas blancas que limiten el conjunto de caracteres permitidos. "
            "Permita solo un único '.' en el nombre de archivo y excluya separadores de directorio como '/'. "
            "Use funciones de canonicalización de rutas integradas (como realpath() en C) "
            "para eliminar secuencias '..' y enlaces simbólicos. "
            "Ejecute el código con los mínimos privilegios necesarios. "
            "Implemente un entorno de sandbox o jaula (chroot, AppArmor, SELinux)."
        ),
        "other_info": (
            "La salida para el nombre de archivo fuente difiere suficientemente de la de un parámetro aleatorio, "
            "lo que indica que el servidor podría estar procesando el nombre como una ruta de archivo real."
        ),
    },

    "90019": {
        "name": "Inyección en el Lado del Servidor",
        "description": (
            "Se ha detectado una posible vulnerabilidad de inyección en el lado del servidor. "
            "Un atacante puede insertar comandos que el servidor interpreta y ejecuta, "
            "lo que podría resultar en ejecución remota de código."
        ),
        "solution": (
            "Valide y sanitice estrictamente toda entrada del usuario. "
            "Use APIs seguras que eviten el uso del intérprete de comandos. "
            "Aplique el principio de mínimo privilegio."
        ),
        "other_info": "Se detectaron respuestas inusuales ante entradas con caracteres de control del sistema.",
    },

    "90020": {
        "name": "Inyección de Comandos del Sistema Operativo",
        "description": (
            "La aplicación parece vulnerable a inyección de comandos del sistema operativo. "
            "Un atacante puede ejecutar comandos arbitrarios en el servidor subyacente "
            "con los privilegios del proceso de la aplicación web."
        ),
        "solution": (
            "Evite pasar entrada del usuario a funciones de ejecución de comandos del sistema. "
            "Use APIs de más alto nivel que no invoquen el shell del sistema operativo. "
            "Si es absolutamente necesario, use una lista blanca estricta de comandos permitidos "
            "y escape todos los argumentos correctamente."
        ),
        "other_info": "La respuesta del servidor varía ante entradas que contienen metacaracteres del shell.",
    },

    "20019": {
        "name": "Modos de Depuración Habilitados",
        "description": (
            "La aplicación web parece tener habilitados modos de depuración o rastreo (TRACE/DEBUG). "
            "Esto puede exponer información sensible del entorno, variables de configuración "
            "o rutas internas del sistema."
        ),
        "solution": (
            "Deshabilite los modos de depuración y rastreo en todos los entornos de producción. "
            "Asegúrese de que los mensajes de error no revelen información técnica al usuario final."
        ),
        "other_info": "El servidor respondió a métodos HTTP TRACE o DEBUG con información de diagnóstico.",
    },

    # =========================================================================
    # MEDIUM — Riesgo Medio
    # =========================================================================

    "40040": {
        "name": "Mala Configuración de CORS",
        "description": (
            "Esta mala configuración de CORS podría permitir a un atacante realizar consultas AJAX "
            "al sitio web vulnerable desde una página maliciosa cargada por el agente de usuario de la víctima. "
            "Para realizar consultas AJAX autenticadas, el servidor debe especificar el encabezado "
            "'Access-Control-Allow-Credentials: true' y el encabezado 'Access-Control-Allow-Origin' "
            "debe estar configurado con el dominio de la página maliciosa. "
            "Incluso sin AJAX autenticado, contenido sensible no autenticado puede ser accedido."
        ),
        "solution": (
            "Si un recurso web contiene información sensible, el origen debe especificarse correctamente "
            "en el encabezado Access-Control-Allow-Origin. "
            "Solo los sitios web de confianza que necesiten este recurso deben especificarse en este encabezado, "
            "usando el protocolo más seguro soportado. "
            "Evite usar '*' como valor del encabezado Access-Control-Allow-Origin en endpoints con datos sensibles."
        ),
        "other_info": "El servidor acepta solicitudes de origen arbitrario, lo que puede permitir ataques CSRF avanzados.",
    },

    "10098": {
        "name": "Mala Configuración entre Dominios (CORS *)",
        "description": (
            "Es posible que el navegador web cargue datos de otros dominios debido a una mala configuración "
            "de Cross Origin Resource Sharing (CORS) en el servidor web. "
            "La mala configuración de CORS permite solicitudes de lectura entre dominios desde dominios "
            "de terceros arbitrarios usando APIs no autenticadas. "
            "Los navegadores web no permiten a terceros arbitrarios leer la respuesta de APIs autenticadas, "
            "lo que reduce el riesgo. Sin embargo, podría usarse para acceder a datos disponibles "
            "de forma no autenticada pero protegidos por otros mecanismos como lista blanca de IPs."
        ),
        "solution": (
            "Asegúrese de que los datos sensibles no estén disponibles de forma no autenticada. "
            "Configure el encabezado HTTP 'Access-Control-Allow-Origin' con un conjunto más restrictivo de dominios, "
            "o elimine todos los encabezados CORS para permitir que el navegador aplique la Política de Mismo Origen (SOP)."
        ),
        "other_info": "Se detectó el encabezado Access-Control-Allow-Origin: * en la respuesta de un endpoint autenticado.",
    },

    "30003": {
        "name": "Error de Desbordamiento de Entero",
        "description": (
            "Existe una condición de desbordamiento de entero cuando un entero usado en el programa "
            "supera los límites del rango y no ha sido verificado correctamente desde el flujo de entrada. "
            "Un atacante puede enviar valores numéricos extremadamente grandes que el servidor no valida, "
            "causando comportamientos inesperados como errores HTTP 500, corrupción de datos "
            "o potencialmente ejecución de código arbitrario."
        ),
        "solution": (
            "Reescriba el programa backend comprobando que los valores de los enteros procesados "
            "estén dentro del rango permitido por la aplicación antes de procesarlos. "
            "Agregue validación explícita del tamaño máximo de los campos numéricos y UUID. "
            "Devuelva un error 400 (Bad Request) controlado en lugar de un 500 (Internal Server Error) "
            "cuando se reciba un valor fuera de rango."
        ),
        "other_info": (
            "El código de estado HTTP cambió al enviar una cadena larga de enteros aleatorios como valor del parámetro. "
            "Esto indica que el servidor no valida el tamaño máximo del entero antes de procesarlo."
        ),
    },

    "40025": {
        "name": "Divulgación de Proxy",
        "description": (
            "Se detectaron o identificaron uno o más servidores proxy entre ZAP y la aplicación. "
            "Esta información ayuda a un atacante potencial a determinar una lista de objetivos para un ataque, "
            "posibles vulnerabilidades en los servidores proxy, y la presencia de componentes proxy "
            "que podrían detectar, prevenir o mitigar ataques. "
            "En este caso se detectó CloudFront como proxy frontal."
        ),
        "solution": (
            "Deshabilite el método HTTP 'TRACE' en los servidores proxy y en el servidor web/aplicación de origen. "
            "Deshabilite el método 'OPTIONS' en los proxies y servidores si no es necesario para CORS. "
            "Configure páginas de error personalizadas para evitar que páginas de error específicas del producto "
            "sean expuestas al usuario en caso de errores HTTP como solicitudes 'TRACK' a páginas inexistentes. "
            "Configure todos los proxies, servidores de aplicación y servidores web para evitar la divulgación "
            "de tecnología y versión en los encabezados HTTP 'Server' y 'X-Powered-By'."
        ),
        "other_info": (
            "Usando los métodos TRACE, OPTIONS y TRACK, se identificó CloudFront como servidor proxy "
            "entre ZAP y el servidor de aplicación. El servidor web/aplicación de origen no pudo ser identificado."
        ),
    },

    "20012": {
        "name": "Anti-CSRF Tokens Ausentes",
        "description": (
            "No se detectaron tokens Anti-CSRF en el formulario HTML de envío. "
            "Los ataques CSRF (Cross-Site Request Forgery) obligan a un usuario autenticado "
            "a enviar una solicitud HTTP forjada a una aplicación web vulnerable. "
            "Esto puede comprometer la integridad de las acciones del usuario sin su conocimiento."
        ),
        "solution": (
            "Use tokens CSRF únicos, aleatorios y asociados a la sesión del usuario en todas las solicitudes POST. "
            "Verifique el encabezado Origin o Referer para solicitudes cross-site. "
            "Implemente el patrón Synchronizer Token o Double Submit Cookie. "
            "Considere usar el atributo SameSite en las cookies de sesión."
        ),
        "other_info": "No se encontró ningún token anti-CSRF en el formulario analizado.",
    },

    "10016": {
        "name": "Divulgación de Directorio Web",
        "description": (
            "Se detectó un posible listado de directorios en el servidor web. "
            "Esto expone la estructura de archivos del servidor y puede revelar "
            "archivos sensibles que no deberían ser accesibles públicamente."
        ),
        "solution": (
            "Deshabilite el listado de directorios en la configuración del servidor web. "
            "Asegúrese de que todos los directorios tengan un archivo índice por defecto. "
            "Revise los permisos de archivos y directorios."
        ),
        "other_info": "El servidor devuelve un listado de archivos cuando se accede a un directorio sin archivo índice.",
    },

    "10021": {
        "name": "Encabezado X-Content-Type-Options Ausente",
        "description": (
            "El encabezado Anti-MIME-Sniffing 'X-Content-Type-Options' no está configurado en 'nosniff'. "
            "Esto permite que versiones antiguas de Internet Explorer y Chrome realicen MIME-sniffing "
            "en el cuerpo de la respuesta, potencialmente causando que sea interpretado y mostrado "
            "como un tipo de contenido diferente al declarado. "
            "Este problema también aplica a páginas de error (401, 403, 500, etc.) que pueden "
            "ser vulnerables a inyección."
        ),
        "solution": (
            "Asegúrese de que el servidor web configure el encabezado Content-Type apropiadamente "
            "y que establezca el encabezado 'X-Content-Type-Options: nosniff' para todas las páginas web. "
            "En AWS API Gateway, agregue este encabezado en la configuración de respuestas de integración."
        ),
        "other_info": "El encabezado X-Content-Type-Options no fue encontrado en la respuesta del servidor.",
    },

    "10035": {
        "name": "Encabezado Strict-Transport-Security No Configurado",
        "description": (
            "HTTP Strict Transport Security (HSTS) es un mecanismo de política de seguridad web "
            "mediante el cual un servidor web declara que los agentes de usuario compatibles "
            "(como un navegador web) deben interactuar con él únicamente usando conexiones HTTPS seguras. "
            "HSTS es un protocolo estándar del IETF especificado en RFC 6797. "
            "Sin HSTS, los usuarios son vulnerables a ataques de degradación de protocolo y secuestro de cookies."
        ),
        "solution": (
            "Configure su servidor web, servidor de aplicación, balanceador de carga o CDN "
            "para aplicar Strict-Transport-Security. "
            "El valor recomendado es: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload. "
            "En AWS API Gateway, agregue este encabezado en la configuración de respuestas de gateway."
        ),
        "other_info": "El encabezado Strict-Transport-Security no fue encontrado en ninguna de las respuestas analizadas.",
    },

    "10036": {
        "name": "Encabezado X-Frame-Options No Configurado",
        "description": (
            "El encabezado X-Frame-Options no está configurado en la respuesta. "
            "Esto permite que la página sea cargada dentro de un iframe en otro dominio, "
            "lo que puede facilitar ataques de clickjacking donde el usuario es engañado "
            "para hacer clic en elementos de la interfaz sin saberlo."
        ),
        "solution": (
            "Configure el encabezado X-Frame-Options con el valor DENY o SAMEORIGIN "
            "para prevenir que la página sea incrustada en iframes de otros dominios. "
            "Alternativamente, use la directiva frame-ancestors de Content Security Policy."
        ),
        "other_info": "El encabezado X-Frame-Options no fue encontrado en la respuesta del servidor.",
    },

    "10037": {
        "name": "Opciones de Seguridad del Servidor Web",
        "description": (
            "El servidor web expone información sobre su versión y tecnología subyacente "
            "a través de encabezados HTTP como 'Server' o 'X-Powered-By'. "
            "Esta información puede ayudar a un atacante a identificar vulnerabilidades específicas "
            "de la versión del software del servidor."
        ),
        "solution": (
            "Configure el servidor para suprimir o modificar los encabezados que revelan "
            "información de versión como 'Server' y 'X-Powered-By'. "
            "En nginx, use server_tokens off. En Apache, use ServerTokens Prod."
        ),
        "other_info": "Los encabezados de respuesta revelan información sobre el servidor y su versión.",
    },

    "10038": {
        "name": "Content Security Policy (CSP) No Configurada",
        "description": (
            "La aplicación no implementa una Content Security Policy (CSP). "
            "CSP es una capa adicional de seguridad que ayuda a detectar y mitigar ciertos tipos de ataques, "
            "incluyendo Cross-Site Scripting (XSS) e inyección de datos. "
            "Sin CSP, el navegador ejecutará cualquier script presente en la página."
        ),
        "solution": (
            "Implemente una Content Security Policy mediante el encabezado HTTP Content-Security-Policy. "
            "Defina fuentes permitidas para scripts, estilos, imágenes y otros recursos. "
            "Use la directiva 'default-src' como base y restrinja según sea necesario. "
            "Comience con el modo report-only para identificar violaciones antes de aplicar la política."
        ),
        "other_info": "No se encontró el encabezado Content-Security-Policy en ninguna de las respuestas.",
    },

    "10049": {
        "name": "Contenido Almacenable y Cacheable",
        "description": (
            "El contenido de la respuesta puede ser almacenado por componentes de caché como servidores proxy, "
            "y puede ser recuperado directamente de la caché en respuesta a solicitudes similares de otros usuarios. "
            "Si los datos de la respuesta son sensibles, personales o específicos del usuario, "
            "esto puede resultar en una filtración de información sensible. "
            "En algunos casos, esto puede incluso permitir que un usuario obtenga control completo "
            "de la sesión de otro usuario."
        ),
        "solution": (
            "Si la respuesta contiene información sensible, personal o específica del usuario, "
            "considere usar los siguientes encabezados HTTP para limitar o prevenir el almacenamiento en caché: "
            "Cache-Control: no-cache, no-store, must-revalidate, private; "
            "Pragma: no-cache; Expires: 0. "
            "Para el endpoint /auth/login, es especialmente importante dado que contiene tokens de sesión."
        ),
        "other_info": (
            "En ausencia de una directiva de vida útil de caché explícita en la respuesta, "
            "se asumió una heurística liberal de vida útil de 1 año, lo cual es permitido por RFC 7234. "
            "El endpoint de login devuelve tokens de acceso que no deberían ser cacheados."
        ),
    },

    "10054": {
        "name": "Cookie Sin Atributo SameSite",
        "description": (
            "La cookie de sesión no tiene configurado el atributo SameSite. "
            "Sin este atributo, la cookie puede ser enviada en solicitudes cross-site, "
            "lo que facilita ataques CSRF (Cross-Site Request Forgery)."
        ),
        "solution": (
            "Configure el atributo SameSite en todas las cookies de sesión. "
            "Use SameSite=Strict para máxima protección, o SameSite=Lax como compromiso. "
            "Evite SameSite=None a menos que sea estrictamente necesario para funcionalidad cross-site, "
            "en cuyo caso también se requiere el atributo Secure."
        ),
        "other_info": "La cookie de sesión fue enviada sin el atributo SameSite.",
    },

    "10055": {
        "name": "CSP: Directivas Comodín",
        "description": (
            "La Content Security Policy contiene directivas con comodines ('*') "
            "que anulan la protección que CSP debería proporcionar. "
            "Usar '*' permite la carga de recursos desde cualquier origen."
        ),
        "solution": (
            "Reemplace las directivas comodín con orígenes específicos y de confianza. "
            "Evite 'unsafe-inline' y 'unsafe-eval' en las directivas de script. "
            "Use nonces o hashes para scripts en línea si son necesarios."
        ),
        "other_info": "Se detectaron directivas CSP con comodines que reducen significativamente la efectividad de la política.",
    },

    "10056": {
        "name": "Divulgación de Información en la URL",
        "description": (
            "La URL contiene información potencialmente sensible como tokens de sesión, "
            "contraseñas, claves de API o identificadores de usuario. "
            "Las URLs son frecuentemente registradas en logs del servidor, historial del navegador "
            "y encabezados Referer, lo que puede exponer esta información."
        ),
        "solution": (
            "Transmita información sensible en el cuerpo de la solicitud POST o en encabezados HTTP "
            "en lugar de en parámetros de URL. "
            "Nunca incluya tokens de autenticación, contraseñas o datos sensibles en la URL."
        ),
        "other_info": "Se detectó información potencialmente sensible en los parámetros de la URL.",
    },

    "10062": {
        "name": "PII Divulgada",
        "description": (
            "Se detectó Información de Identificación Personal (PII) en la respuesta del servidor. "
            "Esto puede incluir direcciones de correo electrónico, números de teléfono, "
            "números de identificación u otros datos personales que no deberían ser expuestos."
        ),
        "solution": (
            "Revise los endpoints que devuelven datos personales y asegúrese de que "
            "solo usuarios autorizados puedan acceder a ellos. "
            "Aplique enmascaramiento o truncamiento de datos sensibles en las respuestas. "
            "Implemente controles de acceso basados en roles (RBAC)."
        ),
        "other_info": "Se detectaron posibles datos personales en la respuesta del endpoint analizado.",
    },

    "10094": {
        "name": "Inyección en Base de Datos del Navegador",
        "description": (
            "La aplicación parece almacenar datos controlados por el usuario en bases de datos "
            "del lado del cliente (localStorage, IndexedDB, WebSQL). "
            "Si estos datos se procesan posteriormente de forma insegura, pueden facilitar ataques XSS persistente."
        ),
        "solution": (
            "Nunca almacene datos sensibles del usuario en almacenamiento del lado del cliente sin cifrado. "
            "Trate todos los datos recuperados del almacenamiento local como potencialmente maliciosos "
            "y aplique codificación de salida apropiada antes de renderizarlos."
        ),
        "other_info": "Se detectó uso de almacenamiento del lado del cliente con datos potencialmente controlables por el usuario.",
    },

    "10104": {
        "name": "Fuzzer de User-Agent",
        "description": (
            "Se comprobaron diferencias en la respuesta basadas en el User-Agent fuzzing "
            "(por ejemplo, sitios móviles, acceso como crawler de motor de búsqueda). "
            "Se compara el código de estado y el hash del cuerpo de la respuesta con la respuesta original. "
            "Esto es informativo y no necesariamente una vulnerabilidad."
        ),
        "solution": (
            "Esto es una alerta informativa. Revise si la aplicación devuelve contenido diferente "
            "según el User-Agent de forma intencionada. "
            "Si no es intencionado, asegúrese de que la aplicación sirva contenido consistente "
            "independientemente del User-Agent."
        ),
        "other_info": "La respuesta varía según el valor del encabezado User-Agent enviado en la solicitud.",
    },

    "10111": {
        "name": "Solicitud de Autenticación Identificada",
        "description": (
            "La solicitud dada ha sido identificada como una solicitud de autenticación. "
            "El campo 'Otra información' contiene un conjunto de líneas clave=valor que identifican "
            "los campos relevantes. Esta alerta es informativa y no representa una vulnerabilidad."
        ),
        "solution": (
            "Esta es una alerta informativa y no requiere acción correctiva. "
            "ZAP la usa para configurar automáticamente el método de autenticación en el contexto."
        ),
        "other_info": "ZAP identificó los parámetros de usuario y contraseña en la solicitud de login.",
    },

    "10112": {
        "name": "Respuesta de Gestión de Sesión Identificada",
        "description": (
            "La respuesta dada ha sido identificada como contenedora de un token de gestión de sesión. "
            "El campo 'Otra información' contiene los tokens de encabezado que pueden usarse "
            "en el método de gestión de sesión basado en encabezados. "
            "Esta alerta es informativa."
        ),
        "solution": (
            "Esta es una alerta informativa y no requiere acción correctiva. "
            "Asegúrese de que los tokens de sesión sean suficientemente aleatorios, "
            "tengan expiración apropiada y se transmitan solo sobre HTTPS."
        ),
        "other_info": "Se detectó el token data.session.accessToken en la respuesta JSON del login.",
    },

    "10202": {
        "name": "Tokens Anti-CSRF Ausentes",
        "description": (
            "No se detectaron tokens Anti-CSRF en el formulario HTML. "
            "Los ataques CSRF explotan la confianza que un sitio web tiene en el navegador del usuario. "
            "Permiten a un atacante inducir a los usuarios a realizar acciones que no pretenden realizar."
        ),
        "solution": (
            "Implemente tokens CSRF sincronizados en todos los formularios POST. "
            "Valide el encabezado Origin en el servidor. "
            "Use el atributo SameSite=Strict en las cookies de sesión como defensa en profundidad."
        ),
        "other_info": "No se encontraron tokens CSRF en el formulario analizado.",
    },

    "20014": {
        "name": "HTTP Parameter Pollution (HPP)",
        "description": (
            "Se detectó que la aplicación puede ser vulnerable a HTTP Parameter Pollution. "
            "Un atacante puede enviar múltiples parámetros con el mismo nombre para confundir "
            "la lógica de la aplicación o evadir controles de seguridad."
        ),
        "solution": (
            "Defina claramente cómo la aplicación maneja parámetros duplicados. "
            "Use frameworks que normalicen automáticamente los parámetros. "
            "Valide que solo se acepte un valor por parámetro cuando se espera uno único."
        ),
        "other_info": "La aplicación puede procesar de forma diferente parámetros duplicados en la solicitud.",
    },

    "40003": {
        "name": "CRLF Injection",
        "description": (
            "Se detectó una posible vulnerabilidad de inyección CRLF. "
            "Un atacante puede insertar caracteres de retorno de carro y salto de línea (\\r\\n) "
            "en encabezados HTTP, lo que puede permitir división de respuesta HTTP, "
            "cache poisoning o inyección de encabezados."
        ),
        "solution": (
            "Valide y sanitice todas las entradas de usuario que puedan incluirse en encabezados HTTP. "
            "Rechace o elimine los caracteres CR (\\r) y LF (\\n) de las entradas antes de incluirlas en encabezados. "
            "Use funciones de codificación de encabezados HTTP apropiadas."
        ),
        "other_info": "Se detectaron caracteres CRLF en la respuesta del servidor que pueden indicar inyección exitosa.",
    },

    "40008": {
        "name": "Inyección de Parámetros",
        "description": (
            "Se detectó una posible vulnerabilidad de inyección de parámetros. "
            "Un atacante puede manipular los parámetros de la solicitud para alterar "
            "el comportamiento de la aplicación de formas no previstas."
        ),
        "solution": (
            "Valide todos los parámetros de entrada contra un conjunto de valores esperados. "
            "Use listas blancas en lugar de listas negras para la validación. "
            "Aplique el principio de mínimo privilegio."
        ),
        "other_info": "La respuesta del servidor varía de forma inesperada ante parámetros manipulados.",
    },

    "40009": {
        "name": "Inclusión Remota de Archivos del Servidor (RFI)",
        "description": (
            "Se detectó una posible vulnerabilidad de Remote File Inclusion. "
            "Un atacante puede incluir archivos remotos maliciosos en la aplicación, "
            "lo que podría resultar en ejecución de código arbitrario en el servidor."
        ),
        "solution": (
            "Deshabilite allow_url_include si usa PHP. "
            "Valide y sanitice estrictamente cualquier parámetro que determine qué archivo cargar. "
            "Use listas blancas de archivos permitidos. "
            "Nunca use entrada del usuario directamente para construir rutas de archivo."
        ),
        "other_info": "El servidor parece intentar cargar un recurso desde una URL externa proporcionada como parámetro.",
    },

    "40013": {
        "name": "Deserialización No Segura",
        "description": (
            "La aplicación parece deserializar datos controlados por el usuario sin validación adecuada. "
            "La deserialización insegura puede llevar a ejecución remota de código, "
            "ataques de denegación de servicio o manipulación de la lógica de negocio."
        ),
        "solution": (
            "Evite deserializar datos de fuentes no confiables. "
            "Si es necesario, use formatos de datos con esquemas estrictos como JSON con validación de esquema. "
            "Implemente verificación de integridad de los datos serializados. "
            "Aplique el principio de mínimo privilegio al proceso de deserialización."
        ),
        "other_info": "Se detectaron patrones de datos serializados en la solicitud que el servidor procesa.",
    },

    "40042": {
        "name": "Spring4Shell",
        "description": (
            "Se detectó una posible vulnerabilidad Spring4Shell (CVE-2022-22965). "
            "Esta vulnerabilidad crítica afecta a aplicaciones Spring Framework y puede permitir "
            "ejecución remota de código en condiciones específicas."
        ),
        "solution": (
            "Actualice Spring Framework a la versión 5.3.18+ o 5.2.20+. "
            "Actualice Spring Boot a 2.6.6+ o 2.5.12+. "
            "Aplique los parches de seguridad disponibles del proveedor."
        ),
        "other_info": "Se detectaron patrones de solicitud asociados a intentos de explotación de Spring4Shell.",
    },

    "90001": {
        "name": "Reflexión de Parámetros del Lado del Cliente",
        "description": (
            "Se detectó que la aplicación refleja parámetros de entrada del usuario "
            "directamente en respuestas del lado del cliente sin codificación apropiada. "
            "Esto puede facilitar ataques de tipo DOM-based XSS."
        ),
        "solution": (
            "Codifique apropiadamente todos los datos antes de incluirlos en el DOM. "
            "Use APIs DOM seguras como textContent en lugar de innerHTML. "
            "Implemente una Content Security Policy estricta."
        ),
        "other_info": "Los parámetros de entrada se reflejan en el contexto JavaScript del lado del cliente.",
    },

    "90011": {
        "name": "Divulgación de Información de Charset",
        "description": (
            "El servidor no especifica un charset en el encabezado Content-Type, "
            "lo que puede causar que los navegadores intenten detectar automáticamente la codificación "
            "y potencialmente interpretar la respuesta de formas no intencionadas."
        ),
        "solution": (
            "Especifique siempre el charset en el encabezado Content-Type: Content-Type: application/json; charset=utf-8. "
            "Use UTF-8 como charset estándar para todas las respuestas."
        ),
        "other_info": "El encabezado Content-Type no incluye la especificación del charset.",
    },

    "90022": {
        "name": "Navegación Forzada",
        "description": (
            "La aplicación puede ser vulnerable a ataques de forced browsing (navegación forzada). "
            "Un atacante puede acceder directamente a URLs o recursos que no están enlazados "
            "en la interfaz de usuario pero que son accesibles si se conoce la ruta."
        ),
        "solution": (
            "Implemente controles de autorización en el servidor para todos los recursos, "
            "no solo en los que están enlazados en la interfaz. "
            "No confíe en la seguridad por oscuridad. "
            "Use roles y permisos explícitos para cada recurso."
        ),
        "other_info": "Se detectaron recursos accesibles directamente sin estar enlazados en la navegación normal.",
    },

    "90033": {
        "name": "Librería JavaScript Vulnerable",
        "description": (
            "La aplicación usa una versión de librería JavaScript que tiene vulnerabilidades conocidas. "
            "Las librerías desactualizadas pueden contener vulnerabilidades de XSS, "
            "prototype pollution u otras vulnerabilidades de seguridad."
        ),
        "solution": (
            "Actualice las librerías JavaScript a sus versiones más recientes y seguras. "
            "Use herramientas como npm audit, Snyk o Dependabot para identificar dependencias vulnerables. "
            "Implemente un proceso de gestión de dependencias regular."
        ),
        "other_info": "Se detectó el uso de una versión de librería con vulnerabilidades conocidas en la base de datos CVE.",
    },

    # =========================================================================
    # LOW — Riesgo Bajo
    # =========================================================================

    "10006": {
        "name": "Path Traversal",
        "description": (
            "La técnica de Path Traversal permite a un atacante acceder a archivos y directorios "
            "que están fuera del directorio raíz de la aplicación web. "
            "Mediante secuencias especiales como '../', un atacante puede navegar por el sistema de archivos."
        ),
        "solution": (
            "Valide y canonicalice todas las rutas de archivo antes de procesarlas. "
            "Use listas blancas de archivos permitidos. "
            "Implemente controles de acceso al sistema de archivos a nivel del sistema operativo."
        ),
        "other_info": "Se detectaron intentos de path traversal que produjeron respuestas inusuales del servidor.",
    },

    "10010": {
        "name": "Establecimiento de Cookies sin Atributo Secure",
        "description": (
            "Una cookie fue configurada sin el atributo 'Secure', lo que significa "
            "que puede ser transmitida sobre conexiones HTTP no cifradas. "
            "Un atacante en posición de man-in-the-middle podría interceptar la cookie."
        ),
        "solution": (
            "Configure el atributo 'Secure' en todas las cookies que contengan información sensible "
            "o tokens de sesión. Esto garantiza que solo se transmitan sobre HTTPS."
        ),
        "other_info": "La cookie de sesión fue enviada sin el atributo Secure.",
    },

    "10011": {
        "name": "Establecimiento de Cookies sin Atributo HttpOnly",
        "description": (
            "Una cookie fue configurada sin el atributo 'HttpOnly'. "
            "Las cookies sin HttpOnly pueden ser accedidas mediante JavaScript del lado del cliente, "
            "lo que las hace vulnerables a robo mediante ataques XSS."
        ),
        "solution": (
            "Configure el atributo 'HttpOnly' en todas las cookies de sesión "
            "para prevenir su acceso desde JavaScript. "
            "Esto mitiga el impacto de ataques XSS."
        ),
        "other_info": "La cookie de sesión fue enviada sin el atributo HttpOnly.",
    },

    "10015": {
        "name": "Divulgación de Información en el Encabezado de Respuesta",
        "description": (
            "El servidor web revela información sobre su versión, tecnología o configuración "
            "a través de encabezados HTTP en las respuestas. "
            "Esta información puede ayudar a un atacante a planificar ataques más específicos."
        ),
        "solution": (
            "Configure el servidor para minimizar la información expuesta en los encabezados. "
            "Elimine o modifique encabezados como 'Server', 'X-Powered-By', 'X-AspNet-Version'. "
            "En API Gateway, use custom response headers para controlar qué información se expone."
        ),
        "other_info": "Los encabezados de respuesta revelan información sobre la tecnología del servidor.",
    },

    "10017": {
        "name": "Cross-Domain JavaScript Source File Inclusion",
        "description": (
            "La página incluye uno o más archivos de script JavaScript de dominios de terceros. "
            "Si estos dominios son comprometidos, el código malicioso podría ejecutarse "
            "en el contexto de la aplicación vulnerable."
        ),
        "solution": (
            "Use Subresource Integrity (SRI) para verificar la integridad de los recursos externos. "
            "Considere hospedar las librerías críticas en su propio dominio. "
            "Implemente una CSP que restrinja los orígenes permitidos para scripts."
        ),
        "other_info": "Se detectó la inclusión de scripts desde dominios externos sin verificación de integridad.",
    },

    "10020": {
        "name": "Encabezado X-Frame-Options Ausente o Inseguro",
        "description": (
            "El encabezado X-Frame-Options no está configurado correctamente. "
            "Esto puede permitir ataques de clickjacking donde la aplicación es incrustada "
            "en un iframe malicioso para engañar a los usuarios."
        ),
        "solution": (
            "Configure el encabezado X-Frame-Options: DENY o SAMEORIGIN. "
            "Alternativamente, use la directiva frame-ancestors en CSP "
            "que es más flexible y específica."
        ),
        "other_info": "La aplicación no restringe su carga dentro de iframes de otros dominios.",
    },

    "10028": {
        "name": "Configuración Abierta de Amazon S3",
        "description": (
            "Se detectó un bucket de Amazon S3 que puede tener configuración de acceso abierta. "
            "Buckets S3 mal configurados pueden exponer datos sensibles al público."
        ),
        "solution": (
            "Revise y restrinja los permisos del bucket S3. "
            "Deshabilite el acceso público a menos que sea estrictamente necesario. "
            "Use políticas de bucket S3 con el principio de mínimo privilegio. "
            "Habilite el registro de acceso de S3 para auditoría."
        ),
        "other_info": "Se detectó una URL de S3 que responde con contenido o información de directorio.",
    },

    "10029": {
        "name": "Cookie Poisoning",
        "description": (
            "La aplicación puede ser vulnerable a envenenamiento de cookies. "
            "Un atacante puede manipular el valor de las cookies para alterar "
            "el comportamiento de la aplicación o escalar privilegios."
        ),
        "solution": (
            "Firme criptográficamente todas las cookies que contengan datos críticos. "
            "Valide la integridad de las cookies en el servidor antes de procesarlas. "
            "Evite almacenar datos sensibles directamente en cookies; use referencias de sesión del servidor."
        ),
        "other_info": "El servidor acepta y procesa valores de cookies sin verificar su integridad.",
    },

    "10040": {
        "name": "Secure Pages Include Mixed Content",
        "description": (
            "La página segura (HTTPS) incluye recursos desde conexiones no seguras (HTTP). "
            "Esto puede comprometer la seguridad de la página ya que los recursos HTTP "
            "pueden ser interceptados y modificados por un atacante."
        ),
        "solution": (
            "Asegúrese de que todos los recursos incluidos en páginas HTTPS "
            "también se sirvan sobre HTTPS. "
            "Use URLs relativas al protocolo (//) o URLs absolutas con HTTPS. "
            "Configure Content-Security-Policy: upgrade-insecure-requests."
        ),
        "other_info": "Se detectaron recursos HTTP incluidos en una página servida sobre HTTPS.",
    },

    "10041": {
        "name": "HTTP to HTTPS Insecure Transition in Form Post",
        "description": (
            "Un formulario HTML en una página HTTPS envía datos a una URL HTTP. "
            "Esto expone los datos del formulario, potencialmente incluyendo credenciales, "
            "a interceptación por parte de atacantes en posición de man-in-the-middle."
        ),
        "solution": (
            "Asegúrese de que todos los formularios en páginas HTTPS envíen datos a URLs HTTPS. "
            "Implemente HSTS para forzar conexiones seguras en toda la aplicación."
        ),
        "other_info": "El atributo action del formulario apunta a una URL HTTP en lugar de HTTPS.",
    },

    "10042": {
        "name": "HTTPS to HTTP Insecure Transition in Form Post",
        "description": (
            "Se detectó una transición de HTTPS a HTTP en el envío de un formulario. "
            "Los datos del formulario pueden ser interceptados durante la transmisión."
        ),
        "solution": (
            "Use siempre HTTPS en los atributos action de los formularios. "
            "Nunca redireccione de HTTPS a HTTP para el envío de datos sensibles."
        ),
        "other_info": "La transición de HTTPS a HTTP en el envío del formulario puede exponer datos sensibles.",
    },

    "10044": {
        "name": "Divulgación de Big Redirect",
        "description": (
            "La aplicación realiza una redirección con una respuesta que contiene más de 512 bytes de contenido. "
            "Esto puede indicar que la aplicación no maneja correctamente las redirecciones "
            "y puede exponer información sensible en el cuerpo de la respuesta de redirección."
        ),
        "solution": (
            "Asegúrese de que las respuestas de redirección (3xx) no contengan "
            "cuerpos de respuesta con información sensible. "
            "Implemente redirecciones limpias con respuestas mínimas."
        ),
        "other_info": "La respuesta de redirección contiene un cuerpo de respuesta inusualmente grande.",
    },

    "10045": {
        "name": "Divulgación de Código Fuente - Git",
        "description": (
            "La aplicación expone su repositorio Git a través de la web. "
            "Un atacante puede acceder al historial de commits, código fuente, "
            "credenciales hardcodeadas y configuración sensible."
        ),
        "solution": (
            "Configure el servidor web para denegar el acceso al directorio .git. "
            "Nunca despliegue repositorios Git en servidores de producción. "
            "Use .gitignore para excluir archivos sensibles del repositorio."
        ),
        "other_info": "El directorio .git es accesible públicamente a través del servidor web.",
    },

    "10046": {
        "name": "Divulgación de Código Fuente - SVN",
        "description": (
            "La aplicación expone su repositorio SVN a través de la web. "
            "Esto puede revelar código fuente, configuración y datos sensibles."
        ),
        "solution": (
            "Configure el servidor web para denegar el acceso al directorio .svn. "
            "Elimine los directorios SVN de los entornos de producción."
        ),
        "other_info": "El directorio .svn es accesible públicamente.",
    },

    "10048": {
        "name": "Divulgación de Cookies Privadas",
        "description": (
            "Se detectó que las cookies contienen información potencialmente sensible "
            "que no debería ser accesible desde el lado del cliente."
        ),
        "solution": (
            "No almacene información sensible directamente en cookies del lado del cliente. "
            "Use referencias de sesión del servidor en lugar de datos en sí. "
            "Configure el atributo HttpOnly para prevenir acceso JavaScript."
        ),
        "other_info": "Las cookies contienen datos que pueden ser leídos por JavaScript del lado del cliente.",
    },

    "10050": {
        "name": "Contenido Recuperado del Caché",
        "description": (
            "La respuesta fue recuperada de un caché en lugar del servidor de origen. "
            "Esto puede indicar que respuestas con datos sensibles están siendo cacheadas "
            "y pueden ser accedidas por otros usuarios."
        ),
        "solution": (
            "Configure los encabezados Cache-Control apropiadamente para respuestas con datos sensibles: "
            "Cache-Control: no-store, no-cache, must-revalidate. "
            "Revise la configuración de caché en todos los niveles (CDN, proxy, navegador)."
        ),
        "other_info": "La respuesta incluye encabezados que indican que fue servida desde caché.",
    },

    "10052": {
        "name": "Encabezado X-ChromeLogger-Data Encontrado",
        "description": (
            "Se detectó el encabezado X-ChromeLogger-Data en la respuesta. "
            "Este encabezado puede contener información de depuración sensible "
            "como variables del servidor, consultas SQL y datos de sesión."
        ),
        "solution": (
            "Deshabilite ChromeLogger y cualquier otro middleware de logging HTTP "
            "en entornos de producción. "
            "Nunca envíe información de depuración en encabezados HTTP de respuesta en producción."
        ),
        "other_info": "El encabezado ChromeLogger expone información interna del servidor.",
    },

    "10095": {
        "name": "Divulgación de Backup de Archivos",
        "description": (
            "Se detectó un archivo de backup accesible públicamente. "
            "Los archivos de backup pueden contener código fuente, configuración, "
            "credenciales u otros datos sensibles."
        ),
        "solution": (
            "Elimine todos los archivos de backup del servidor web de producción. "
            "Configure el servidor para bloquear el acceso a extensiones de backup comunes "
            "como .bak, .old, .backup, .zip, .tar.gz."
        ),
        "other_info": "Se detectó un archivo con extensión de backup accesible públicamente.",
    },

    # =========================================================================
    # INFORMATIONAL — Informativo
    # =========================================================================

    "0": {
        "name": "Falso Positivo Potencial",
        "description": (
            "ZAP ha identificado un posible hallazgo que requiere revisión manual "
            "para determinar si es un verdadero positivo o un falso positivo. "
            "Esta alerta es de tipo informativo."
        ),
        "solution": "Revise manualmente el hallazgo para determinar su validez y aplicabilidad.",
        "other_info": "Esta alerta requiere revisión manual para confirmar si es un problema real.",
    },

    "10032": {
        "name": "Viewstate sin Protección de MAC",
        "description": (
            "El ViewState de ASP.NET no tiene habilitada la protección MAC (Message Authentication Code). "
            "Esto permite que el ViewState sea manipulado por un atacante, "
            "potencialmente llevando a cross-site scripting u otros ataques."
        ),
        "solution": (
            "Habilite la protección MAC del ViewState en la configuración de ASP.NET. "
            "Configure enableViewStateMac=true en web.config."
        ),
        "other_info": "El ViewState de la página no incluye un MAC para verificar su integridad.",
    },

    "10096": {
        "name": "Timestamp Divulgado",
        "description": (
            "Se detectó un timestamp en la respuesta que puede revelar información "
            "sobre la última modificación del servidor o del contenido. "
            "Esta información puede ayudar a un atacante a planificar ataques específicos."
        ),
        "solution": (
            "Evalúe si es necesario exponer timestamps en las respuestas. "
            "Si no es necesario, elimine esta información de las respuestas."
        ),
        "other_info": "Se detectó un timestamp en la respuesta que puede revelar información del sistema.",
    },

    "10109": {
        "name": "Encabezado Moderno de Política de Origen Ausente",
        "description": (
            "La aplicación no implementa el encabezado de política de origen moderno "
            "como Cross-Origin-Opener-Policy (COOP), Cross-Origin-Embedder-Policy (COEP) "
            "o Cross-Origin-Resource-Policy (CORP). "
            "Estos encabezados proporcionan aislamiento adicional contra ataques como Spectre."
        ),
        "solution": (
            "Considere implementar los encabezados de política de origen: "
            "Cross-Origin-Opener-Policy: same-origin; "
            "Cross-Origin-Embedder-Policy: require-corp; "
            "Cross-Origin-Resource-Policy: same-origin."
        ),
        "other_info": "Los encabezados modernos de aislamiento de origen no están configurados.",
    },

    "90027": {
        "name": "Ataque de Inyección de CSS",
        "description": (
            "Se detectó una posible vulnerabilidad de inyección CSS. "
            "Un atacante puede inyectar código CSS malicioso que puede usarse "
            "para extraer información sensible o realizar ataques de phishing visual."
        ),
        "solution": (
            "Valide y sanitice todas las entradas del usuario que puedan afectar los estilos CSS. "
            "Use una CSP estricta que restrinja el uso de estilos en línea. "
            "Evite generar CSS dinámicamente desde entrada del usuario."
        ),
        "other_info": "La entrada del usuario puede ser reflejada en contextos CSS.",
    },

    "90028": {
        "name": "Vulnerabilidad de Redirección Abierta",
        "description": (
            "La aplicación puede redirigir usuarios a URLs externas sin validación. "
            "Un atacante puede abusar de esto para redirigir usuarios a sitios de phishing "
            "o maliciosos mientras mantiene la apariencia de un dominio legítimo."
        ),
        "solution": (
            "Valide todas las URLs de redirección contra una lista blanca de dominios permitidos. "
            "Use redirecciones relativas en lugar de absolutas cuando sea posible. "
            "Si necesita redirigir a URLs externas, muestre una página de advertencia intermedia."
        ),
        "other_info": "El parámetro de redirección acepta URLs externas arbitrarias sin validación.",
    },

    "90034": {
        "name": "Inyección de Encabezado de Host",
        "description": (
            "La aplicación puede ser vulnerable a inyección del encabezado Host. "
            "Un atacante puede manipular el encabezado Host para influir en la generación de URLs, "
            "envenenamiento de caché web o restablecimiento de contraseñas."
        ),
        "solution": (
            "Valide el encabezado Host contra una lista blanca de dominios permitidos. "
            "Use valores de configuración explícitos para la generación de URLs en lugar del encabezado Host. "
            "Configure el servidor web para rechazar solicitudes con encabezados Host no reconocidos."
        ),
        "other_info": "La aplicación usa el valor del encabezado Host sin validación para generar URLs.",
    },

}

# ── Mapa adicional por nombre normalizado (fallback cuando no hay Plugin ID) ──
ZAP_TRANSLATIONS_BY_NAME = {
    "source code disclosure - file inclusion":          ZAP_TRANSLATIONS["43"],
    "cors misconfiguration":                            ZAP_TRANSLATIONS["40040"],
    "cross-domain misconfiguration":                    ZAP_TRANSLATIONS["10098"],
    "integer overflow error":                           ZAP_TRANSLATIONS["30003"],
    "proxy disclosure":                                 ZAP_TRANSLATIONS["40025"],
    "strict-transport-security header not set":         ZAP_TRANSLATIONS["10035"],
    "x-content-type-options header missing":            ZAP_TRANSLATIONS["10021"],
    "authentication request identified":                ZAP_TRANSLATIONS["10111"],
    "non-storable content":                             ZAP_TRANSLATIONS["10049"],
    "session management response identified":           ZAP_TRANSLATIONS["10112"],
    "storable and cacheable content":                   ZAP_TRANSLATIONS["10049"],
    "user agent fuzzer":                                ZAP_TRANSLATIONS["10104"],
    "cross site scripting (reflected)":                 ZAP_TRANSLATIONS["40012"],
    "cross site scripting (persistent)":                ZAP_TRANSLATIONS["40014"],
    "sql injection":                                    ZAP_TRANSLATIONS["40018"],
    "sql injection - mysql":                            ZAP_TRANSLATIONS["40019"],
    "sql injection - postgresql":                       ZAP_TRANSLATIONS["40022"],
    "anti-csrf tokens check":                           ZAP_TRANSLATIONS["10202"],
    "x-frame-options header not set":                   ZAP_TRANSLATIONS["10036"],
    "content security policy (csp) header not set":     ZAP_TRANSLATIONS["10038"],
    "cookie no httponly flag":                          ZAP_TRANSLATIONS["10011"],
    "cookie without secure flag":                       ZAP_TRANSLATIONS["10010"],
    "cookie without samesite attribute":                ZAP_TRANSLATIONS["10054"],
    "open redirect":                                    ZAP_TRANSLATIONS["90028"],
    "remote file inclusion":                            ZAP_TRANSLATIONS["40009"],
    "path traversal":                                   ZAP_TRANSLATIONS["10006"],
    "crlf injection":                                   ZAP_TRANSLATIONS["40003"],
    "information disclosure - sensitive information in url": ZAP_TRANSLATIONS["10056"],
    "pii disclosure":                                   ZAP_TRANSLATIONS["10062"],
    "timestamp disclosure":                             ZAP_TRANSLATIONS["10096"],
    "host header injection":                            ZAP_TRANSLATIONS["90034"],
}


def translate_alert(plugin_id: str, name: str) -> dict:
    """
    Devuelve la traducción al español de un hallazgo ZAP.

    Prioridad:
    1. Busca por Plugin ID exacto
    2. Busca por nombre normalizado
    3. Devuelve None si no hay traducción disponible

    Args:
        plugin_id: ID del plugin ZAP (string)
        name: Nombre del hallazgo en inglés

    Returns:
        dict con keys: name, description, solution, other_info
        o None si no hay traducción
    """
    # Buscar por Plugin ID
    translation = ZAP_TRANSLATIONS.get(str(plugin_id))
    if translation:
        return translation

    # Buscar por nombre normalizado
    name_key = name.lower().strip()
    translation = ZAP_TRANSLATIONS_BY_NAME.get(name_key)
    if translation:
        return translation

    return None
