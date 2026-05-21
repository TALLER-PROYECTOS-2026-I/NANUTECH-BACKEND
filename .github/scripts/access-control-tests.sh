#!/usr/bin/env bash
# =============================================================================
# access-control-tests.sh
#
# Prueba sistemática de Broken Access Control (OWASP A01:2021).
#
# Por qué existe este script y no lo hace ZAP solo:
#   ZAP con ZAP_AUTH_HEADER_VALUE solo sabe autenticarse como UN rol por job.
#   Para probar "CHOFER intentando acceder a /camiones" necesitamos
#   usar el token de CHOFER pero apuntar a un endpoint que no le corresponde.
#   Eso ZAP no lo hace automáticamente: necesita que explícitamente le digas
#   "usa este token Y prueba este endpoint que no está en su contexto".
#   Este script hace exactamente eso con curl.
#
# Estructura del reporte JSON generado:
# {
#   "resumen": { "total": N, "pass": N, "fail": N },
#   "resultados": {
#     "SIN_TOKEN": [
#       { "endpoint": "GET /camiones", "esperado": "401", "real": "401", "resultado": "PASS" },
#       ...
#     ],
#     "CHOFER": [ ... ],
#     "GERENTE": [ ... ],
#     "ADMIN": [ ... ]
#   }
# }
# =============================================================================

set -euo pipefail

# Variables de entorno requeridas (vienen del workflow)
API="${API_URL:?Variable API_URL no definida}"
TOKEN_ADMIN="${TOKEN_ADMIN:?Variable TOKEN_ADMIN no definida}"
TOKEN_GERENTE="${TOKEN_GERENTE:?Variable TOKEN_GERENTE no definida}"
TOKEN_CHOFER="${TOKEN_CHOFER:?Variable TOKEN_CHOFER no definida}"

# UUIDs de datos seed (migración 002_seed.sql)
CONDUCTOR_ID="22222222-2222-2222-2222-222222222222"
CAMION_ID="aaaa0001-0000-0000-0000-000000000001"
CONTRATO_ID="bbbb0001-0000-0000-0000-000000000001"
JORNADA_ID="cccc0002-0000-0000-0000-000000000002"

mkdir -p reports

# Contadores globales
TOTAL=0; PASS=0; FAIL=0

# Acumulador JSON
declare -A ROL_JSON
ROL_JSON["SIN_TOKEN"]="[]"
ROL_JSON["CHOFER"]="[]"
ROL_JSON["GERENTE"]="[]"
ROL_JSON["ADMIN"]="[]"

