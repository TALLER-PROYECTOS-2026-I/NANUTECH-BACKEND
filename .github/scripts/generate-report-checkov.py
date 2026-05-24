#!/usr/bin/env python3
"""
generate-report-checkov.py
Genera el index.html del reporte Checkov en gh-pages/checkov/index.html

Lee datos desde:
  - checkov-output.sarif   → resultados del scan IaC (passed + failed)
  - variables de entorno   → fecha, URL del run, repo, rama, commit

Salida:
  - OUT (default: gh-pages-site/checkov/index.html)

Uso:
  SARIF_FILE="checkov-output.sarif" \
  OUT="gh-pages-site/checkov/index.html" \
  FECHA="2025-01-01 12:00 UTC" \
  RUN_URL="https://github.com/..." \
  REPO="org/repo" BRANCH="develop" COMMIT="abc123" \
  python3 .github/scripts/generate-report-checkov.py
"""

import os
import json
import sys

# ── Variables de entorno ──────────────────────────────────────────────────────
SARIF_FILE  = os.environ.get("SARIF_FILE",  "checkov-output.sarif")
OUT         = os.environ.get("OUT",         "gh-pages-site/checkov/index.html")
FECHA       = os.environ.get("FECHA",       "N/A")
RUN_URL     = os.environ.get("RUN_URL",     "#")
REPO        = os.environ.get("REPO",        "Nanutech")
BRANCH      = os.environ.get("BRANCH",      "—")
COMMIT      = os.environ.get("COMMIT",      "—")

# ── Severidades Checkov → etiqueta visual ─────────────────────────────────────
SEVERITY_MAP = {
    "error":   ("🔴 HIGH",   "sev-high"),
    "warning": ("🟡 MEDIUM", "sev-medium"),
    "note":    ("🔵 LOW",    "sev-low"),
    "none":    ("⚪ INFO",   "sev-info"),
}

# ── Descripciones y soluciones conocidas por ruleId ──────────────────────────
KNOWN_RULES = {
    "CKV_AWS_76": {
        "desc": "La API Gateway no tiene Access Logging habilitado. Sin logging es imposible auditar quién accedió y cuándo.",
        "fix":  "Agregar AccessLogSetting con DestinationArn apuntando a un Log Group de CloudWatch en el recurso AWS::Serverless::Api.",
        "ref":  "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-logging-policies/logging-17",
    },
    "CKV_AWS_120": {
        "desc": "API Gateway no tiene caching habilitado. El caching reduce latencia y protege backends de sobrecarga.",
        "fix":  "Agregar MethodSettings con CachingEnabled: true y CacheDataEncrypted: true en la definición del stage.",
        "ref":  "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/ensure-api-gateway-caching-is-enabled",
    },
    "CKV_AWS_115": {
        "desc": "La función Lambda no tiene límite de concurrencia configurado. Sin este límite, una función puede agotar las concurrencias disponibles de toda la cuenta.",
        "fix":  "Agregar ReservedConcurrentExecutions: <número> en la propiedad de cada AWS::Serverless::Function.",
        "ref":  "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/ensure-that-aws-lambda-function-is-configured-for-function-level-concurrent-execution-limit",
    },
    "CKV_AWS_116": {
        "desc": "La función Lambda no tiene Dead Letter Queue (DLQ) configurada. Sin DLQ los mensajes fallidos se pierden silenciosamente.",
        "fix":  "Agregar DeadLetterQueue con Type: SQS y TargetArn: !GetAtt <queue>.Arn en la propiedad de la función.",
        "ref":  "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/ensure-that-aws-lambda-function-is-configured-for-a-dead-letter-queue-dlq",
    },
    "CKV_AWS_173": {
        "desc": "Las variables de entorno de Lambda no están cifradas con una clave KMS personalizada. Los valores sensibles quedan expuestos con la clave AWS por defecto.",
        "fix":  "Agregar KmsKeyArn: !GetAtt <key>.Arn en la sección Environment de cada función que maneje datos sensibles.",
        "ref":  "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-serverless-policies/bc-aws-serverless-5",
    },
    "CKV_AWS_117": {
        "desc": "La función Lambda no está configurada dentro de una VPC. Las funciones fuera de VPC están expuestas directamente a internet.",
        "fix":  "Agregar VpcConfig con SecurityGroupIds y SubnetIds apuntando a subredes privadas.",
        "ref":  "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/ensure-that-aws-lambda-function-is-configured-inside-a-vpc-1",
    },
    "CKV_AWS_45": {
        "desc": "La función Lambda usa variables de entorno con claves hardcodeadas.",
        "fix":  "Usar AWS Secrets Manager o SSM Parameter Store para las credenciales.",
        "ref":  "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/bc-aws-45",
    },
    "CKV_AWS_50": {
        "desc": "Lambda no tiene X-Ray tracing habilitado. Sin tracing es difícil depurar problemas de rendimiento.",
        "fix":  "Agregar Tracing: Active en la propiedad de la función Lambda.",
        "ref":  "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-logging-policies/logging-31",
    },
    "CKV_AWS_272": {
        "desc": "Lambda no valida la integridad del código (code signing).",
        "fix":  "Configurar CodeSigningConfigArn en la función Lambda.",
        "ref":  "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/bc-aws-272",
    },
    "CKV_AWS_363": {
        "desc": "El runtime de Lambda está deprecado o próximo a deprecarse.",
        "fix":  "Actualizar Runtime a una versión activamente soportada (nodejs20.x, python3.12, etc.).",
        "ref":  "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/bc-aws-363",
    },
    "CKV_AWS_364": {
        "desc": "Los permisos de Lambda delegados a servicios AWS no están limitados por SourceArn o SourceAccount.",
        "fix":  "Agregar Condition con ArnLike o StringEquals en el recurso AWS::Lambda::Permission.",
        "ref":  "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-iam-policies/bc-aws-364",
    },
    "CKV_AWS_73": {
        "desc": "API Gateway no tiene X-Ray tracing habilitado.",
        "fix":  "Agregar TracingEnabled: true en el recurso AWS::Serverless::Api.",
        "ref":  "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-logging-policies/logging-15",
    },
}

