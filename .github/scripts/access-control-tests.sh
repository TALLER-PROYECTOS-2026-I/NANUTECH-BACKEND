#!/usr/bin/env bash
# =============================================================================
# access-control-tests.sh
#
# Prueba Broken Access Control (OWASP A01):
#   → Verifica que cada endpoint SOLO acepte los roles autorizados
#   → Roles que NO deben tener acceso deben recibir 403
#   → Endpoints públicos deben ser accesibles sin token (200/400, nunca 401)
#
# Variables de entorno requeridas (inyectadas por el workflow):
#   API_URL       → URL base del API Gateway
#   TOKEN_ADMIN   → Bearer token del ADMIN
#   TOKEN_GERENTE → Bearer token del GERENTE
#   TOKEN_CHOFER  → Bearer token del CHOFER
#
# Salida: ${REPORT_DIR:-security-owasp/reports}/access-control-report.json
# =============================================================================

set -euo pipefail

# ── Colores para stdout ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Validar variables de entorno ─────────────────────────────────────────────
for var in API_URL TOKEN_ADMIN TOKEN_GERENTE TOKEN_CHOFER; do
  if [ -z "${!var:-}" ]; then
    echo -e "${RED}❌ Variable de entorno '$var' no definida${NC}"
    exit 1
  fi
done

mkdir -p reports

# ── Contadores globales ───────────────────────────────────────────────────────
TOTAL=0
PASS=0
FAIL=0
FAIL_CRITICO=0   # 200 cuando debía ser 403 (acceso indebido)
FAIL_MENOR=0     # 403 cuando debía ser 200 (falso negativo)

# ── Acumulador JSON ───────────────────────────────────────────────────────────
RESULTADOS_JSON="{}"