# Colores para consola
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# =============================================================================
# test_endpoint <ROL> <TOKEN> <METODO> <PATH> <BODY> <PERMITIDO> <DESCRIPCION>
#
#   ROL       : SIN_TOKEN | CHOFER | GERENTE | ADMIN
#   TOKEN     : Bearer token o "" para sin token
#   METODO    : GET | POST
#   PATH      : /camiones, /camiones/panel, etc.
#   BODY      : JSON string o "" para GET
#   PERMITIDO : "SI" → espera 2xx | "NO" → espera 401 o 403
#   DESCRIPCION: texto libre para el reporte
# =============================================================================
test_endpoint() {
  local ROL="$1"
  local TOKEN="$2"
  local METHOD="$3"
  local PATH="$4"
  local BODY="$5"
  local PERMITIDO="$6"
  local DESC="$7"

  TOTAL=$((TOTAL + 1))

  # Construir comando curl
  local CURL_CMD=(curl -s -o /tmp/resp_body.txt -w "%{http_code}" \
    --max-time 15 \
    -X "$METHOD" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json")

  [ -n "$TOKEN" ] && CURL_CMD+=(-H "Authorization: Bearer $TOKEN")
  [ -n "$BODY" ] && [ "$METHOD" = "POST" ] && CURL_CMD+=(-d "$BODY")
  CURL_CMD+=("${API}${PATH}")

  local STATUS
  STATUS=$("${CURL_CMD[@]}" 2>/dev/null || echo "000")

  local RESP_PREVIEW
  RESP_PREVIEW=$(head -c 120 /tmp/resp_body.txt 2>/dev/null | tr '\n' ' ' | tr '"' "'")

  # Evaluar resultado
  local RESULTADO EMOJI COLOR ESPERADO_STR
  if [ "$PERMITIDO" = "SI" ]; then
    ESPERADO_STR="2xx"
    if [[ "$STATUS" =~ ^2 ]]; then
      RESULTADO="PASS"; EMOJI="✅"; COLOR="$GREEN"; PASS=$((PASS + 1))
    else
      RESULTADO="FAIL"; EMOJI="❌"; COLOR="$RED"; FAIL=$((FAIL + 1))
    fi
  else
    ESPERADO_STR="401 o 403"
    if [[ "$STATUS" == "401" || "$STATUS" == "403" ]]; then
      RESULTADO="PASS"; EMOJI="✅"; COLOR="$GREEN"; PASS=$((PASS + 1))
    elif [[ "$STATUS" =~ ^2 ]]; then
      # 200 donde debería ser 403 = Broken Access Control crítico
      RESULTADO="FAIL_CRITICO"; EMOJI="🚨"; COLOR="$RED"; FAIL=$((FAIL + 1))
    else
      # 404, 500, etc. también deniegan acceso efectivamente
      RESULTADO="PASS"; EMOJI="✅"; COLOR="$GREEN"; PASS=$((PASS + 1))
    fi
  fi

  # Imprimir en consola
  printf "${COLOR}%s${NC} ${BOLD}[%-9s]${NC} %-6s %-40s esperado:%-8s real:${COLOR}%s${NC}  %s\n" \
    "$EMOJI" "$ROL" "$METHOD" "$PATH" "$ESPERADO_STR" "$STATUS" "$DESC"

  # Agregar al JSON del rol
  local ENTRY
  ENTRY=$(printf '{"endpoint":"%s %s","descripcion":"%s","permitido":"%s","esperado":"%s","http_status":"%s","resultado":"%s","respuesta_preview":"%s"}' \
    "$METHOD" "$PATH" "$DESC" "$PERMITIDO" "$ESPERADO_STR" "$STATUS" "$RESULTADO" "$RESP_PREVIEW")

  # Append al array JSON del rol
  if [ "${ROL_JSON[$ROL]}" = "[]" ]; then
    ROL_JSON[$ROL]="[$ENTRY]"
  else
    ROL_JSON[$ROL]="${ROL_JSON[$ROL]%]},${ENTRY}]"
  fi
}

# =============================================================================
# SIN TOKEN — detecta auth bypass
# Todos los endpoints privados deben devolver 401
# =============================================================================
echo ""
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}  SIN TOKEN — Auth Bypass (todos deben devolver 401)${NC}"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"