# ── Leer SARIF ────────────────────────────────────────────────────────────────
def load_sarif(path):
    if not os.path.exists(path):
        print(f"⚠️  No se encontró {path} — reporte vacío")
        return [], [], {}, {}
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"⚠️  Error leyendo SARIF: {e}")
        return [], [], {}, {}

    runs    = data.get("runs", [])
    if not runs:
        return [], [], {}, {}

    run     = runs[0]
    tool    = run.get("tool", {}).get("driver", {})
    rules   = {r["id"]: r for r in tool.get("rules", [])}
    results = run.get("results", [])

    failed  = [r for r in results if r.get("kind", "fail") != "pass"
               and r.get("level", "warning") != "none"
               or r.get("level") in ("error", "warning", "note")]
    passed  = [r for r in results if r.get("kind") == "pass"]

    # SARIF de Checkov a veces no usa kind=pass; separa por level
    if not passed and not failed:
        failed = [r for r in results if r.get("level") in ("error","warning","note")]
        passed = [r for r in results if r not in failed]

    return failed, passed, rules, data

failed_results, passed_results, sarif_rules, raw_sarif = load_sarif(SARIF_FILE)

# ── Enriquecer cada resultado ─────────────────────────────────────────────────
def enrich(result, rules):
    rule_id  = result.get("ruleId", "")
    level    = result.get("level", "warning")
    sev_label, sev_class = SEVERITY_MAP.get(level, ("⚪ INFO", "sev-info"))

    # Mensaje
    message  = result.get("message", {}).get("text", "")

    # Ubicación
    locs     = result.get("locations", [])
    file_uri = ""
    start_ln = ""
    end_ln   = ""
    if locs:
        pl = locs[0].get("physicalLocation", {})
        file_uri = pl.get("artifactLocation", {}).get("uri", "")
        region   = pl.get("region", {})
        start_ln = str(region.get("startLine", ""))
        end_ln   = str(region.get("endLine", ""))

    # Nombre legible de la regla desde el SARIF
    rule_meta = rules.get(rule_id, {})
    rule_name = rule_meta.get("shortDescription", {}).get("text", rule_id)
    rule_help = rule_meta.get("helpUri", "")

    # Descripción y fix desde nuestro diccionario o del SARIF
    known     = KNOWN_RULES.get(rule_id, {})
    desc      = known.get("desc") or rule_meta.get("fullDescription", {}).get("text", message)
    fix       = known.get("fix") or rule_meta.get("help", {}).get("text", "Revisar la documentación de Checkov.")
    ref       = known.get("ref") or rule_help

    # Resource name desde el mensaje (Checkov suele incluirlo)
    resource  = ""
    if "for resource:" in message:
        resource = message.split("for resource:")[-1].strip()
    elif "::" in message:
        parts = [p for p in message.split() if "::" in p]
        resource = parts[0] if parts else ""

    return {
        "rule_id":   rule_id,
        "level":     level,
        "sev_label": sev_label,
        "sev_class": sev_class,
        "rule_name": rule_name,
        "message":   message,
        "file":      file_uri,
        "start_ln":  start_ln,
        "end_ln":    end_ln,
        "desc":      desc,
        "fix":       fix,
        "ref":       ref,
        "resource":  resource,
    }