# ── Función principal de prueba ───────────────────────────────────────────────
# Uso: check_access <ROL> <TOKEN> <METHOD> <ENDPOINT_PATH> <EXPECTED_STATUS> [BODY]
#
# EXPECTED_STATUS puede ser:
#   200    → debe tener acceso (2xx)
#   403    → debe ser rechazado por rol
#   401    → debe requerir autenticación
#   PUBLIC → endpoint público, esperamos 200 o 400 (no 401/403)
check_access() {
  local ROL="$1"
  local TOKEN="$2"
  local METHOD="$3"
  local PATH_EP="$4"
  local EXPECTED="$5"
  local BODY="${6:-}"

  TOTAL=$((TOTAL + 1))
  local URL="${API_URL}${PATH_EP}"
  local RESULTADO="PASS"
  local NOTA=""

  # Construir comando curl
  local CURL_ARGS=(-s -o /dev/null -w "%{http_code}" --max-time 15 -X "$METHOD")

  if [ "$TOKEN" != "NONE" ]; then
    CURL_ARGS+=(-H "Authorization: Bearer $TOKEN")
  fi

  CURL_ARGS+=(-H "Content-Type: application/json")

  if [ -n "$BODY" ]; then
    CURL_ARGS+=(-d "$BODY")
  fi

  local HTTP_STATUS
  HTTP_STATUS=$(curl "${CURL_ARGS[@]}" "$URL" 2>/dev/null || echo "000")

  # ── Evaluar resultado ────────────────────────────────────────────────────
  if [ "$EXPECTED" = "PUBLIC" ]; then
    # Endpoint público: aceptamos 200, 201, 400, 404 — NO 401 ni 403
    if [[ "$HTTP_STATUS" =~ ^(200|201|400|404)$ ]]; then
      RESULTADO="PASS"
    else
      RESULTADO="FAIL_MENOR"
      NOTA="Endpoint público devolvió $HTTP_STATUS (esperaba 2xx/400/404)"
      FAIL_MENOR=$((FAIL_MENOR + 1))
      FAIL=$((FAIL + 1))
    fi

  elif [ "$EXPECTED" = "200" ]; then
    # Rol autorizado: debe recibir 2xx (200, 201, 204)
    if [[ "$HTTP_STATUS" =~ ^2 ]]; then
      RESULTADO="PASS"
    elif [ "$HTTP_STATUS" = "404" ]; then
      # 404 puede ser válido si el recurso no existe en testing
      RESULTADO="PASS"
      NOTA="404 aceptado (recurso no existe en ambiente de testing)"
    else
      RESULTADO="FAIL_MENOR"
      NOTA="Rol $ROL debía tener acceso, recibió $HTTP_STATUS"
      FAIL_MENOR=$((FAIL_MENOR + 1))
      FAIL=$((FAIL + 1))
    fi

  elif [ "$EXPECTED" = "403" ]; then
    # Rol NO autorizado: debe recibir 401 o 403
    if [[ "$HTTP_STATUS" =~ ^(401|403)$ ]]; then
      RESULTADO="PASS"
    elif [[ "$HTTP_STATUS" =~ ^2 ]]; then
      # ⚠️ CRÍTICO: acceso indebido
      RESULTADO="FAIL_CRITICO"
      NOTA="🚨 Broken Access Control: $ROL recibió $HTTP_STATUS en endpoint prohibido"
      FAIL_CRITICO=$((FAIL_CRITICO + 1))
      FAIL=$((FAIL + 1))
    else
      RESULTADO="PASS"
      NOTA="Recibió $HTTP_STATUS (aceptable como rechazo)"
    fi
  fi

  # ── Log en stdout ────────────────────────────────────────────────────────
  if [ "$RESULTADO" = "PASS" ]; then
    echo -e "  ${GREEN}✅ PASS${NC} [$ROL] $METHOD $PATH_EP → $HTTP_STATUS"
    PASS=$((PASS + 1))
  elif [ "$RESULTADO" = "FAIL_CRITICO" ]; then
    echo -e "  ${RED}🚨 CRITICO${NC} [$ROL] $METHOD $PATH_EP → $HTTP_STATUS | $NOTA"
  else
    echo -e "  ${YELLOW}⚠️  WARN${NC}  [$ROL] $METHOD $PATH_EP → $HTTP_STATUS | $NOTA"
  fi

  # ── Acumular JSON ────────────────────────────────────────────────────────
  local ENTRY
  ENTRY=$(jq -n \
    --arg rol "$ROL" \
    --arg method "$METHOD" \
    --arg endpoint "$PATH_EP" \
    --arg expected "$EXPECTED" \
    --arg http_status "$HTTP_STATUS" \
    --arg resultado "$RESULTADO" \
    --arg nota "$NOTA" \
    '{rol:$rol, method:$method, endpoint:$endpoint, expected:$expected, http_status:$http_status, resultado:$resultado, nota:$nota}')

  RESULTADOS_JSON=$(echo "$RESULTADOS_JSON" | jq \
    --arg rol "$ROL" \
    --argjson entry "$ENTRY" \
    '.[$rol] = (.[$rol] // []) + [$entry]')
}

# =============================================================================
# MATRIZ DE PRUEBAS
# Formato: check_access ROL TOKEN METHOD ENDPOINT EXPECTED [BODY]
#
# EXPECTED:
#   200    → el rol DEBE tener acceso
#   403    → el rol NO debe tener acceso (esperamos 401/403)
#   PUBLIC → endpoint sin autenticación (esperamos 2xx o 400)
# =============================================================================

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Nanutech — Broken Access Control Tests        ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

# ── ENDPOINTS PÚBLICOS (sin token) ───────────────────────────────────────────
echo ""
echo -e "${BLUE}── Endpoints públicos (sin autenticación) ──────${NC}"
check_access "PUBLICO" "NONE" "POST" "/auth/login" \
  "PUBLIC" '{"email":"admin@nanutech.com","password":"Admin123!"}'

check_access "PUBLICO" "NONE" "POST" "/auth/forgot-password" \
  "PUBLIC" '{"email":"admin@nanutech.com"}'

check_access "PUBLICO" "NONE" "POST" "/auth/forgot-password/confirm" \
  "PUBLIC" '{"email":"admin@nanutech.com","code":"000000","newPassword":"Test123!"}'

