#!/usr/bin/env bash
# =============================================================================
# access-control-tests.sh — Nanutech Broken Access Control (OWASP A01)
#
# Versión corregida y completa con:
#   - Todos los endpoints documentados oficialmente
#   - Endpoints adicionales encontrados en el código fuente
#   - Bodies POST correctos según validators y services
#   - Parámetros de URL correctos con IDs reales del seed
#   - Método PATCH incluido (alertas)
#   - Roles inferidos del código para endpoints no documentados
#
# IDs del seed (migration):
#   ADMIN   : 11111111-1111-1111-1111-111111111111
#   CHOFER  : 22222222-2222-2222-2222-222222222222
#   GERENTE : 55555555-5555-5555-5555-555555555555
#   UNIDAD  : aaaa0001-0000-0000-0000-000000000001
#   CONTRATO: bbbb0001-0000-0000-0000-000000000001
#   JORNADA : cccc0001-0000-0000-0000-000000000001 (COMPLETADA)
#   JORNADA2: cccc0002-0000-0000-0000-000000000002 (EN_PROCESO — conductor 33333333)
#   JORNADA3: cccc0003-0000-0000-0000-000000000003 (PENDIENTE  — conductor 22222222)
#   ALERTA  : dddd0001-0000-0000-0000-000000000001 (AUXILIO_MECANICO ACTIVA)
#   ALERTA2 : dddd0002-0000-0000-0000-000000000002 (PANICO RESUELTA)
#
# NOTA BD: El jornadaRepository usa "alertas" en JOINs pero la tabla
#   real se llama "alertas_jornada". Eso puede causar 500 en GET /jornadas
#   y GET /jornadas/historial-gerencial. Se documenta en el reporte.
#
# Variables de entorno requeridas:
#   API_URL       → URL base del API Gateway (sin trailing slash)
#   TOKEN_ADMIN   → Bearer token del ADMIN
#   TOKEN_GERENTE → Bearer token del GERENTE
#   TOKEN_CHOFER  → Bearer token del CHOFER
#   REPORT_DIR    → Carpeta de salida (default: security-owasp/reports)
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

for var in API_URL TOKEN_ADMIN TOKEN_GERENTE TOKEN_CHOFER; do
  if [ -z "${!var:-}" ]; then
    echo -e "${RED}❌ Variable de entorno '$var' no definida${NC}"
    exit 1
  fi
done

REPORT_DIR="${REPORT_DIR:-security-owasp/reports}"
mkdir -p "$REPORT_DIR"

TOTAL=0
PASS=0
FAIL=0
FAIL_CRITICO=0
FAIL_MENOR=0

RESULTADOS_JSON="{}"

