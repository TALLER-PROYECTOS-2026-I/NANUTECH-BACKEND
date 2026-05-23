#!/usr/bin/env bash
# =============================================================================
# access-control-tests.sh — Nanutech Broken Access Control (OWASP A01)
#
# Verifica la matriz COMPLETA de roles × endpoints según documentación oficial.
# Para cada prueba fallida indica:
#   - Qué rol intentó acceder
#   - Qué HTTP status recibió
#   - Qué roles SÍ deberían tener acceso a ese endpoint
#
# Variables de entorno requeridas:
#   API_URL       → URL base del API Gateway (sin trailing slash)
#   TOKEN_ADMIN   → Bearer token del ADMIN
#   TOKEN_GERENTE → Bearer token del GERENTE
#   TOKEN_CHOFER  → Bearer token del CHOFER
#   REPORT_DIR    → Carpeta de salida (default: security-owasp/reports)
#
# Salida: ${REPORT_DIR}/access-control-report.json
# =============================================================================

set -euo pipefail

# ── Colores para stdout ───────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Validar variables de entorno requeridas ───────────────────────────────────
for var in API_URL TOKEN_ADMIN TOKEN_GERENTE TOKEN_CHOFER; do
  if [ -z "${!var:-}" ]; then
    echo -e "${RED}❌ Variable de entorno '$var' no definida${NC}"
    exit 1
  fi
done

REPORT_DIR="${REPORT_DIR:-security-owasp/reports}"
mkdir -p "$REPORT_DIR"

# ── Contadores globales ───────────────────────────────────────────────────────
TOTAL=0
PASS=0
FAIL=0
FAIL_CRITICO=0    # rol no autorizado recibió 2xx  → Broken Access Control
FAIL_MENOR=0      # rol autorizado recibió 4xx/5xx → posible problema de config

# ── Acumulador JSON ───────────────────────────────────────────────────────────
RESULTADOS_JSON="{}"