# ── ROL ADMIN ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}── ROL ADMIN (debe tener acceso) ───────────────${NC}"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/auth/me"                       "200"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/camiones"                      "200"
check_access "ADMIN" "$TOKEN_ADMIN" "POST" "/camiones"                      "200" \
  '{"placa":"TEST-ZAP","marca":"Volvo","modelo":"FH16","anio":2023,"capacidad_ton":20,"vin":"VINTEST001","color":"Blanco","combustible":"DIESEL","gps":true}'
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/camiones/panel"                "200"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/camiones/exportar/csv"         "200"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/dashboard"                     "200"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/jornadas"                      "200"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/jornadas/exportar"             "200"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/conductores"                   "200"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/contratos/vigentes"            "200"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/unidades/disponibles"          "200"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/gps/proveedores"               "200"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/gps/plantilla"                 "200"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/gps/resumen"                   "200"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/gps/registros"                 "200"

echo ""
echo -e "${BLUE}── ROL ADMIN (NO debe tener acceso) ────────────${NC}"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/dashboard/gerencial"           "403"
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/contratos"                     "403"
check_access "ADMIN" "$TOKEN_ADMIN" "POST" "/contratos"                     "403" \
  '{"codigo":"TEST-001","cliente":"Test","tipo_servicio":"POR_VIAJE","fecha_inicio":"2026-01-01"}'
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/contratos/indicadores"         "403"
check_access "ADMIN" "$TOKEN_ADMIN" "POST" "/jornadas/iniciar"              "403" \
  '{"jornada_id":"cccc0001-0000-0000-0000-000000000001"}'
check_access "ADMIN" "$TOKEN_ADMIN" "POST" "/jornadas/finalizar"            "403" \
  '{"jornada_id":"cccc0001-0000-0000-0000-000000000001","km_recorridos":100}'
check_access "ADMIN" "$TOKEN_ADMIN" "GET"  "/jornadas/actual/22222222-2222-2222-2222-222222222222" "403"

# ── ROL GERENTE ───────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}── ROL GERENTE (debe tener acceso) ─────────────${NC}"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/auth/me"                   "200"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/dashboard/gerencial"       "200"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/jornadas"                  "200"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/jornadas/exportar"         "200"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/conductores"               "200"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos"                 "200"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/contratos"                 "200" \
  '{"codigo":"TEST-GER-001","cliente":"Test SA","tipo_servicio":"POR_VIAJE","fecha_inicio":"2026-01-01"}'
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos/vigentes"        "200"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos/indicadores"     "200"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/unidades/disponibles"      "200"

echo ""
echo -e "${BLUE}── ROL GERENTE (NO debe tener acceso) ──────────${NC}"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/dashboard"                 "403"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones"                  "403"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/camiones"                  "403" \
  '{"placa":"TEST-GER","marca":"Volvo","modelo":"FH16","anio":2023,"capacidad_ton":20,"vin":"VINGERTEST1","color":"Rojo","combustible":"DIESEL","gps":true}'
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones/panel"            "403"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones/exportar/csv"     "403"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/proveedores"           "403"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/resumen"               "403"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/registros"             "403"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/jornadas/iniciar"          "403" \
  '{"jornada_id":"cccc0001-0000-0000-0000-000000000001"}'
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/jornadas/finalizar"        "403" \
  '{"jornada_id":"cccc0001-0000-0000-0000-000000000001","km_recorridos":100}'
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/jornadas/actual/22222222-2222-2222-2222-222222222222" "403"

# ── ROL CHOFER ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}── ROL CHOFER (debe tener acceso) ──────────────${NC}"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/auth/me"                     "200"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/jornadas/actual/22222222-2222-2222-2222-222222222222" "200"
check_access "CHOFER" "$TOKEN_CHOFER" "POST" "/jornadas/iniciar"            "200" \
  '{"jornada_id":"cccc0002-0000-0000-0000-000000000002"}'
check_access "CHOFER" "$TOKEN_CHOFER" "POST" "/jornadas/finalizar"          "200" \
  '{"jornada_id":"cccc0002-0000-0000-0000-000000000002","km_recorridos":300,"observaciones":"Sin incidencias"}'