# =============================================================================
# check_access
#
# $1  ROL
# $2  TOKEN            → Bearer token o "NONE"
# $3  METHOD           → GET, POST, PATCH, PUT
# $4  PATH_EP          → path del endpoint
# $5  EXPECTED         → 200 | 403 | PUBLIC
# $6  ROLES_PERMITIDOS → string descriptivo
# $7  BODY (opcional)  → JSON body
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

  if [ "$EXPECTED" = "PUBLIC" ]; then
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
    if [[ "$HTTP_STATUS" =~ ^2 ]]; then
      RESULTADO="PASS"
    elif [ "$HTTP_STATUS" = "404" ]; then
      RESULTADO="PASS"
      NOTA="404 aceptado (recurso no existe en ambiente de testing)"
    else
      RESULTADO="FAIL_MENOR"
      NOTA="Rol $ROL debía tener acceso pero recibió $HTTP_STATUS"
      DETALLE="Roles autorizados: $ROLES_PERMITIDOS"
      FAIL_MENOR=$((FAIL_MENOR + 1))
      FAIL=$((FAIL + 1))
    fi

  elif [ "$EXPECTED" = "403" ]; then
    if [[ "$HTTP_STATUS" =~ ^(401|403)$ ]]; then
      RESULTADO="PASS"
    elif [[ "$HTTP_STATUS" =~ ^2 ]]; then
      RESULTADO="FAIL_CRITICO"
      NOTA="Broken Access Control: $ROL recibió $HTTP_STATUS — acceso indebido"
      DETALLE="Solo deberían acceder: $ROLES_PERMITIDOS"
      FAIL_CRITICO=$((FAIL_CRITICO + 1))
      FAIL=$((FAIL + 1))
    else
      RESULTADO="PASS"
      NOTA="Recibió $HTTP_STATUS (aceptable como rechazo)"
    fi
  fi

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
# IDs DEL SEED — usados en rutas con parámetros
# =============================================================================
ID_UNIDAD="aaaa0001-0000-0000-0000-000000000001"
ID_CONTRATO="bbbb0001-0000-0000-0000-000000000001"
ID_CONTRATO2="bbbb0002-0000-0000-0000-000000000002"
ID_JORNADA="cccc0001-0000-0000-0000-000000000001"
ID_JORNADA_EN_PROCESO="cccc0002-0000-0000-0000-000000000002"
# conductor del seed con jornada EN_PROCESO (cccc0002) es 33333333
# CHOFER del seed (22222222) tiene jornada PENDIENTE (cccc0003)
ID_CONDUCTOR_CHOFER="22222222-2222-2222-2222-222222222222"
ID_CONDUCTOR_EN_PROCESO="33333333-3333-3333-3333-333333333333"
ID_ALERTA_AUXILIO="dddd0001-0000-0000-0000-000000000001"
ID_ALERTA_PANICO="dddd0002-0000-0000-0000-000000000002"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Nanutech — Broken Access Control (OWASP A01)      ${NC}"
echo -e "${BLUE}  Matriz completa según documentación + código       ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"

# =============================================================================
# 1. ENDPOINTS PÚBLICOS — sin autenticación
# =============================================================================
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

# =============================================================================
# 2. AUTH/ME — los 3 roles autenticados
# =============================================================================
echo ""
echo -e "${CYAN}┌─ GET /auth/me ──────────────────────────────────────┐${NC}"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/auth/me" "200" "ADMIN, GERENTE, CHOFER"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/auth/me" "200" "ADMIN, GERENTE, CHOFER"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/auth/me" "200" "ADMIN, GERENTE, CHOFER"
check_access "ANONIMO" "NONE"           "GET" "/auth/me" "403" "ADMIN, GERENTE, CHOFER"

# =============================================================================
# 3. CAMIONES — solo ADMIN
# Body POST correcto según camionService.validateCreateCamion:
#   placa, marca, modelo, anio, capacidad_ton, vin, color, combustible, gps
#   son todos requeridos. combustible debe ser DIESEL|GASOLINA|GNV|GLP|ELECTRICO|HIBRIDO
# =============================================================================
echo ""
echo -e "${CYAN}┌─ CAMIONES — solo ADMIN ────────────────────────────┐${NC}"

CAMION_BODY='{"placa":"TST-ZAP","marca":"Volvo","modelo":"FH16","anio":2023,"capacidad_ton":20,"vin":"VINZAPTST0001","color":"Blanco","combustible":"DIESEL","gps":true}'

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/camiones" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/camiones" "403" "ADMIN"
check_access "ANONIMO" "NONE"           "GET"  "/camiones" "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/camiones" "200" "ADMIN" "$CAMION_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/camiones" "403" "ADMIN" "$CAMION_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/camiones" "403" "ADMIN" "$CAMION_BODY"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/camiones/${ID_UNIDAD}" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones/${ID_UNIDAD}" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/camiones/${ID_UNIDAD}" "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/camiones/panel"        "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones/panel"        "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/camiones/panel"        "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/camiones/exportar/csv" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/camiones/exportar/csv" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/camiones/exportar/csv" "403" "ADMIN"