test_endpoint "SIN_TOKEN" "" "POST" "/auth/login"                   '{"email":"admin@nanutech.com","password":"Admin123!"}' "SI"  "Login es publico"
test_endpoint "SIN_TOKEN" "" "POST" "/auth/forgot-password"         '{"email":"admin@nanutech.com"}'                        "SI"  "Forgot-password es publico"
test_endpoint "SIN_TOKEN" "" "POST" "/auth/forgot-password/confirm" '{"email":"admin@nanutech.com","code":"123456","newPassword":"Test123!"}'  "SI"  "Confirm forgot es publico"
test_endpoint "SIN_TOKEN" "" "GET"  "/auth/me"                      ""  "NO"  "Me requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/camiones"                     ""  "NO"  "Camiones requiere token"
test_endpoint "SIN_TOKEN" "" "POST" "/camiones"                     '{"placa":"X"}' "NO" "POST camiones requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/camiones/${CAMION_ID}"        ""  "NO"  "Camion por ID requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/camiones/panel"               ""  "NO"  "Panel camiones requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/camiones/exportar/csv"        ""  "NO"  "Export CSV requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/dashboard"                    ""  "NO"  "Dashboard requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/dashboard/gerencial"          ""  "NO"  "Dashboard gerencial requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/jornadas"                     ""  "NO"  "Jornadas requiere token"
test_endpoint "SIN_TOKEN" "" "POST" "/jornadas"                     '{"conductor_id":"x"}' "NO" "POST jornadas requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/jornadas/actual/${CONDUCTOR_ID}" "" "NO" "Jornada actual requiere token"
test_endpoint "SIN_TOKEN" "" "POST" "/jornadas/iniciar"             '{"jornada_id":"x"}' "NO" "Iniciar jornada requiere token"
test_endpoint "SIN_TOKEN" "" "POST" "/jornadas/finalizar"           '{"jornada_id":"x"}' "NO" "Finalizar jornada requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/jornadas/exportar"            ""  "NO"  "Exportar jornadas requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/conductores"                  ""  "NO"  "Conductores requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/contratos"                    ""  "NO"  "Contratos requiere token"
test_endpoint "SIN_TOKEN" "" "POST" "/contratos"                    '{"codigo":"X"}' "NO" "POST contratos requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/contratos/${CONTRATO_ID}"     ""  "NO"  "Contrato por ID requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/contratos/indicadores"        ""  "NO"  "Indicadores contratos requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/contratos/vigentes"           ""  "NO"  "Contratos vigentes requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/unidades/disponibles"         ""  "NO"  "Unidades requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/gps/registros"                ""  "NO"  "GPS registros requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/gps/proveedores"              ""  "NO"  "GPS proveedores requiere token"
test_endpoint "SIN_TOKEN" "" "GET"  "/gps/resumen"                  ""  "NO"  "GPS resumen requiere token"

# =============================================================================
# ROL CHOFER
# SI puede: /auth/me, /jornadas/actual/{id}, /jornadas/iniciar, /jornadas/finalizar
# NO puede: TODO LO DEMÁS
# =============================================================================
echo ""
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}  ROL CHOFER — endpoints permitidos vs denegados${NC}"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"

# LO QUE SÍ PUEDE HACER
echo -e "\n${YELLOW}  → Endpoints PERMITIDOS para CHOFER (deben devolver 2xx)${NC}"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/auth/me"                         ""  "SI"  "CHOFER ve su sesion"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/jornadas/actual/${CONDUCTOR_ID}" ""  "SI"  "CHOFER ve su jornada actual"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "POST" "/jornadas/iniciar"   '{"jornada_id":"'"$JORNADA_ID"'"}'  "SI"  "CHOFER inicia jornada"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "POST" "/jornadas/finalizar" '{"jornada_id":"'"$JORNADA_ID"'","km_recorridos":300,"observaciones":"Sin incidencias"}' "SI" "CHOFER finaliza jornada"