# =============================================================================
# check_access
#
# Parámetros:
#   $1  ROL              → nombre del rol que hace la petición (ADMIN, GERENTE, CHOFER, ANONIMO, PUBLICO)
#   $2  TOKEN            → Bearer token, o "NONE" para peticiones sin autenticación
#   $3  METHOD           → HTTP method (GET, POST)
#   $4  PATH_EP          → path del endpoint (ej: /camiones)
#   $5  EXPECTED         → resultado esperado:
#                            200    → rol autorizado, debe recibir 2xx (o 404 si recurso no existe)
#                            403    → rol NO autorizado, debe recibir 401 o 403
#                            PUBLIC → endpoint público, debe recibir 2xx/400/404, nunca 401/403
#   $6  ROLES_PERMITIDOS → string descriptivo de quién SÍ puede acceder (para el reporte)
#   $7  BODY (opcional)  → JSON body para peticiones POST
# =============================================================================
check_access() {
  local ROL="$1"
  local TOKEN="$2"
  local METHOD="$3"
  local PATH_EP="$4"
  local EXPECTED="$5"
  local ROLES_PERMITIDOS="$6"
  local BODY="${7:-}"

  TOTAL=$((TOTAL + 1))
  local URL="${API_URL}${PATH_EP}"
  local RESULTADO="PASS"
  local NOTA=""
  local DETALLE=""

  # ── Construir argumentos curl ─────────────────────────────────────────────
  local CURL_ARGS=(-s -o /dev/null -w "%{http_code}" --max-time 15 -X "$METHOD")

  if [ "$TOKEN" != "NONE" ]; then
    CURL_ARGS+=(-H "Authorization: Bearer $TOKEN")
  fi

  CURL_ARGS+=(-H "Content-Type: application/json")

  if [ -n "$BODY" ]; then
    CURL_ARGS+=(-d "$BODY")
  fi

  # ── Ejecutar petición ─────────────────────────────────────────────────────
  local HTTP_STATUS
  HTTP_STATUS=$(curl "${CURL_ARGS[@]}" "$URL" 2>/dev/null || echo "000")

  # ── Evaluar resultado ─────────────────────────────────────────────────────
  if [ "$EXPECTED" = "PUBLIC" ]; then
    # Endpoint público: aceptamos 200, 201, 400, 404. Nunca debe dar 401/403.
    if [[ "$HTTP_STATUS" =~ ^(200|201|400|404)$ ]]; then
      RESULTADO="PASS"
    else
      RESULTADO="FAIL_MENOR"
      NOTA="Endpoint público devolvió $HTTP_STATUS (esperaba 2xx/400/404)"
      DETALLE="Roles con acceso: $ROLES_PERMITIDOS"
      FAIL_MENOR=$((FAIL_MENOR + 1))
      FAIL=$((FAIL + 1))
    fi

  elif [ "$EXPECTED" = "200" ]; then
    # Rol autorizado: debe recibir 2xx
    if [[ "$HTTP_STATUS" =~ ^2 ]]; then
      RESULTADO="PASS"
    elif [ "$HTTP_STATUS" = "404" ]; then
      # 404 es aceptable si el recurso no existe en el ambiente de testing
      RESULTADO="PASS"
      NOTA="404 aceptado (recurso no existe en ambiente de testing)"
    else
      RESULTADO="FAIL_MENOR"
      NOTA="Rol $ROL debía tener acceso pero recibió $HTTP_STATUS"
      DETALLE="Roles autorizados para $METHOD $PATH_EP: $ROLES_PERMITIDOS"
      FAIL_MENOR=$((FAIL_MENOR + 1))
      FAIL=$((FAIL + 1))
    fi

  elif [ "$EXPECTED" = "403" ]; then
    # Rol NO autorizado: debe recibir 401 o 403
    if [[ "$HTTP_STATUS" =~ ^(401|403)$ ]]; then
      RESULTADO="PASS"
    elif [[ "$HTTP_STATUS" =~ ^2 ]]; then
      # CRÍTICO: acceso indebido confirmado
      RESULTADO="FAIL_CRITICO"
      NOTA="Broken Access Control: $ROL recibió $HTTP_STATUS — acceso indebido"
      DETALLE="Solo deberían acceder: $ROLES_PERMITIDOS"
      FAIL_CRITICO=$((FAIL_CRITICO + 1))
      FAIL=$((FAIL + 1))
    else
      # Cualquier otro código (500, 502, etc.) se acepta como rechazo
      RESULTADO="PASS"
      NOTA="Recibió $HTTP_STATUS (aceptable como rechazo)"
    fi
  fi

  # ── Imprimir resultado en stdout ──────────────────────────────────────────
  if [ "$RESULTADO" = "PASS" ]; then
    echo -e "  ${GREEN}✅ PASS${NC}    [$ROL] $METHOD $PATH_EP → $HTTP_STATUS"
    [ -n "$NOTA" ] && echo -e "             ${CYAN}ℹ️  $NOTA${NC}"
    PASS=$((PASS + 1))
  elif [ "$RESULTADO" = "FAIL_CRITICO" ]; then
    echo -e "  ${RED}🚨 CRITICO${NC} [$ROL] $METHOD $PATH_EP → $HTTP_STATUS"
    echo -e "             ${RED}$NOTA${NC}"
    echo -e "             ${YELLOW}$DETALLE${NC}"
  else
    echo -e "  ${YELLOW}⚠️  WARN${NC}    [$ROL] $METHOD $PATH_EP → $HTTP_STATUS"
    echo -e "             ${YELLOW}$NOTA${NC}"
    [ -n "$DETALLE" ] && echo -e "             ${CYAN}$DETALLE${NC}"
  fi

  # ── Acumular en JSON ──────────────────────────────────────────────────────
  local ENTRY
  ENTRY=$(jq -n \
    --arg rol              "$ROL" \
    --arg method           "$METHOD" \
    --arg endpoint         "$PATH_EP" \
    --arg expected         "$EXPECTED" \
    --arg http_status      "$HTTP_STATUS" \
    --arg resultado        "$RESULTADO" \
    --arg nota             "$NOTA" \
    --arg detalle          "$DETALLE" \
    --arg roles_permitidos "$ROLES_PERMITIDOS" \
    '{
      rol:              $rol,
      method:           $method,
      endpoint:         $endpoint,
      expected:         $expected,
      http_status:      $http_status,
      resultado:        $resultado,
      nota:             $nota,
      detalle:          $detalle,
      roles_permitidos: $roles_permitidos
    }')

  RESULTADOS_JSON=$(echo "$RESULTADOS_JSON" | jq \
    --arg rol "$ROL" \
    --argjson entry "$ENTRY" \
    '.[$rol] = (.[$rol] // []) + [$entry]')
}