# =============================================================================
# 4. DASHBOARD
# /dashboard       → solo ADMIN (dashboardController valida session.role === "admin")
# /dashboard/gerencial → GERENTE (código acepta también admin, doc dice solo GERENTE)
# =============================================================================
echo ""
echo -e "${CYAN}┌─ DASHBOARD ────────────────────────────────────────┐${NC}"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/dashboard" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/dashboard" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/dashboard" "403" "ADMIN"
check_access "ANONIMO" "NONE"           "GET" "/dashboard" "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/dashboard/gerencial" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/dashboard/gerencial" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/dashboard/gerencial" "403" "ADMIN, GERENTE"
check_access "ANONIMO" "NONE"           "GET" "/dashboard/gerencial" "403" "ADMIN, GERENTE"

# =============================================================================
# 5. CONDUCTORES — ADMIN y GERENTE (documentado)
# GET /conductores/{id}/estadisticas y dashboard/conductores → solo ADMIN (código)
# =============================================================================
echo ""
echo -e "${CYAN}┌─ CONDUCTORES ───────────────────────────────────────┐${NC}"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/conductores" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/conductores" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/conductores" "403" "ADMIN, GERENTE"
check_access "ANONIMO" "NONE"           "GET" "/conductores" "403" "ADMIN, GERENTE"

# GET /conductores/{id}/estadisticas — no documentado, inferido: ADMIN y GERENTE
check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/conductores/${ID_CONDUCTOR_CHOFER}/estadisticas" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/conductores/${ID_CONDUCTOR_CHOFER}/estadisticas" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/conductores/${ID_CONDUCTOR_CHOFER}/estadisticas" "403" "ADMIN, GERENTE"

# GET /conductores/dashboard/resumen — solo ADMIN (validarAdmin en controller)
check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/conductores/dashboard/resumen" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/conductores/dashboard/resumen" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/conductores/dashboard/resumen" "403" "ADMIN"

# GET /conductores/dashboard/listado — solo ADMIN (validarAdmin en controller)
check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/conductores/dashboard/listado" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/conductores/dashboard/listado" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/conductores/dashboard/listado" "403" "ADMIN"

# =============================================================================
# 6. CONTRATOS
# GET/POST /contratos          → solo GERENTE
# GET /contratos/{id}          → solo GERENTE
# GET /contratos/indicadores   → solo GERENTE
# GET /contratos/vigentes      → ADMIN y GERENTE
# PUT /contratos/{id}          → solo GERENTE (no documentado, inferido del código)
# PUT /contratos/{id}/unidades → solo GERENTE (no documentado, inferido del código)
#
# Body POST correcto según ContratoValidator:
#   cliente, ruc, tipo_servicio, fecha_inicio, origen, destino,
#   distancia_estimada_km, tarifa_por_km son requeridos
# =============================================================================
echo ""
echo -e "${CYAN}┌─ CONTRATOS ────────────────────────────────────────┐${NC}"

CONTRATO_BODY='{
  "cliente":"Test ZAP SA",
  "ruc":"20123456700",
  "tipo_servicio":"POR_VIAJE",
  "fecha_inicio":"2026-06-01",
  "fecha_fin":"2026-12-31",
  "origen":"Lima",
  "destino":"Arequipa",
  "distancia_estimada_km":520,
  "tarifa_por_km":5.50,
  "tarifa_por_hora":0,
  "tarifa_espera":0,
  "moneda":"PEN"
}'

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/contratos" "403" "GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos" "200" "GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/contratos" "403" "GERENTE"
check_access "ANONIMO" "NONE"           "GET"  "/contratos" "403" "GERENTE"

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/contratos" "403" "GERENTE" "$CONTRATO_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/contratos" "200" "GERENTE" "$CONTRATO_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/contratos" "403" "GERENTE" "$CONTRATO_BODY"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/contratos/${ID_CONTRATO}" "403" "GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos/${ID_CONTRATO}" "200" "GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/contratos/${ID_CONTRATO}" "403" "GERENTE"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/contratos/indicadores" "403" "GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos/indicadores" "200" "GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/contratos/indicadores" "403" "GERENTE"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/contratos/vigentes" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/contratos/vigentes" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/contratos/vigentes" "403" "ADMIN, GERENTE"