echo ""
echo -e "${BLUE}── ROL CHOFER (NO debe tener acceso) ───────────${NC}"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/dashboard"                   "403"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/dashboard/gerencial"         "403"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/camiones"                    "403"
check_access "CHOFER" "$TOKEN_CHOFER" "POST" "/camiones"                    "403" \
  '{"placa":"TEST-CHO","marca":"Volvo","modelo":"FH16","anio":2023,"capacidad_ton":20,"vin":"VINCHOTEST1","color":"Azul","combustible":"DIESEL","gps":true}'
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/camiones/panel"              "403"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/jornadas"                    "403"
check_access "CHOFER" "$TOKEN_CHOFER" "POST" "/jornadas"                    "403" \
  '{"conductor_id":"22222222-2222-2222-2222-222222222222","unidad_id":"aaaa0001-0000-0000-0000-000000000001","contrato_id":"bbbb0001-0000-0000-0000-000000000001","fecha_jornada":"2026-05-21","origen":"Lima","destino":"Arequipa","km_estimados":520}'
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/jornadas/exportar"           "403"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/conductores"                 "403"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/contratos"                   "403"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/contratos/vigentes"          "403"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/contratos/indicadores"       "403"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/unidades/disponibles"        "403"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/gps/proveedores"             "403"
check_access "CHOFER" "$TOKEN_CHOFER" "GET"  "/gps/resumen"                 "403"

# ── SIN TOKEN (endpoints protegidos deben devolver 401) ───────────────────────
echo ""
echo -e "${BLUE}── Sin token (debe recibir 401 en protegidos) ──${NC}"
check_access "ANONIMO" "NONE" "GET"  "/auth/me"           "403"
check_access "ANONIMO" "NONE" "GET"  "/camiones"          "403"
check_access "ANONIMO" "NONE" "GET"  "/dashboard"         "403"
check_access "ANONIMO" "NONE" "GET"  "/jornadas"          "403"
check_access "ANONIMO" "NONE" "GET"  "/conductores"       "403"
check_access "ANONIMO" "NONE" "GET"  "/contratos"         "403"
check_access "ANONIMO" "NONE" "GET"  "/gps/proveedores"   "403"

# =============================================================================
# RESUMEN FINAL
# =============================================================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  RESUMEN DE RESULTADOS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "  Total pruebas : ${TOTAL}"
echo -e "  ${GREEN}Pasadas        : ${PASS}${NC}"
echo -e "  ${RED}Fallidas       : ${FAIL}${NC}"
echo -e "    ${RED}🚨 Críticos  : ${FAIL_CRITICO}  (Broken Access Control confirmado)${NC}"
echo -e "    ${YELLOW}⚠️  Menores   : ${FAIL_MENOR}${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

if [ "$FAIL_CRITICO" -gt 0 ]; then
  echo -e "${RED}🚨 Se detectaron $FAIL_CRITICO casos de Broken Access Control${NC}"
fi

# ── Generar JSON de reporte ───────────────────────────────────────────────────
REPORT_JSON=$(jq -n \
  --argjson total "$TOTAL" \
  --argjson pass "$PASS" \
  --argjson fail "$FAIL" \
  --argjson criticos "$FAIL_CRITICO" \
  --argjson menores "$FAIL_MENOR" \
  --argjson resultados "$RESULTADOS_JSON" \
  --arg fecha "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{
    generado_en: $fecha,
    resumen: {
      total_pruebas: $total,
      pasadas: $pass,
      fallidas: $fail,
      fail_critico: $criticos,
      fail_menor: $menores
    },
    resultados: $resultados
  }')

echo "$REPORT_JSON" > ${REPORT_DIR:-security-owasp/reports}/access-control-report.json
echo ""
echo -e "${GREEN}✅ Reporte guardado en ${REPORT_DIR:-security-owasp/reports}/access-control-report.json${NC}"

# Salir con error si hay críticos (para que el job falle en CI/CD)
if [ "$FAIL_CRITICO" -gt 0 ]; then
  exit 1
fi