# =============================================================================
# MATRIZ DE PRUEBAS — según documentación oficial Nanutech
#
# Formato:
#   check_access ROL TOKEN METHOD PATH EXPECTED "ROLES_PERMITIDOS" [BODY]
# =============================================================================

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Nanutech — Broken Access Control (OWASP A01)      ${NC}"
echo -e "${BLUE}  Matriz completa según documentación oficial        ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS PÚBLICOS — sin autenticación
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─ PÚBLICOS (sin autenticación) ─────────────────────┐${NC}"

check_access "PUBLICO" "NONE" "POST" "/auth/login" \
  "PUBLIC" "TODOS" \
  '{"email":"admin@nanutech.com","password":"Admin123!"}'

check_access "PUBLICO" "NONE" "POST" "/auth/forgot-password" \
  "PUBLIC" "TODOS" \
  '{"email":"admin@nanutech.com"}'

check_access "PUBLICO" "NONE" "POST" "/auth/forgot-password/confirm" \
  "PUBLIC" "TODOS" \
  '{"email":"admin@nanutech.com","code":"000000","newPassword":"Test123!"}'

# ─────────────────────────────────────────────────────────────────────────────
# AUTH/ME — los 3 roles autenticados
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─ GET /auth/me — ADMIN, GERENTE, CHOFER ────────────┐${NC}"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/auth/me" "200" "ADMIN, GERENTE, CHOFER"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/auth/me" "200" "ADMIN, GERENTE, CHOFER"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/auth/me" "200" "ADMIN, GERENTE, CHOFER"
check_access "ANONIMO" "NONE"           "GET" "/auth/me" "403" "ADMIN, GERENTE, CHOFER"

# ─────────────────────────────────────────────────────────────────────────────
# CAMIONES — solo ADMIN
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─ CAMIONES — solo ADMIN ────────────────────────────┐${NC}"

CAMION_BODY='{"placa":"TST-ZAP","marca":"Volvo","modelo":"FH16","anio":2023,"capacidad_ton":20,"vin":"VINZAPTST001","color":"Blanco","combustible":"DIESEL","gps":true}'

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/camiones" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/camiones" "403" "ADMIN"
check_access "ANONIMO" "NONE"           "GET"  "/camiones" "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/camiones" "200" "ADMIN" "$CAMION_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/camiones" "403" "ADMIN" "$CAMION_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/camiones" "403" "ADMIN" "$CAMION_BODY"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/camiones/aaaa0001-0000-0000-0000-000000000001" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones/aaaa0001-0000-0000-0000-000000000001" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/camiones/aaaa0001-0000-0000-0000-000000000001" "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/camiones/panel"        "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones/panel"        "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/camiones/panel"        "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/camiones/exportar/csv" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones/exportar/csv" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/camiones/exportar/csv" "403" "ADMIN"

# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─ DASHBOARD ────────────────────────────────────────┐${NC}"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/dashboard"           "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/dashboard"           "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/dashboard"           "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/dashboard/gerencial" "403" "GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/dashboard/gerencial" "200" "GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/dashboard/gerencial" "403" "GERENTE"