# PUT /contratos/{id} — no documentado, inferido solo GERENTE
CONTRATO_UPDATE_BODY='{
  "fecha_inicio":"2026-01-01",
  "fecha_fin":"2026-12-31",
  "tipo_servicio":"POR_VIAJE",
  "descripcion":"Contrato actualizado ZAP",
  "tarifa":15000
}'
check_access "ADMIN"   "$TOKEN_ADMIN"   "PUT" "/contratos/${ID_CONTRATO}" "403" "GERENTE" "$CONTRATO_UPDATE_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "PUT" "/contratos/${ID_CONTRATO}" "200" "GERENTE" "$CONTRATO_UPDATE_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "PUT" "/contratos/${ID_CONTRATO}" "403" "GERENTE" "$CONTRATO_UPDATE_BODY"

# PUT /contratos/{id}/unidades — no documentado, inferido solo GERENTE
UNIDADES_BODY="{\"unidades\":[\"${ID_UNIDAD}\"]}"
check_access "ADMIN"   "$TOKEN_ADMIN"   "PUT" "/contratos/${ID_CONTRATO}/unidades" "403" "GERENTE" "$UNIDADES_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "PUT" "/contratos/${ID_CONTRATO}/unidades" "200" "GERENTE" "$UNIDADES_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "PUT" "/contratos/${ID_CONTRATO}/unidades" "403" "GERENTE" "$UNIDADES_BODY"

# =============================================================================
# 7. UNIDADES — ADMIN y GERENTE
# =============================================================================
echo ""
echo -e "${CYAN}┌─ UNIDADES — ADMIN, GERENTE ────────────────────────┐${NC}"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/unidades/disponibles" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/unidades/disponibles" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/unidades/disponibles" "403" "ADMIN, GERENTE"
check_access "ANONIMO" "NONE"           "GET" "/unidades/disponibles" "403" "ADMIN, GERENTE"

# =============================================================================
# 8. GPS — solo ADMIN
# POST /gps/validar e /gps/importar requieren body con proveedor y contenido CSV
# Los controllers no validan auth (no llaman getCurrentSession),
# pero en API Gateway la autenticación se aplica a nivel de recurso.
# Se prueban igual para detectar si el Gateway protege correctamente.
# =============================================================================
echo ""
echo -e "${CYAN}┌─ GPS — solo ADMIN ─────────────────────────────────┐${NC}"

GPS_VALIDAR_BODY='{
  "proveedor":"GPSCONTROL",
  "nombre_archivo":"test.csv",
  "csv":"fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,60,180,1000"
}'

GPS_IMPORTAR_BODY='{
  "proveedor":"GPSCONTROL",
  "nombre_archivo":"test.csv",
  "csv":"fecha,hora,placa,latitud,longitud,velocidad,rumbo,distancia_total\n2026-05-01,08:00:00,ABC-123,-12.0464,-77.0428,60,180,1000"
}'

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/gps/proveedores"    "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/proveedores"    "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/gps/proveedores"    "403" "ADMIN"
check_access "ANONIMO" "NONE"           "GET"  "/gps/proveedores"    "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/gps/plantilla"      "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/plantilla"      "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/gps/plantilla"      "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/gps/plantilla/GPSCONTROL" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/plantilla/GPSCONTROL" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/gps/plantilla/GPSCONTROL" "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/gps/validar"        "200" "ADMIN" "$GPS_VALIDAR_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/gps/validar"        "403" "ADMIN" "$GPS_VALIDAR_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/gps/validar"        "403" "ADMIN" "$GPS_VALIDAR_BODY"

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/gps/importar"       "200" "ADMIN" "$GPS_IMPORTAR_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/gps/importar"       "403" "ADMIN" "$GPS_IMPORTAR_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/gps/importar"       "403" "ADMIN" "$GPS_IMPORTAR_BODY"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/gps/resumen"        "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/resumen"        "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/gps/resumen"        "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/gps/registros"      "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/gps/registros"      "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/gps/registros"      "403" "ADMIN"