failed_enriched = [enrich(r, sarif_rules) for r in failed_results]
passed_enriched = [enrich(r, sarif_rules) for r in passed_results]

# ── Estadísticas ──────────────────────────────────────────────────────────────
total_failed  = len(failed_enriched)
total_passed  = len(passed_enriched)
total_checks  = total_failed + total_passed

count_high    = sum(1 for r in failed_enriched if r["level"] == "error")
count_medium  = sum(1 for r in failed_enriched if r["level"] == "warning")
count_low     = sum(1 for r in failed_enriched if r["level"] == "note")

# Agrupar fallidos por rule_id para el resumen
from collections import defaultdict
by_rule = defaultdict(list)
for r in failed_enriched:
    by_rule[r["rule_id"]].append(r)

# Badge global
if count_high > 0:
    BADGE_TEXT  = "FAILED"
    BADGE_COLOR = "#f85149"
    BADGE_BG    = "#f8514922"
    BADGE_BD    = "#f85149"
elif count_medium > 0:
    BADGE_TEXT  = "WARNINGS"
    BADGE_COLOR = "#e3b341"
    BADGE_BG    = "#e3b34122"
    BADGE_BD    = "#e3b341"
elif total_failed > 0:
    BADGE_TEXT  = "LOW RISK"
    BADGE_COLOR = "#3fb950"
    BADGE_BG    = "#3fb95022"
    BADGE_BD    = "#3fb950"
else:
    BADGE_TEXT  = "PASSED"
    BADGE_COLOR = "#3fb950"
    BADGE_BG    = "#3fb95022"
    BADGE_BD    = "#3fb950"

# ── Construir tabla de fallidos ───────────────────────────────────────────────
def build_failed_rows(items):
    if not items:
        return ""
    rows = ""
    for i, r in enumerate(items):
        file_display = r["file"].lstrip("/") if r["file"] else "—"
        lines = f"L{r['start_ln']}" if r["start_ln"] else "—"
        if r["end_ln"] and r["end_ln"] != r["start_ln"]:
            lines += f"–{r['end_ln']}"
        resource_html = f'<code class="resource-tag">{r["resource"]}</code>' if r["resource"] else "—"
        ref_html = f'<a href="{r["ref"]}" target="_blank" class="ref-link">📖 Docs</a>' if r["ref"] else ""
        rows += f"""<tr data-level="{r['level']}" data-rule="{r['rule_id']}">
          <td><span class="{r['sev_class']}">{r['sev_label']}</span></td>
          <td><code class="rule-id">{r['rule_id']}</code></td>
          <td class="rule-name-cell">{r['rule_name']}</td>
          <td>{resource_html}</td>
          <td><code class="file-tag">{file_display}</code><br><span class="line-tag">{lines}</span></td>
          <td class="desc-cell">{r['desc']}</td>
          <td class="fix-cell">{r['fix']}<br>{ref_html}</td>
        </tr>\n"""
    return rows