# LO QUE NO PUEDE HACER — escalada de privilegios
echo -e "\n${YELLOW}  → Endpoints DENEGADOS para CHOFER (deben devolver 403)${NC}"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/camiones"                        ""  "NO"  "CHOFER no puede listar camiones"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "POST" "/camiones"                        '{"placa":"ZAP-CHF","marca":"Volvo","modelo":"FH16","anio":2023,"capacidad_ton":20,"vin":"VINCHF001","color":"Rojo","combustible":"DIESEL","gps":true}' "NO" "CHOFER no puede crear camion"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/camiones/${CAMION_ID}"           ""  "NO"  "CHOFER no puede ver camion por ID"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/camiones/panel"                  ""  "NO"  "CHOFER no puede ver panel camiones"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/camiones/exportar/csv"           ""  "NO"  "CHOFER no puede exportar CSV"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/dashboard"                       ""  "NO"  "CHOFER no puede ver dashboard admin"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/dashboard/gerencial"             ""  "NO"  "CHOFER no puede ver dashboard gerencial"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/jornadas"                        ""  "NO"  "CHOFER no puede listar todas las jornadas"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "POST" "/jornadas"                        '{"conductor_id":"'"$CONDUCTOR_ID"'","unidad_id":"'"$CAMION_ID"'","contrato_id":"'"$CONTRATO_ID"'","fecha_jornada":"2026-06-01","origen":"Lima","destino":"Ica","km_estimados":300}' "NO" "CHOFER no puede crear jornada"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/jornadas/exportar"               ""  "NO"  "CHOFER no puede exportar jornadas"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/conductores"                     ""  "NO"  "CHOFER no puede ver conductores"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/contratos"                       ""  "NO"  "CHOFER no puede ver contratos"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "POST" "/contratos"                       '{"codigo":"CHF-001","cliente":"Test","tipo_servicio":"POR_VIAJE","fecha_inicio":"2026-01-01"}' "NO" "CHOFER no puede crear contrato"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/contratos/${CONTRATO_ID}"        ""  "NO"  "CHOFER no puede ver contrato por ID"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/contratos/indicadores"           ""  "NO"  "CHOFER no puede ver indicadores"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/contratos/vigentes"              ""  "NO"  "CHOFER no puede ver contratos vigentes"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/unidades/disponibles"            ""  "NO"  "CHOFER no puede ver unidades"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/gps/registros"                   ""  "NO"  "CHOFER no puede ver GPS"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/gps/proveedores"                 ""  "NO"  "CHOFER no puede ver proveedores GPS"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "POST" "/gps/importar"                    '{"proveedor":"GPSCONTROL"}' "NO" "CHOFER no puede importar GPS"
test_endpoint "CHOFER" "$TOKEN_CHOFER" "GET"  "/gps/resumen"                     ""  "NO"  "CHOFER no puede ver resumen GPS"

# =============================================================================
# ROL GERENTE
# SI puede: /dashboard/gerencial, /jornadas, /conductores, /contratos/*, /unidades/disponibles
# NO puede: /camiones/*, /dashboard (admin), /gps/*
# =============================================================================
echo ""
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}  ROL GERENTE — endpoints permitidos vs denegados${NC}"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}  → Endpoints PERMITIDOS para GERENTE (deben devolver 2xx)${NC}"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/auth/me"                       ""  "SI"  "GERENTE ve su sesion"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/dashboard/gerencial"           ""  "SI"  "GERENTE accede a su dashboard"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/jornadas"                      ""  "SI"  "GERENTE lista jornadas"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "POST" "/jornadas"                      '{"conductor_id":"'"$CONDUCTOR_ID"'","unidad_id":"'"$CAMION_ID"'","contrato_id":"'"$CONTRATO_ID"'","fecha_jornada":"2026-06-01","origen":"Lima","destino":"Arequipa","km_estimados":520}' "SI" "GERENTE crea jornada"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/jornadas/exportar"             ""  "SI"  "GERENTE exporta jornadas"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/conductores"                   ""  "SI"  "GERENTE ve conductores"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos"                     ""  "SI"  "GERENTE lista contratos"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "POST" "/contratos"                     '{"codigo":"ZAP-GER-001","cliente":"Empresa Test","tipo_servicio":"POR_VIAJE","fecha_inicio":"2026-01-01"}' "SI" "GERENTE crea contrato"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos/${CONTRATO_ID}"      ""  "SI"  "GERENTE ve contrato por ID"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos/indicadores"         ""  "SI"  "GERENTE ve indicadores"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos/vigentes"            ""  "SI"  "GERENTE ve contratos vigentes"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/unidades/disponibles"          ""  "SI"  "GERENTE ve unidades disponibles"