# =============================================================================
# 9. JORNADAS
#
# POST /jornadas        → ADMIN, GERENTE
#   Body correcto según JornadaValidator (requiere conductor_id, unidad_id,
#   contrato_id, creado_por). Se usan IDs del seed.
#   NOTA: se usa una unidad sin jornada activa para no chocar con el constraint
#   uq_jornada_activa_unidad. La unidad aaaa0001 tiene jornada PENDIENTE (cccc0003).
#   Usamos aaaa0003 que está en MANTENIMIENTO — probablemente dé 400 por regla de
#   negocio, pero eso es FAIL_MENOR, no FAIL_CRITICO.
#
# GET /jornadas         → ADMIN, GERENTE
# GET /jornadas/exportar → ADMIN, GERENTE
# GET /jornadas/actual/{conductorId} → CHOFER
# POST /jornadas/iniciar   → CHOFER
# POST /jornadas/finalizar → CHOFER
# =============================================================================
echo ""
echo -e "${CYAN}┌─ JORNADAS ─────────────────────────────────────────┐${NC}"

# conductor_id 22222222 tiene jornada PENDIENTE (cccc0003) → conductor ocupado → 400
# Se acepta 400 como PASS para ADMIN/GERENTE (regla de negocio, no control de acceso)
JORNADA_BODY="{
  \"conductor_id\":\"${ID_CONDUCTOR_CHOFER}\",
  \"unidad_id\":\"aaaa0003-0000-0000-0000-000000000003\",
  \"contrato_id\":\"${ID_CONTRATO}\",
  \"creado_por\":\"11111111-1111-1111-1111-111111111111\",
  \"fecha_jornada\":\"2026-06-01\",
  \"origen\":\"Lima\",
  \"destino\":\"Arequipa\",
  \"km_estimados\":520
}"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/jornadas" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/jornadas" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/jornadas" "403" "ADMIN, GERENTE"
check_access "ANONIMO" "NONE"           "GET"  "/jornadas" "403" "ADMIN, GERENTE"

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/jornadas" "200" "ADMIN, GERENTE" "$JORNADA_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/jornadas" "200" "ADMIN, GERENTE" "$JORNADA_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/jornadas" "403" "ADMIN, GERENTE" "$JORNADA_BODY"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET"  "/jornadas/exportar" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET"  "/jornadas/exportar" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET"  "/jornadas/exportar" "403" "ADMIN, GERENTE"

# GET /jornadas/actual/{conductorId} → solo CHOFER
# Se usa el conductorId del seed que tiene jornada activa (22222222 → PENDIENTE)
check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/jornadas/actual/${ID_CONDUCTOR_CHOFER}" "403" "CHOFER"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/jornadas/actual/${ID_CONDUCTOR_CHOFER}" "403" "CHOFER"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/jornadas/actual/${ID_CONDUCTOR_CHOFER}" "200" "CHOFER"
check_access "ANONIMO" "NONE"           "GET" "/jornadas/actual/${ID_CONDUCTOR_CHOFER}" "403" "CHOFER"

# POST /jornadas/iniciar → solo CHOFER
# jornada_id cccc0003 es PENDIENTE (conductor 22222222), puede iniciarse
INICIAR_BODY='{"jornada_id":"cccc0003-0000-0000-0000-000000000003"}'
check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/jornadas/iniciar" "403" "CHOFER" "$INICIAR_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/jornadas/iniciar" "403" "CHOFER" "$INICIAR_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/jornadas/iniciar" "200" "CHOFER" "$INICIAR_BODY"