# ── Construir tabla de pasados ────────────────────────────────────────────────
def build_passed_rows(items):
    if not items:
        return ""
    rows = ""
    for r in items:
        file_display = r["file"].lstrip("/") if r["file"] else "—"
        lines = f"L{r['start_ln']}" if r["start_ln"] else "—"
        resource_html = f'<code class="resource-tag">{r["resource"]}</code>' if r["resource"] else "—"
        rows += f"""<tr>
          <td><span class="sev-pass">✅ PASS</span></td>
          <td><code class="rule-id">{r['rule_id']}</code></td>
          <td class="rule-name-cell">{r['rule_name']}</td>
          <td>{resource_html}</td>
          <td><code class="file-tag">{file_display}</code><br><span class="line-tag">{lines}</span></td>
        </tr>\n"""
    return rows

# ── Resumen por regla (agrupado) ──────────────────────────────────────────────
def build_rule_summary():
    if not by_rule:
        return '<tr><td colspan="5" style="text-align:center;color:#8b949e;padding:20px">Sin issues detectados ✅</td></tr>'
    rows = ""
    for rule_id, items in sorted(by_rule.items(), key=lambda x: (
        0 if any(r["level"]=="error" for r in x[1])
        else 1 if any(r["level"]=="warning" for r in x[1])
        else 2
    )):
        sample = items[0]
        sev_label = sample["sev_label"]
        sev_class = sample["sev_class"]
        count     = len(items)
        resources = ", ".join(sorted(set(r["resource"] for r in items if r["resource"])))[:120]
        known = KNOWN_RULES.get(rule_id, {})
        fix_short = (known.get("fix") or sample["fix"] or "")[:100]
        ref   = known.get("ref") or sample["ref"] or ""
        ref_html = f'<a href="{ref}" target="_blank" class="ref-link">📖</a>' if ref else ""
        rows += f"""<tr>
          <td><span class="{sev_class}">{sev_label}</span></td>
          <td><code class="rule-id">{rule_id}</code>&nbsp;{ref_html}</td>
          <td class="rule-name-cell">{sample['rule_name']}</td>
          <td style="text-align:center"><span class="count-badge">{count}</span></td>
          <td style="font-size:11px;color:#8b949e">{resources or '—'}</td>
        </tr>\n"""
    return rows

failed_rows      = build_failed_rows(failed_enriched)
passed_rows      = build_passed_rows(passed_enriched)
rule_summary_rows = build_rule_summary()

commit_short = COMMIT[:7] if len(COMMIT) > 7 else COMMIT