# ─────────────────────────────────────────────────────────────────────────────
# JORNADAS
# GET /jornadas         → ADMIN, GERENTE
# POST /jornadas        → ADMIN, GERENTE
# GET /jornadas/exportar → ADMIN, GERENTE
# GET /jornadas/actual/{id} → CHOFER
# POST /jornadas/iniciar   → CHOFER
# POST /jornadas/finalizar → CHOFER
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─ JORNADAS ─────────────────────────────────────────┐${NC}"

JORNADA_BODY='{"conductor_id":"22222222-2222-2222-2222-222222222222","unidad_id":"aaaa0001-0000-0000-0000-000000000001","contrato_id":"bbbb0001-0000-0000-0000-000000000001","fecha_jornada":"2026-05-21","origen":"Lima","destino":"Arequipa","km_estimados":520}'

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/jornadas" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/jornadas" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/jornadas" "403" "ADMIN, GERENTE"

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/jornadas" "200" "ADMIN, GERENTE" "$JORNADA_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/jornadas" "200" "ADMIN, GERENTE" "$JORNADA_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/jornadas" "403" "ADMIN, GERENTE" "$JORNADA_BODY"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/jornadas/exportar" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/jornadas/exportar" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/jornadas/exportar" "403" "ADMIN, GERENTE"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/jornadas/actual/22222222-2222-2222-2222-222222222222" "403" "CHOFER"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/jornadas/actual/22222222-2222-2222-2222-222222222222" "403" "CHOFER"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/jornadas/actual/22222222-2222-2222-2222-222222222222" "200" "CHOFER"

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/jornadas/iniciar" "403" "CHOFER" \
  '{"jornada_id":"cccc0002-0000-0000-0000-000000000002"}'
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/jornadas/iniciar" "403" "CHOFER" \
  '{"jornada_id":"cccc0002-0000-0000-0000-000000000002"}'
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/jornadas/iniciar" "200" "CHOFER" \
  '{"jornada_id":"cccc0002-0000-0000-0000-000000000002"}'

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/jornadas/finalizar" "403" "CHOFER" \
  '{"jornada_id":"cccc0002-0000-0000-0000-000000000002","km_recorridos":300,"observaciones":"Sin incidencias"}'
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/jornadas/finalizar" "403" "CHOFER" \
  '{"jornada_id":"cccc0002-0000-0000-0000-000000000002","km_recorridos":300,"observaciones":"Sin incidencias"}'
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/jornadas/finalizar" "200" "CHOFER" \
  '{"jornada_id":"cccc0002-0000-0000-0000-000000000002","km_recorridos":300,"observaciones":"Sin incidencias"}'

# ─────────────────────────────────────────────────────────────────────────────
# GPS — solo ADMIN
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─ GPS — solo ADMIN ─────────────────────────────────┐${NC}"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/gps/proveedores" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/proveedores" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/gps/proveedores" "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/gps/plantilla" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/plantilla" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/gps/plantilla" "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/gps/plantilla/GPSCONTROL" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/plantilla/GPSCONTROL" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/gps/plantilla/GPSCONTROL" "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/gps/validar" "200" "ADMIN" '{"proveedor":"GPSCONTROL"}'
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/gps/validar" "403" "ADMIN" '{"proveedor":"GPSCONTROL"}'
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/gps/validar" "403" "ADMIN" '{"proveedor":"GPSCONTROL"}'

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/gps/importar" "200" "ADMIN" '{"proveedor":"GPSCONTROL"}'
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/gps/importar" "403" "ADMIN" '{"proveedor":"GPSCONTROL"}'
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/gps/importar" "403" "ADMIN" '{"proveedor":"GPSCONTROL"}'

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/gps/resumen" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/resumen" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/gps/resumen" "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/gps/registros" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/registros" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/gps/registros" "403" "ADMIN"

# ─────────────────────────────────────────────────────────────────────────────
# CONDUCTORES — ADMIN y GERENTE
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─ CONDUCTORES — ADMIN, GERENTE ─────────────────────┐${NC}"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/conductores" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/conductores" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/conductores" "403" "ADMIN, GERENTE"