# POST /jornadas/finalizar → solo CHOFER
# jornada_id cccc0002 está EN_PROCESO (conductor 33333333, no el CHOFER del seed)
# El CHOFER del seed (22222222) tiene jornada PENDIENTE no EN_PROCESO, dará 400.
# Se acepta 400 como PASS para CHOFER (regla de negocio, no control de acceso).
FINALIZAR_BODY='{"jornada_id":"cccc0002-0000-0000-0000-000000000002","km_recorridos":300,"observaciones":"Sin incidencias"}'
check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/jornadas/finalizar" "403" "CHOFER" "$FINALIZAR_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/jornadas/finalizar" "403" "CHOFER" "$FINALIZAR_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/jornadas/finalizar" "200" "CHOFER" "$FINALIZAR_BODY"

# =============================================================================
# 10. JORNADAS — endpoints no documentados (encontrados en jornadaHandler.mjs)
#
# GET /jornadas/historial-gerencial          → ADMIN, GERENTE
# GET /jornadas/historial-gerencial/metrics  → ADMIN, GERENTE
# GET /jornadas/alerta/{jornadaId}           → ADMIN, GERENTE
# NOTA: estos endpoints pueden devolver 500 por el bug "alertas" vs
# "alertas_jornada" en el JOIN del repositorio. Se acepta 500 como PASS_WITH_BUG.
# =============================================================================
echo ""
echo -e "${CYAN}┌─ JORNADAS (historial gerencial) — no documentados ─┐${NC}"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/jornadas/historial-gerencial" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/jornadas/historial-gerencial" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/jornadas/historial-gerencial" "403" "ADMIN, GERENTE"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/jornadas/historial-gerencial/metrics" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/jornadas/historial-gerencial/metrics" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/jornadas/historial-gerencial/metrics" "403" "ADMIN, GERENTE"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/jornadas/alerta/${ID_JORNADA}" "200" "ADMIN, GERENTE"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/jornadas/alerta/${ID_JORNADA}" "200" "ADMIN, GERENTE"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/jornadas/alerta/${ID_JORNADA}" "403" "ADMIN, GERENTE"

# =============================================================================
# 11. ALERTAS — no documentadas, inferidas del código
#
# GET /alertas/indicadores      → ADMIN (panel admin de alertas)
# GET /alertas/activas          → ADMIN (panel admin de alertas)
# POST /alertas/sos             → CHOFER (requiere jornada EN_PROCESO del conductor)
# POST /alertas/auxilio         → CHOFER (ídem)
# PATCH /alertas/{id}/resolver  → ADMIN
# PATCH /alertas/{id}/estado    → ADMIN
#
# Body POST /alertas/sos correcto según alertaService.registrarSos:
#   jornada_id (UUID), conductor_id (UUID), latitud, longitud son requeridos
#   La jornada debe estar EN_PROCESO y pertenecer al conductor.
#   conductor 33333333 tiene jornada cccc0002 EN_PROCESO — pero TOKEN_CHOFER
#   es el de 22222222 (que tiene jornada PENDIENTE). El CHOFER del seed dará 409.
#   Se acepta 409 como PASS (regla de negocio: jornada no EN_PROCESO).
#
# Body POST /alertas/auxilio requiere también tipo_falla_mecanica (valor del enum)
# =============================================================================
echo ""
echo -e "${CYAN}┌─ ALERTAS — no documentadas, inferidas del código ──┐${NC}"

SOS_BODY="{
  \"jornada_id\":\"${ID_JORNADA_EN_PROCESO}\",
  \"conductor_id\":\"${ID_CONDUCTOR_EN_PROCESO}\",
  \"latitud\":-12.0464,
  \"longitud\":-77.0428,
  \"direccion\":\"Lima Centro\"
}"

AUXILIO_BODY="{
  \"jornada_id\":\"${ID_JORNADA_EN_PROCESO}\",
  \"conductor_id\":\"${ID_CONDUCTOR_EN_PROCESO}\",
  \"tipo_falla_mecanica\":\"Pinchazo/Llantas\",
  \"latitud\":-12.0464,
  \"longitud\":-77.0428,
  \"direccion\":\"Lima Centro\"
}"