# ── HTML ──────────────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Checkov IaC Report — {REPO}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@400;600;800&display=swap');

    *, *::before, *::after {{ margin:0; padding:0; box-sizing:border-box; }}

    :root {{
      --bg:          #0d1117;
      --bg2:         #161b22;
      --bg3:         #21262d;
      --border:      #30363d;
      --border2:     #21262d;
      --text:        #c9d1d9;
      --text-dim:    #8b949e;
      --text-bright: #f0f6fc;
      --blue:        #58a6ff;
      --green:       #3fb950;
      --yellow:      #e3b341;
      --red:         #f85149;
      --purple:      #a371f7;
      --orange:      #ffa657;
      --font-mono:   'JetBrains Mono', monospace;
      --font-ui:     'Syne', sans-serif;
    }}

    body {{
      font-family: var(--font-ui);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      font-size: 13px;
      line-height: 1.6;
    }}

    /* ── Header ── */
    header {{
      background: var(--bg2);
      border-bottom: 2px solid {BADGE_BD};
      padding: 20px 40px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      position: sticky;
      top: 0;
      z-index: 100;
    }}
    .header-icon {{
      font-size: 1.6rem;
      filter: drop-shadow(0 0 8px {BADGE_COLOR}66);
    }}
    .header-title {{
      display: flex;
      flex-direction: column;
      gap: 2px;
    }}
    .header-title h1 {{
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--text-bright);
      letter-spacing: -0.3px;
    }}
    .header-meta {{
      color: var(--text-dim);
      font-size: 11px;
      font-family: var(--font-mono);
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }}
    .header-meta span {{ display: flex; align-items: center; gap: 4px; }}
    .header-badge {{
      margin-left: auto;
      background: {BADGE_BG};
      color: {BADGE_COLOR};
      border: 1px solid {BADGE_BD};
      padding: 6px 18px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 2px;
      font-family: var(--font-mono);
      text-shadow: 0 0 12px {BADGE_COLOR}66;
    }}

    /* ── Nav ── */
    nav {{
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
      padding: 0 40px;
      display: flex;
      gap: 0;
      overflow-x: auto;
    }}
    nav a {{
      color: var(--text-dim);
      padding: 11px 18px;
      font-size: 12px;
      font-weight: 600;
      border-bottom: 2px solid transparent;
      display: block;
      white-space: nowrap;
      text-decoration: none;
      transition: all 0.15s;
    }}
    nav a:hover {{ color: var(--text-bright); border-bottom-color: var(--blue); }}

    /* ── Layout ── */
    .container {{
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 28px;
    }}

    /* ── Sections ── */
    section {{ margin-bottom: 48px; }}
    section > h2 {{
      font-size: 14px;
      font-weight: 800;
      color: var(--text-bright);
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 10px;
      letter-spacing: 0.3px;
    }}
    .section-desc {{
      color: var(--text-dim);
      font-size: 12px;
      margin-bottom: 20px;
      line-height: 1.7;
    }}

    /* ── Metric cards ── */
    .metrics-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }}
    .metric {{
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px 16px;
      text-align: center;
      transition: border-color 0.2s;
    }}
    .metric:hover {{ border-color: var(--blue); }}
    .metric.m-red    {{ border-color: var(--red);    background: #f8514910; }}
    .metric.m-yellow {{ border-color: var(--yellow); background: #e3b34110; }}
    .metric.m-green  {{ border-color: var(--green);  background: #3fb95010; }}
    .metric.m-blue   {{ border-color: var(--blue);   background: #58a6ff10; }}
    .metric .num {{
      font-size: 2.8rem;
      font-weight: 800;
      display: block;
      line-height: 1;
      margin-bottom: 8px;
      font-family: var(--font-mono);
    }}
    .metric .lbl {{
      font-size: 10px;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }}
    .c-red    {{ color: var(--red); }}
    .c-yellow {{ color: var(--yellow); }}
    .c-green  {{ color: var(--green); }}
    .c-blue   {{ color: var(--blue); }}
    .c-gray   {{ color: var(--text-dim); }}

    /* ── Progress bar ── */
    .progress-wrap {{
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px 22px;
      margin-bottom: 20px;
    }}
    .progress-label {{
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-dim);
      margin-bottom: 10px;
      font-weight: 600;
    }}
    .progress-bar {{
      height: 8px;
      border-radius: 4px;
      background: var(--border);
      overflow: hidden;
    }}
    .progress-fill {{
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, var(--green), #2ea043);
      transition: width 0.5s ease;
    }}

    /* ── Card ── */
    .card {{
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 16px;
      overflow-x: auto;
    }}
    .card-title {{
      font-size: 13px;
      font-weight: 700;
      color: var(--text-bright);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    /* ── Filter bar ── */
    .filter-bar {{
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
      align-items: center;
    }}
    .filter-lbl {{
      font-size: 11px;
      color: var(--text-dim);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-right: 4px;
    }}
    .fbtn {{
      padding: 5px 14px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--bg3);
      color: var(--text-dim);
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
      font-family: var(--font-ui);
      transition: all 0.15s;
    }}
    .fbtn.active            {{ background: #58a6ff22; border-color: var(--blue);   color: var(--blue);   }}
    .fbtn.active.btn-high   {{ background: #f8514922; border-color: var(--red);    color: var(--red);    }}
    .fbtn.active.btn-medium {{ background: #e3b34122; border-color: var(--yellow); color: var(--yellow); }}
    .fbtn.active.btn-low    {{ background: #3fb95022; border-color: var(--green);  color: var(--green);  }}
    .fbtn:hover:not(.active) {{ background: var(--border); color: var(--text); }}

    /* ── Tables ── */
    table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
    th {{
      background: var(--bg3);
      color: var(--text-dim);
      padding: 9px 12px;
      text-align: left;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }}
    td {{
      padding: 10px 12px;
      border-bottom: 1px solid var(--border2);
      vertical-align: top;
    }}
    tr:last-child td {{ border-bottom: none; }}
    tr:hover td {{ background: #ffffff05; }}
    tr.hidden {{ display: none !important; }}

    /* ── Severity badges ── */
    .sev-high   {{ background:#f8514933; color:var(--red);    padding:3px 9px; border-radius:4px; font-size:10px; font-weight:700; font-family:var(--font-mono); white-space:nowrap; }}
    .sev-medium {{ background:#e3b34133; color:var(--yellow); padding:3px 9px; border-radius:4px; font-size:10px; font-weight:700; font-family:var(--font-mono); white-space:nowrap; }}
    .sev-low    {{ background:#3fb95022; color:var(--green);  padding:3px 9px; border-radius:4px; font-size:10px; font-weight:700; font-family:var(--font-mono); white-space:nowrap; }}
    .sev-info   {{ background:#58a6ff22; color:var(--blue);   padding:3px 9px; border-radius:4px; font-size:10px; font-weight:700; font-family:var(--font-mono); white-space:nowrap; }}
    .sev-pass   {{ background:#3fb95033; color:var(--green);  padding:3px 9px; border-radius:4px; font-size:10px; font-weight:700; font-family:var(--font-mono); white-space:nowrap; }}

    /* ── Inline code ── */
    code {{
      font-family: var(--font-mono);
      font-size: 11px;
    }}
    .rule-id {{
      background: #58a6ff15;
      color: var(--blue);
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #58a6ff30;
    }}
    .resource-tag {{
      background: #a371f715;
      color: var(--purple);
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #a371f730;
      display: inline-block;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }}
    .file-tag {{
      background: var(--bg3);
      color: var(--text-dim);
      padding: 2px 7px;
      border-radius: 4px;
    }}
    .line-tag {{
      color: var(--text-dim);
      font-size: 10px;
      font-family: var(--font-mono);
    }}
    .count-badge {{
      background: #f8514922;
      color: var(--red);
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      font-family: var(--font-mono);
    }}
    .ref-link {{
      color: var(--blue);
      font-size: 11px;
      text-decoration: none;
      display: inline-block;
      margin-top: 4px;
    }}
    .ref-link:hover {{ text-decoration: underline; }}

    /* ── Cell widths ── */
    .rule-name-cell {{ min-width: 220px; color: var(--text-bright); font-weight: 600; }}
    .desc-cell {{ min-width: 260px; color: var(--text); line-height: 1.6; }}
    .fix-cell  {{ min-width: 260px; color: var(--text-dim); line-height: 1.6; }}

    /* ── Empty state ── */
    .empty-state {{
      text-align: center;
      padding: 48px;
      color: var(--text-dim);
    }}
    .empty-state .icon {{ font-size: 3rem; display: block; margin-bottom: 12px; }}
    .empty-state p {{ font-size: 14px; }}

    /* ── Timeline del commit ── */
    .commit-strip {{
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px 20px;
      display: flex;
      gap: 24px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 24px;
      font-family: var(--font-mono);
      font-size: 11px;
    }}
    .commit-strip span {{ color: var(--text-dim); }}
    .commit-strip strong {{ color: var(--text-bright); }}
    .commit-strip a {{ color: var(--blue); text-decoration: none; }}
    .commit-strip a:hover {{ text-decoration: underline; }}

    /* ── Scrollbar ── */
    ::-webkit-scrollbar {{ width: 6px; height: 6px; }}
    ::-webkit-scrollbar-track {{ background: var(--bg); }}
    ::-webkit-scrollbar-thumb {{ background: var(--border); border-radius: 3px; }}
    ::-webkit-scrollbar-thumb:hover {{ background: var(--text-dim); }}

    footer {{
      text-align: center;
      padding: 24px;
      color: var(--text-dim);
      font-size: 11px;
      border-top: 1px solid var(--border2);
      margin-top: 48px;
    }}
    footer a {{ color: var(--blue); text-decoration: none; }}
  </style>
</head>
<body>

<!-- ═══ HEADER ════════════════════════════════════════════════════════════ -->
<header>
  <span class="header-icon">🏗️</span>
  <div class="header-title">
    <h1>Checkov — IaC Security Report</h1>
    <div class="header-meta">
      <span>📦 <strong>{REPO}</strong></span>
      <span>🌿 <strong>{BRANCH}</strong></span>
      <span>🔖 <strong>{commit_short}</strong></span>
      <span>🕒 {FECHA}</span>
    </div>
  </div>
  <span class="header-badge">{BADGE_TEXT}</span>
</header>

<!-- ═══ NAV ══════════════════════════════════════════════════════════════ -->
<nav>
  <a href="#resumen">📊 Resumen</a>
  <a href="#por-regla">📋 Por regla</a>
  <a href="#detalle-fallos">❌ Fallos ({total_failed})</a>
  <a href="#detalle-pasados">✅ Pasados ({total_passed})</a>
</nav>

<div class="container">

  <!-- Commit strip -->
  <div class="commit-strip">
    <span>Scan: <strong>{FECHA}</strong></span>
    <span>·</span>
    <span>Framework: <strong>CloudFormation / SAM</strong></span>
    <span>·</span>
    <span>Herramienta: <strong>Checkov 3.x</strong></span>
    <span>·</span>
    <a href="{RUN_URL}" target="_blank">Ver ejecución en GitHub Actions →</a>
  </div>

  <!-- ═══ RESUMEN ═══════════════════════════════════════════════════════ -->
  <section id="resumen">
    <h2>📊 Resumen ejecutivo</h2>
    <p class="section-desc">
      Checkov escaneó la infraestructura como código (IaC) con CloudFormation/SAM
      y encontró <strong style="color:var(--text-bright)">{total_failed}</strong> checks fallidos
      y <strong style="color:var(--green)">{total_passed}</strong> checks aprobados
      de un total de <strong style="color:var(--text-bright)">{total_checks}</strong> revisiones.
    </p>

    <div class="metrics-grid">
      <div class="metric m-red">
        <span class="num c-red">{count_high}</span>
        <span class="lbl">🔴 HIGH</span>
      </div>
      <div class="metric m-yellow">
        <span class="num c-yellow">{count_medium}</span>
        <span class="lbl">🟡 MEDIUM</span>
      </div>
      <div class="metric">
        <span class="num c-green">{count_low}</span>
        <span class="lbl">🟢 LOW</span>
      </div>
      <div class="metric m-red">
        <span class="num c-red">{total_failed}</span>
        <span class="lbl">❌ Fallidos</span>
      </div>
      <div class="metric m-green">
        <span class="num c-green">{total_passed}</span>
        <span class="lbl">✅ Aprobados</span>
      </div>
      <div class="metric m-blue">
        <span class="num c-blue">{total_checks}</span>
        <span class="lbl">📊 Total checks</span>
      </div>
    </div>

    <!-- Barra de progreso -->
    <div class="progress-wrap">
      <div class="progress-label">
        <span>Tasa de aprobación</span>
        <span style="color:var(--text-bright);font-family:var(--font-mono)">
          {total_passed}/{total_checks} ({round(total_passed/total_checks*100) if total_checks else 0}%)
        </span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:{round(total_passed/total_checks*100) if total_checks else 0}%"></div>
      </div>
    </div>
  </section>

  <!-- ═══ RESUMEN POR REGLA ═════════════════════════════════════════════ -->
  <section id="por-regla">
    <h2>📋 Resumen por regla</h2>
    <p class="section-desc">
      Agrupación de los checks fallidos por ID de regla.
      El número en rojo indica cuántos recursos distintos fueron afectados por esa regla.
    </p>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th style="width:100px">Severidad</th>
            <th style="width:160px">Check ID</th>
            <th>Descripción de la regla</th>
            <th style="width:70px;text-align:center">Recursos</th>
            <th>Afectados</th>
          </tr>
        </thead>
        <tbody>
          {rule_summary_rows}
        </tbody>
      </table>
    </div>
  </section>

  <!-- ═══ DETALLE FALLOS ════════════════════════════════════════════════ -->
  <section id="detalle-fallos">
    <h2>❌ Detalle de checks fallidos ({total_failed})</h2>
    <p class="section-desc">
      Cada fila representa un recurso individual que no superó el check de seguridad.
      Usa los filtros para priorizar por severidad.
    </p>

    <div class="filter-bar">
      <span class="filter-lbl">Filtrar:</span>
      <button class="fbtn active"         onclick="filterTable('failed','ALL',this)">Todos ({total_failed})</button>
      <button class="fbtn btn-high"       onclick="filterTable('failed','error',this)">🔴 HIGH ({count_high})</button>
      <button class="fbtn btn-medium"     onclick="filterTable('failed','warning',this)">🟡 MEDIUM ({count_medium})</button>
      <button class="fbtn btn-low"        onclick="filterTable('failed','note',this)">🟢 LOW ({count_low})</button>
    </div>

    <div class="card">
      {"<div class='empty-state'><span class='icon'>✨</span><p>¡No se encontraron checks fallidos! Todo el IaC cumple las políticas de seguridad.</p></div>" if not failed_rows else f"""
      <table id="table-failed">
        <thead>
          <tr>
            <th style="width:100px">Severidad</th>
            <th style="width:140px">Check ID</th>
            <th>Regla</th>
            <th>Recurso</th>
            <th>Archivo / Línea</th>
            <th>Problema</th>
            <th>Solución recomendada</th>
          </tr>
        </thead>
        <tbody>
          {failed_rows}
        </tbody>
      </table>"""}
    </div>
  </section>

  <!-- ═══ DETALLE PASADOS ═══════════════════════════════════════════════ -->
  <section id="detalle-pasados">
    <h2>✅ Checks aprobados ({total_passed})</h2>
    <p class="section-desc">
      Recursos que superaron satisfactoriamente los checks de seguridad.
    </p>
    <div class="card">
      {"<div class='empty-state'><span class='icon'>🔍</span><p>No hay resultados aprobados registrados.</p></div>" if not passed_rows else f"""
      <table id="table-passed">
        <thead>
          <tr>
            <th style="width:100px">Estado</th>
            <th style="width:140px">Check ID</th>
            <th>Regla</th>
            <th>Recurso</th>
            <th>Archivo / Línea</th>
          </tr>
        </thead>
        <tbody>
          {passed_rows}
        </tbody>
      </table>"""}
    </div>
  </section>

</div>

<footer>
  🏗️ Checkov IaC Security Report &nbsp;·&nbsp;
  <a href="https://www.checkov.io/" target="_blank">Checkov</a> &nbsp;·&nbsp;
  <a href="{RUN_URL}" target="_blank">GitHub Actions Run</a> &nbsp;·&nbsp;
  Generado automáticamente · {FECHA}
</footer>

<script>
  function filterTable(tableId, level, btn) {{
    const table = document.getElementById('table-' + tableId);
    if (!table) return;
    table.querySelectorAll('tbody tr').forEach(row => {{
      if (level === 'ALL') {{
        row.classList.remove('hidden');
      }} else {{
        row.classList.toggle('hidden', row.dataset.level !== level);
      }}
    }});
    const bar = btn.closest('.filter-bar');
    bar.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }}
</script>

</body>
</html>"""

# ── Escribir archivo ──────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUT) if os.path.dirname(OUT) else ".", exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

print(f"✅  {OUT} generado ({len(html):,} chars)")
print(f"    Fallos   → {count_high} HIGH, {count_medium} MEDIUM, {count_low} LOW  (total: {total_failed})")
print(f"    Aprobados→ {total_passed}")
print(f"    Total    → {total_checks}")