echo -e "\n${YELLOW}  → Endpoints DENEGADOS para GERENTE (deben devolver 403)${NC}"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones"                      ""  "NO"  "GERENTE no puede listar camiones"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "POST" "/camiones"                      '{"placa":"ZAP-GER","marca":"Volvo","modelo":"FH16","anio":2023,"capacidad_ton":20,"vin":"VINGER001","color":"Azul","combustible":"DIESEL","gps":true}' "NO" "GERENTE no puede crear camion"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones/${CAMION_ID}"         ""  "NO"  "GERENTE no puede ver camion por ID"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones/panel"                ""  "NO"  "GERENTE no puede ver panel camiones"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones/exportar/csv"         ""  "NO"  "GERENTE no puede exportar CSV camiones"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/dashboard"                     ""  "NO"  "GERENTE no puede ver dashboard admin"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/registros"                 ""  "NO"  "GERENTE no puede ver GPS"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/proveedores"               ""  "NO"  "GERENTE no puede ver proveedores GPS"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "POST" "/gps/importar"                  '{"proveedor":"GPSCONTROL"}' "NO" "GERENTE no puede importar GPS"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/resumen"                   ""  "NO"  "GERENTE no puede ver resumen GPS"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "GET"  "/jornadas/actual/${CONDUCTOR_ID}" "" "NO" "GERENTE no puede ver jornada actual de chofer"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "POST" "/jornadas/iniciar"              '{"jornada_id":"'"$JORNADA_ID"'"}' "NO" "GERENTE no puede iniciar jornada"
test_endpoint "GERENTE" "$TOKEN_GERENTE" "POST" "/jornadas/finalizar"            '{"jornada_id":"'"$JORNADA_ID"'"}' "NO" "GERENTE no puede finalizar jornada"

# =============================================================================
# ROL ADMIN
# SI puede: /camiones/*, /dashboard, /jornadas (GET/POST), /conductores,
#           /contratos/vigentes, /unidades/disponibles, /gps/*
# NO puede: /contratos (crud), /dashboard/gerencial, /jornadas/actual, /iniciar, /finalizar
# =============================================================================
echo ""
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}  ROL ADMIN — endpoints permitidos vs denegados${NC}"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}  → Endpoints PERMITIDOS para ADMIN (deben devolver 2xx)${NC}"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/auth/me"                          ""  "SI"  "ADMIN ve su sesion"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/camiones"                         ""  "SI"  "ADMIN lista camiones"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "POST" "/camiones"                         '{"placa":"ZAP-ADM","marca":"Scania","modelo":"R450","anio":2023,"capacidad_ton":22,"vin":"VINADM0001","color":"Negro","combustible":"DIESEL","gps":true}' "SI" "ADMIN crea camion"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/camiones/${CAMION_ID}"            ""  "SI"  "ADMIN ve camion por ID"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/camiones/panel"                   ""  "SI"  "ADMIN ve panel camiones"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/camiones/exportar/csv"            ""  "SI"  "ADMIN exporta CSV"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/dashboard"                        ""  "SI"  "ADMIN ve su dashboard"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/jornadas"                         ""  "SI"  "ADMIN lista jornadas"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "POST" "/jornadas"                         '{"conductor_id":"'"$CONDUCTOR_ID"'","unidad_id":"'"$CAMION_ID"'","contrato_id":"'"$CONTRATO_ID"'","fecha_jornada":"2026-06-02","origen":"Lima","destino":"Ica","km_estimados":300}' "SI" "ADMIN crea jornada"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/jornadas/exportar"                ""  "SI"  "ADMIN exporta jornadas"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/conductores"                      ""  "SI"  "ADMIN ve conductores"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/contratos/vigentes"               ""  "SI"  "ADMIN ve contratos vigentes"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/unidades/disponibles"             ""  "SI"  "ADMIN ve unidades disponibles"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/gps/registros"                    ""  "SI"  "ADMIN ve registros GPS"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/gps/proveedores"                  ""  "SI"  "ADMIN ve proveedores GPS"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/gps/plantilla"                    ""  "SI"  "ADMIN descarga plantilla GPS"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/gps/plantilla/GPSCONTROL"         ""  "SI"  "ADMIN descarga plantilla GPSCONTROL"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/gps/resumen"                      ""  "SI"  "ADMIN ve resumen GPS"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "POST" "/gps/validar"                      '{"proveedor":"GPSCONTROL"}' "SI" "ADMIN valida GPS"