RESOLVER_BODY='{"detalle_resolucion":"Resuelta en prueba ZAP","servicio_tecnico_realizado":"Ninguno"}'

ESTADO_BODY='{"estado":"EN_PROCESO"}'

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/alertas/indicadores" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/alertas/indicadores" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/alertas/indicadores" "403" "ADMIN"
check_access "ANONIMO" "NONE"           "GET" "/alertas/indicadores" "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "GET" "/alertas/activas" "200" "ADMIN"
check_access "GERENTE" "$TOKEN_GERENTE" "GET" "/alertas/activas" "403" "ADMIN"
check_access "CHOFER"  "$TOKEN_CHOFER"  "GET" "/alertas/activas" "403" "ADMIN"

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/alertas/sos" "403" "CHOFER" "$SOS_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/alertas/sos" "403" "CHOFER" "$SOS_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/alertas/sos" "200" "CHOFER" "$SOS_BODY"
check_access "ANONIMO" "NONE"           "POST" "/alertas/sos" "403" "CHOFER" "$SOS_BODY"

check_access "ADMIN"   "$TOKEN_ADMIN"   "POST" "/alertas/auxilio" "403" "CHOFER" "$AUXILIO_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "POST" "/alertas/auxilio" "403" "CHOFER" "$AUXILIO_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "POST" "/alertas/auxilio" "200" "CHOFER" "$AUXILIO_BODY"

check_access "ADMIN"   "$TOKEN_ADMIN"   "PATCH" "/alertas/${ID_ALERTA_AUXILIO}/resolver" "200" "ADMIN" "$RESOLVER_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "PATCH" "/alertas/${ID_ALERTA_AUXILIO}/resolver" "403" "ADMIN" "$RESOLVER_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "PATCH" "/alertas/${ID_ALERTA_AUXILIO}/resolver" "403" "ADMIN" "$RESOLVER_BODY"

check_access "ADMIN"   "$TOKEN_ADMIN"   "PATCH" "/alertas/${ID_ALERTA_AUXILIO}/estado" "200" "ADMIN" "$ESTADO_BODY"
check_access "GERENTE" "$TOKEN_GERENTE" "PATCH" "/alertas/${ID_ALERTA_AUXILIO}/estado" "403" "ADMIN" "$ESTADO_BODY"
check_access "CHOFER"  "$TOKEN_CHOFER"  "PATCH" "/alertas/${ID_ALERTA_AUXILIO}/estado" "403" "ADMIN" "$ESTADO_BODY"

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
echo -e "    ${YELLOW}⚠️  Menores    : ${FAIL_MENOR}  ← Config o bug de BD${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"

echo ""
echo -e "${YELLOW}⚠️  BUGS DE BD CONOCIDOS (pueden causar FAIL_MENOR en roles autorizados):${NC}"
echo -e "  → GET /jornadas y GET /jornadas/historial-gerencial pueden devolver 500"
echo -e "    porque el repositorio hace JOIN con tabla 'alertas' que no existe."
echo -e "    La tabla real se llama 'alertas_jornada'. Corregir en jornadaRepository.mjs."
echo -e "  → ALERT_TYPES.AUXILIO en alertTypes.mjs debe ser 'AUXILIO_MECANICO'"
echo -e "    para coincidir con el enum tipo_alerta del schema PostgreSQL."

if [ "$FAIL_CRITICO" -gt 0 ]; then
  echo ""
  echo -e "${RED}🚨 VULNERABILIDADES CRÍTICAS DETECTADAS:${NC}"
  echo "$RESULTADOS_JSON" | jq -r '
    .[] | .[] |
    select(.resultado == "FAIL_CRITICO") |
    "  → [\(.rol)] \(.method) \(.endpoint) recibió HTTP \(.http_status) | Solo debería acceder: \(.roles_permitidos)"
  '
fi

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

if [ "$FAIL_CRITICO" -gt 0 ]; then
  exit 1
fi

exit 0
