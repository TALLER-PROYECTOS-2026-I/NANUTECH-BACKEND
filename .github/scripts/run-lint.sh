#!/usr/bin/env bash
# .github/scripts/run-lint.sh
# Ejecuta ESLint, Prettier y TypeScript check, guarda resultados y outputs.
# Llamado desde publish-lint.yml
set -euo pipefail

WORK_DIR="${1:-source}"   # directorio del código fuente
OUT_DIR="${2:-.}"         # directorio donde se guardan los JSON/txt de salida

cd "$WORK_DIR"

# ── Helpers ──────────────────────────────────────────────────────────────────
set_output() { echo "$1=$2" >> "$GITHUB_OUTPUT"; }
py_count() { python3 -c "$1" 2>/dev/null || echo 0; }

# ─────────────────────────────────────────────────────────────────────────────
# 1. ESLint
# ─────────────────────────────────────────────────────────────────────────────
echo "::group::🔍 ESLint"
ESLINT_STATUS="skipped"
ESLINT_ERRORS=0
ESLINT_WARNINGS=0
ESLINT_FILES=0

if npm run 2>&1 | grep -q " lint"; then
  echo "Ejecutando ESLint..."

  # JSON para el script Python de reporte
  npx eslint . \
    --format json \
    --output-file "$OUT_DIR/eslint-results.json" \
    --no-error-on-unmatched-pattern \
    2>/dev/null || true

  # Texto legible para los logs de Actions
  npx eslint . \
    --format stylish \
    --no-error-on-unmatched-pattern \
    2>&1 | tee "$OUT_DIR/eslint-output.txt" || true

  if [ -f "$OUT_DIR/eslint-results.json" ]; then
    ESLINT_FILES=$(py_count "
import json
data = json.load(open('$OUT_DIR/eslint-results.json'))
print(len([f for f in data if f.get('messages')]))")

    ESLINT_ERRORS=$(py_count "
import json
data = json.load(open('$OUT_DIR/eslint-results.json'))
print(sum(f.get('errorCount', 0) for f in data))")

    ESLINT_WARNINGS=$(py_count "
import json
data = json.load(open('$OUT_DIR/eslint-results.json'))
print(sum(f.get('warningCount', 0) for f in data))")
  fi

  if [ "$ESLINT_ERRORS" -eq 0 ]; then
    ESLINT_STATUS="success"
  else
    ESLINT_STATUS="failed"
  fi
else
  echo "⚠️  No se encontró script 'lint' en package.json"
  echo "[]" > "$OUT_DIR/eslint-results.json"
  echo "No lint script found" > "$OUT_DIR/eslint-output.txt"
fi

echo "✅ ESLint → status=$ESLINT_STATUS errors=$ESLINT_ERRORS warnings=$ESLINT_WARNINGS"
echo "::endgroup::"

set_output "eslint_status"   "$ESLINT_STATUS"
set_output "eslint_errors"   "$ESLINT_ERRORS"
set_output "eslint_warnings" "$ESLINT_WARNINGS"
set_output "eslint_files"    "$ESLINT_FILES"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Prettier
# ─────────────────────────────────────────────────────────────────────────────
echo "::group::💅 Prettier"
PRETTIER_STATUS="skipped"
PRETTIER_ISSUES=0

if npx prettier --version > /dev/null 2>&1; then
  echo "Ejecutando Prettier check..."

  npx prettier . --check --ignore-unknown \
    2>&1 | tee "$OUT_DIR/prettier-output.txt" || true

  PRETTIER_ISSUES=0

  if grep -q "All matched files use Prettier formatting" "$OUT_DIR/prettier-output.txt"; then
    PRETTIER_STATUS="success"
    PRETTIER_ISSUES=0
  elif grep -q "\[warn\]" "$OUT_DIR/prettier-output.txt"; then
    PRETTIER_STATUS="warnings"
    PRETTIER_ISSUES=$(grep -c "\[warn\]" "$OUT_DIR/prettier-output.txt" || echo 0)
  else
    PRETTIER_STATUS="success"
    PRETTIER_ISSUES=0
  fi
else
  echo "Prettier no encontrado — omitiendo"
  echo "Prettier not found" > "$OUT_DIR/prettier-output.txt"
fi

echo "✅ Prettier → status=$PRETTIER_STATUS issues=$PRETTIER_ISSUES"
echo "::endgroup::"

set_output "prettier_status" "$PRETTIER_STATUS"
set_output "prettier_issues" "$PRETTIER_ISSUES"

# ─────────────────────────────────────────────────────────────────────────────
# 3. TypeScript
# ─────────────────────────────────────────────────────────────────────────────
echo "::group::🔷 TypeScript"
TS_STATUS="skipped"
TS_ERRORS=0

if [ -f tsconfig.json ]; then
  echo "Ejecutando TypeScript check..."
  npx tsc --noEmit 2>&1 | tee "$OUT_DIR/typescript-output.txt" || true
  TS_ERRORS=$(grep -c "error TS" "$OUT_DIR/typescript-output.txt" || echo 0)
  if [ "$TS_ERRORS" -eq 0 ]; then
    TS_STATUS="success"
  else
    TS_STATUS="failed"
  fi
else
  echo "No tsconfig.json encontrado — omitiendo"
  echo "No tsconfig.json found" > "$OUT_DIR/typescript-output.txt"
fi

echo "✅ TypeScript → status=$TS_STATUS errors=$TS_ERRORS"
echo "::endgroup::"

set_output "ts_status" "$TS_STATUS"
set_output "ts_errors" "$TS_ERRORS"