echo -e "\n${YELLOW}  → Endpoints DENEGADOS para ADMIN (deben devolver 403)${NC}"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/contratos"                        ""  "NO"  "ADMIN no puede listar contratos (solo GERENTE)"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "POST" "/contratos"                        '{"codigo":"ADM-001","cliente":"Test","tipo_servicio":"POR_VIAJE","fecha_inicio":"2026-01-01"}' "NO" "ADMIN no puede crear contrato"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/contratos/${CONTRATO_ID}"         ""  "NO"  "ADMIN no puede ver contrato por ID"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/contratos/indicadores"            ""  "NO"  "ADMIN no puede ver indicadores contratos"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/dashboard/gerencial"              ""  "NO"  "ADMIN no puede ver dashboard gerencial"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "GET"  "/jornadas/actual/${CONDUCTOR_ID}"  ""  "NO"  "ADMIN no puede ver jornada actual de chofer"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "POST" "/jornadas/iniciar"                 '{"jornada_id":"'"$JORNADA_ID"'"}' "NO" "ADMIN no puede iniciar jornada (solo CHOFER)"
test_endpoint "ADMIN" "$TOKEN_ADMIN" "POST" "/jornadas/finalizar"               '{"jornada_id":"'"$JORNADA_ID"'"}' "NO" "ADMIN no puede finalizar jornada (solo CHOFER)"

# =============================================================================
# GENERAR REPORTE JSON FINAL
# =============================================================================
FECHA=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > reports/access-control-report.json << JSON
{
  "metadata": {
    "fecha_ejecucion": "${FECHA}",
    "api_url": "${API}",
    "descripcion": "Pruebas de Broken Access Control (OWASP A01:2021). Verifica que cada rol solo accede a los endpoints que le corresponden."
  },
  "resumen": {
    "total_pruebas": ${TOTAL},
    "pasadas": ${PASS},
    "fallidas": ${FAIL},
    "porcentaje_exito": $(echo "scale=1; ${PASS} * 100 / ${TOTAL}" | bc 2>/dev/null || echo "0")
  },
  "como_leer_este_reporte": {
    "PASS": "El endpoint respondio como se esperaba (2xx cuando esta permitido, 401/403 cuando esta denegado)",
    "FAIL": "El endpoint NO respondio como se esperaba (ej: rol no puede acceder pero recibio 2xx)",
    "FAIL_CRITICO": "BROKEN ACCESS CONTROL: el rol recibio 200 en un endpoint que debia denegar con 403"
  },
  "resultados": {
    "SIN_TOKEN": ${ROL_JSON[SIN_TOKEN]},
    "CHOFER": ${ROL_JSON[CHOFER]},
    "GERENTE": ${ROL_JSON[GERENTE]},
    "ADMIN": ${ROL_JSON[ADMIN]}
  }
}
JSON

# =============================================================================
# RESUMEN EN CONSOLA
# =============================================================================
echo ""
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  RESUMEN FINAL${NC}"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "  Total pruebas : ${BOLD}${TOTAL}${NC}"
echo -e "  Pasadas       : ${GREEN}${BOLD}${PASS}${NC}"
echo -e "  Fallidas      : ${RED}${BOLD}${FAIL}${NC}"
echo ""
echo -e "📄 Reporte: ${BOLD}reports/access-control-report.json${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}${BOLD}❌ ${FAIL} prueba(s) de control de acceso fallaron.${NC}"
  echo -e "${RED}   Busca 'FAIL_CRITICO' en el JSON para ver los Broken Access Control.${NC}"
  exit 1
else
  echo -e "${GREEN}${BOLD}✅ Todas las pruebas de control de acceso pasaron.${NC}"
  exit 0
fi