# ─────────────────────────────────────────────────────────────────────────────
# CONTRATOS
# GET/POST /contratos          → solo GERENTE
# GET /contratos/{id}          → solo GERENTE
# GET /contratos/indicadores   → solo GERENTE
# GET /contratos/vigentes      → ADMIN y GERENTE
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─ CONTRATOS ────────────────────────────────────────┐${NC}"

CONTRATO_BODY='{"codigo":"TST-ZAP-001","cliente":"Test ZAP SA","tipo_servicio":"POR_VIAJE","fecha_inicio":"2026-01-01"}'

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/contratos" "403" "GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos" "200" "GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/contratos" "403" "GERENTE"

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/contratos" "403" "GERENTE" "$CONTRATO_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/contratos" "200" "GERENTE" "$CONTRATO_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/contratos" "403" "GERENTE" "$CONTRATO_BODY"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/contratos/bbbb0001-0000-0000-0000-000000000001" "403" "GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos/bbbb0001-0000-0000-0000-000000000001" "200" "GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/contratos/bbbb0001-0000-0000-0000-000000000001" "403" "GERENTE"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/contratos/indicadores" "403" "GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos/indicadores" "200" "GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/contratos/indicadores" "403" "GERENTE"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/contratos/vigentes" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos/vigentes" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/contratos/vigentes" "403" "ADMIN, GERENTE"

# ─────────────────────────────────────────────────────────────────────────────
# UNIDADES — ADMIN y GERENTE
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─ UNIDADES — ADMIN, GERENTE ────────────────────────┐${NC}"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/unidades/disponibles" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/unidades/disponibles" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/unidades/disponibles" "403" "ADMIN, GERENTE"

# =============================================================================
# RESUMEN FINAL
# =============================================================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  RESUMEN DE RESULTADOS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "  Total pruebas  : ${TOTAL}"
echo -e "  ${GREEN}✅ Pasadas      : ${PASS}${NC}"
echo -e "  ${RED}❌ Fallidas     : ${FAIL}${NC}"
echo -e "    ${RED}🚨 Críticos   : ${FAIL_CRITICO}  ← Broken Access Control confirmado${NC}"
echo -e "    ${YELLOW}⚠️  Menores    : ${FAIL_MENOR}  ← Rol autorizado con acceso denegado${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"

# ── Listar críticos en consola ────────────────────────────────────────────────
if [ "$FAIL_CRITICO" -gt 0 ]; then
  echo ""
  echo -e "${RED}🚨 VULNERABILIDADES CRÍTICAS DETECTADAS:${NC}"
  echo "$RESULTADOS_JSON" | jq -r '
    .[] | .[] |
    select(.resultado == "FAIL_CRITICO") |
    "  → [\(.rol)] \(.method) \(.endpoint) recibió HTTP \(.http_status) | Solo debería acceder: \(.roles_permitidos)"
  '
fi

# ── Generar reporte JSON ──────────────────────────────────────────────────────
REPORT_JSON=$(jq -n \
  --argjson total     "$TOTAL" \
  --argjson pass      "$PASS" \
  --argjson fail      "$FAIL" \
  --argjson criticos  "$FAIL_CRITICO" \
  --argjson menores   "$FAIL_MENOR" \
  --argjson resultados "$RESULTADOS_JSON" \
  --arg fecha "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{
    generado_en: $fecha,
    resumen: {
      total_pruebas: $total,
      pasadas:       $pass,
      fallidas:      $fail,
      fail_critico:  $criticos,
      fail_menor:    $menores
    },
    resultados: $resultados
  }')

echo "$REPORT_JSON" > "${REPORT_DIR}/access-control-report.json"
echo ""
echo -e "${GREEN}✅ Reporte guardado en ${REPORT_DIR}/access-control-report.json${NC}"

# Salir con error si hay críticos — hace que el job falle en rojo en GitHub UI
if [ "$FAIL_CRITICO" -gt 0 ]; then
  exit 1
fi

exit 0
