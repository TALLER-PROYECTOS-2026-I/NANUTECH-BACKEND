#!/usr/bin/env python3
"""
generate-report-checkov.py  —  v2 Light Edition
Genera el index.html del reporte Checkov con paleta clara Lab2Next-inspired.

Lee datos desde:
  - checkov-output.sarif   → resultados del scan IaC (passed + failed)
  - variables de entorno   → fecha, URL del run, repo, rama, commit

Salida:
  - OUT (default: gh-pages-site/checkov/index.html)
"""

import os
import json
import sys
from collections import defaultdict

# ── Variables de entorno ──────────────────────────────────────────────────────
SARIF_FILE  = os.environ.get("SARIF_FILE",  "checkov-output.sarif")
OUT         = os.environ.get("OUT",         "gh-pages-site/checkov/index.html")
FECHA       = os.environ.get("FECHA",       "N/A")
RUN_URL     = os.environ.get("RUN_URL",     "#")
REPO        = os.environ.get("REPO",        "Nanutech")
BRANCH      = os.environ.get("BRANCH",      "—")
COMMIT      = os.environ.get("COMMIT",      "—")

SEVERITY_MAP = {
    "error":   ("HIGH",   "sev-high",   "#DC2626"),
    "warning": ("MEDIUM", "sev-medium", "#D97706"),
    "note":    ("LOW",    "sev-low",    "#059669"),
    "none":    ("INFO",   "sev-info",   "#2563EB"),
}

KNOWN_RULES = {
    "CKV_AWS_76":  {"desc": "La API Gateway no tiene Access Logging habilitado. Sin logging es imposible auditar quién accedió y cuándo.", "fix": "Agregar AccessLogSetting con DestinationArn apuntando a un Log Group de CloudWatch en el recurso AWS::Serverless::Api.", "ref": "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-logging-policies/logging-17"},
    "CKV_AWS_120": {"desc": "API Gateway no tiene caching habilitado. El caching reduce latencia y protege backends de sobrecarga.", "fix": "Agregar MethodSettings con CachingEnabled: true y CacheDataEncrypted: true en la definición del stage.", "ref": "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/ensure-api-gateway-caching-is-enabled"},
    "CKV_AWS_115": {"desc": "La función Lambda no tiene límite de concurrencia configurado. Sin este límite, una función puede agotar las concurrencias disponibles de toda la cuenta.", "fix": "Agregar ReservedConcurrentExecutions: <número> en la propiedad de cada AWS::Serverless::Function.", "ref": "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/ensure-that-aws-lambda-function-is-configured-for-function-level-concurrent-execution-limit"},
    "CKV_AWS_116": {"desc": "La función Lambda no tiene Dead Letter Queue (DLQ) configurada. Sin DLQ los mensajes fallidos se pierden silenciosamente.", "fix": "Agregar DeadLetterQueue con Type: SQS y TargetArn: !GetAtt <queue>.Arn en la propiedad de la función.", "ref": "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/ensure-that-aws-lambda-function-is-configured-for-a-dead-letter-queue-dlq"},
    "CKV_AWS_173": {"desc": "Las variables de entorno de Lambda no están cifradas con una clave KMS personalizada.", "fix": "Agregar KmsKeyArn: !GetAtt <key>.Arn en la sección Environment de cada función que maneje datos sensibles.", "ref": "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-serverless-policies/bc-aws-serverless-5"},
    "CKV_AWS_117": {"desc": "La función Lambda no está configurada dentro de una VPC. Las funciones fuera de VPC están expuestas directamente a internet.", "fix": "Agregar VpcConfig con SecurityGroupIds y SubnetIds apuntando a subredes privadas.", "ref": "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/ensure-that-aws-lambda-function-is-configured-inside-a-vpc-1"},
    "CKV_AWS_45":  {"desc": "La función Lambda usa variables de entorno con claves hardcodeadas.", "fix": "Usar AWS Secrets Manager o SSM Parameter Store para las credenciales.", "ref": "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/bc-aws-45"},
    "CKV_AWS_50":  {"desc": "Lambda no tiene X-Ray tracing habilitado. Sin tracing es difícil depurar problemas de rendimiento.", "fix": "Agregar Tracing: Active en la propiedad de la función Lambda.", "ref": "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-logging-policies/logging-31"},
    "CKV_AWS_272": {"desc": "Lambda no valida la integridad del código (code signing).", "fix": "Configurar CodeSigningConfigArn en la función Lambda.", "ref": "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/bc-aws-272"},
    "CKV_AWS_363": {"desc": "El runtime de Lambda está deprecado o próximo a deprecarse.", "fix": "Actualizar Runtime a una versión activamente soportada (nodejs20.x, python3.12, etc.).", "ref": "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-general-policies/bc-aws-363"},
    "CKV_AWS_364": {"desc": "Los permisos de Lambda delegados a servicios AWS no están limitados por SourceArn o SourceAccount.", "fix": "Agregar Condition con ArnLike o StringEquals en el recurso AWS::Lambda::Permission.", "ref": "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-iam-policies/bc-aws-364"},
    "CKV_AWS_73":  {"desc": "API Gateway no tiene X-Ray tracing habilitado.", "fix": "Agregar TracingEnabled: true en el recurso AWS::Serverless::Api.", "ref": "https://docs.prismacloud.io/en/enterprise-edition/policy-reference/aws-policies/aws-logging-policies/logging-15"},
}

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
    runs = data.get("runs", [])
    if not runs:
        return [], [], {}, {}
    run     = runs[0]
    tool    = run.get("tool", {}).get("driver", {})
    rules   = {r["id"]: r for r in tool.get("rules", [])}
    results = run.get("results", [])
    failed  = [r for r in results if r.get("kind", "fail") != "pass" and r.get("level", "warning") != "none" or r.get("level") in ("error", "warning", "note")]
    passed  = [r for r in results if r.get("kind") == "pass"]
    if not passed and not failed:
        failed = [r for r in results if r.get("level") in ("error","warning","note")]
        passed = [r for r in results if r not in failed]
    return failed, passed, rules, data

failed_results, passed_results, sarif_rules, raw_sarif = load_sarif(SARIF_FILE)

def enrich(result, rules):
    rule_id   = result.get("ruleId", "")
    level     = result.get("level", "warning")
    sev_label, sev_class, sev_color = SEVERITY_MAP.get(level, ("INFO", "sev-info", "#2563EB"))
    message   = result.get("message", {}).get("text", "")
    locs      = result.get("locations", [])
    file_uri  = ""
    start_ln  = ""
    end_ln    = ""
    if locs:
        pl       = locs[0].get("physicalLocation", {})
        file_uri = pl.get("artifactLocation", {}).get("uri", "")
        region   = pl.get("region", {})
        start_ln = str(region.get("startLine", ""))
        end_ln   = str(region.get("endLine", ""))
    rule_meta  = rules.get(rule_id, {})
    rule_name  = rule_meta.get("shortDescription", {}).get("text", rule_id)
    rule_help  = rule_meta.get("helpUri", "")
    known      = KNOWN_RULES.get(rule_id, {})
    desc       = known.get("desc") or rule_meta.get("fullDescription", {}).get("text", message)
    fix        = known.get("fix") or rule_meta.get("help", {}).get("text", "Revisar la documentación de Checkov.")
    ref        = known.get("ref") or rule_help
    resource   = ""
    if "for resource:" in message:
        resource = message.split("for resource:")[-1].strip()
    elif "::" in message:
        parts = [p for p in message.split() if "::" in p]
        resource = parts[0] if parts else ""
    return {"rule_id": rule_id, "level": level, "sev_label": sev_label, "sev_class": sev_class, "sev_color": sev_color, "rule_name": rule_name, "message": message, "file": file_uri, "start_ln": start_ln, "end_ln": end_ln, "desc": desc, "fix": fix, "ref": ref, "resource": resource}

failed_enriched = [enrich(r, sarif_rules) for r in failed_results]
passed_enriched = [enrich(r, sarif_rules) for r in passed_results]

total_failed  = len(failed_enriched)
total_passed  = len(passed_enriched)
total_checks  = total_failed + total_passed
count_high    = sum(1 for r in failed_enriched if r["level"] == "error")
count_medium  = sum(1 for r in failed_enriched if r["level"] == "warning")
count_low     = sum(1 for r in failed_enriched if r["level"] == "note")
pass_pct      = round(total_passed / total_checks * 100) if total_checks else 0

by_rule = defaultdict(list)
for r in failed_enriched:
    by_rule[r["rule_id"]].append(r)

if count_high > 0:
    BADGE_TEXT = "FAILED"; BADGE_COLOR = "#DC2626"; BADGE_BG = "#FEF2F2"; BADGE_BORDER = "#FECACA"
elif count_medium > 0:
    BADGE_TEXT = "WARNINGS"; BADGE_COLOR = "#D97706"; BADGE_BG = "#FFFBEB"; BADGE_BORDER = "#FDE68A"
elif total_failed > 0:
    BADGE_TEXT = "LOW RISK"; BADGE_COLOR = "#059669"; BADGE_BG = "#ECFDF5"; BADGE_BORDER = "#A7F3D0"
else:
    BADGE_TEXT = "PASSED"; BADGE_COLOR = "#059669"; BADGE_BG = "#ECFDF5"; BADGE_BORDER = "#A7F3D0"

def build_failed_rows(items):
    if not items:
        return ""
    rows = ""
    for r in items:
        file_display = r["file"].lstrip("/") if r["file"] else "—"
        lines = f"L{r['start_ln']}" if r["start_ln"] else "—"
        if r["end_ln"] and r["end_ln"] != r["start_ln"]:
            lines += f"–{r['end_ln']}"
        resource_html = f'<code class="resource-tag">{r["resource"]}</code>' if r["resource"] else '<span class="text-muted">—</span>'
        ref_html = f'<a href="{r["ref"]}" target="_blank" class="ref-link">Ver documentación →</a>' if r["ref"] else ""
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

def build_passed_rows(items):
    if not items:
        return ""
    rows = ""
    for r in items:
        file_display = r["file"].lstrip("/") if r["file"] else "—"
        lines = f"L{r['start_ln']}" if r["start_ln"] else "—"
        resource_html = f'<code class="resource-tag">{r["resource"]}</code>' if r["resource"] else '<span class="text-muted">—</span>'
        rows += f"""<tr>
          <td><span class="sev-pass">PASS</span></td>
          <td><code class="rule-id">{r['rule_id']}</code></td>
          <td class="rule-name-cell">{r['rule_name']}</td>
          <td>{resource_html}</td>
          <td><code class="file-tag">{file_display}</code><br><span class="line-tag">{lines}</span></td>
        </tr>\n"""
    return rows

def build_rule_summary():
    if not by_rule:
        return '<tr><td colspan="5" class="empty-row">Sin issues detectados — todo el IaC cumple las políticas ✅</td></tr>'
    rows = ""
    for rule_id, items in sorted(by_rule.items(), key=lambda x: (0 if any(r["level"]=="error" for r in x[1]) else 1 if any(r["level"]=="warning" for r in x[1]) else 2)):
        sample    = items[0]
        count     = len(items)
        resources = ", ".join(sorted(set(r["resource"] for r in items if r["resource"])))[:120]
        known     = KNOWN_RULES.get(rule_id, {})
        ref       = known.get("ref") or sample["ref"] or ""
        ref_html  = f'<a href="{ref}" target="_blank" class="ref-link">Docs →</a>' if ref else ""
        rows += f"""<tr>
          <td><span class="{sample['sev_class']}">{sample['sev_label']}</span></td>
          <td><code class="rule-id">{rule_id}</code></td>
          <td class="rule-name-cell">{sample['rule_name']}<br><span class="rule-ref">{ref_html}</span></td>
          <td style="text-align:center"><span class="count-badge">{count}</span></td>
          <td class="resources-cell">{resources or '—'}</td>
        </tr>\n"""
    return rows

failed_rows       = build_failed_rows(failed_enriched)
passed_rows       = build_passed_rows(passed_enriched)
rule_summary_rows = build_rule_summary()
commit_short      = COMMIT[:7] if len(COMMIT) > 7 else COMMIT

# ─────────────────────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Checkov IaC Report — {REPO}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {{ margin: 0; padding: 0; box-sizing: border-box; }}

    :root {{
      --bg:           #F0F4F9;
      --bg2:          #FFFFFF;
      --bg3:          #F8FAFC;
      --border:       #E2E8F0;
      --border2:      #CBD5E1;

      --accent:       #2563EB;
      --accent-h:     #1D4ED8;
      --accent-light: #EFF6FF;
      --accent-mid:   #BFDBFE;

      --green:        #059669;
      --green-bg:     #ECFDF5;
      --green-border: #A7F3D0;
      --green-light:  #D1FAE5;

      --amber:        #D97706;
      --amber-bg:     #FFFBEB;
      --amber-border: #FDE68A;
      --amber-light:  #FEF3C7;

      --red:          #DC2626;
      --red-bg:       #FEF2F2;
      --red-border:   #FECACA;
      --red-light:    #FEE2E2;

      --blue:         #0284C7;
      --blue-bg:      #F0F9FF;
      --blue-border:  #BAE6FD;

      --slate:        #0F172A;
      --slate2:       #1E293B;
      --text:         #0F172A;
      --text2:        #475569;
      --text3:        #94A3B8;
      --text4:        #CBD5E1;

      --font:         'Inter', system-ui, sans-serif;
      --mono:         'JetBrains Mono', monospace;
      --radius:       10px;
      --radius-sm:    7px;
      --radius-lg:    14px;
      --shadow-sm:    0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.05);
      --shadow:       0 4px 16px rgba(15,23,42,0.09);
      --shadow-lg:    0 10px 40px rgba(15,23,42,0.12);
      --header-h:     64px;
    }}

    html {{ scroll-behavior: smooth; scroll-padding-top: calc(var(--header-h) + 56px); }}
    body {{
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      font-size: 13px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }}

    ::-webkit-scrollbar {{ width: 5px; height: 5px; }}
    ::-webkit-scrollbar-track {{ background: var(--bg3); }}
    ::-webkit-scrollbar-thumb {{ background: var(--border2); border-radius: 3px; }}
    ::-webkit-scrollbar-thumb:hover {{ background: var(--accent); }}

    /* ══════════════════════════════════════════
       HEADER
    ══════════════════════════════════════════ */
    header {{
      position: sticky; top: 0; z-index: 200;
      background: rgba(255,255,255,0.94);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
      height: var(--header-h);
      display: flex; align-items: center;
      padding: 0 32px; gap: 16px;
    }}
    .header-icon {{
      width: 38px; height: 38px;
      background: var(--accent);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      box-shadow: 0 2px 10px rgba(37,99,235,0.3);
      flex-shrink: 0;
    }}
    .header-title-wrap {{
      display: flex; flex-direction: column; gap: 1px;
    }}
    .header-title {{
      font-size: 14px; font-weight: 800;
      color: var(--slate); letter-spacing: -0.2px;
    }}
    .header-sub {{
      font-size: 11px; color: var(--text3);
      display: flex; gap: 10px; align-items: center;
      font-family: var(--mono);
    }}
    .header-sub span {{ display: flex; align-items: center; gap: 3px; }}
    .header-divider-v {{ width: 1px; height: 20px; background: var(--border); }}
    .header-badge-wrap {{ margin-left: auto; }}
    .status-badge {{
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 14px; border-radius: 20px;
      font-size: 11px; font-weight: 800; letter-spacing: 1.5px;
      font-family: var(--mono);
      background: {BADGE_BG};
      color: {BADGE_COLOR};
      border: 1px solid {BADGE_BORDER};
    }}
    .status-badge::before {{
      content: ''; width: 7px; height: 7px;
      background: {BADGE_COLOR}; border-radius: 50%;
      animation: pulse-dot 2s infinite;
    }}
    @keyframes pulse-dot {{
      0%, 100% {{ opacity: 1; transform: scale(1); }}
      50%       {{ opacity: 0.5; transform: scale(0.7); }}
    }}

    /* ══════════════════════════════════════════
       NAV TABS
    ══════════════════════════════════════════ */
    .nav-bar {{
      position: sticky; top: var(--header-h); z-index: 150;
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
      padding: 0 32px;
      display: flex; gap: 0; overflow-x: auto;
      box-shadow: 0 1px 3px rgba(15,23,42,0.05);
    }}
    .nav-bar a {{
      display: inline-flex; align-items: center; gap: 7px;
      padding: 13px 18px;
      font-size: 12px; font-weight: 600;
      color: var(--text2);
      border-bottom: 2px solid transparent;
      text-decoration: none; white-space: nowrap;
      transition: all 0.15s;
    }}
    .nav-bar a:hover {{ color: var(--accent); border-bottom-color: var(--accent-mid); }}
    .nav-bar a .nav-count {{
      background: var(--bg3);
      border: 1px solid var(--border);
      color: var(--text3);
      padding: 1px 7px; border-radius: 10px;
      font-size: 10px; font-weight: 700; font-family: var(--mono);
    }}
    .nav-bar a.fail-link .nav-count {{ background: var(--red-light); color: var(--red); border-color: var(--red-border); }}
    .nav-bar a.pass-link .nav-count {{ background: var(--green-light); color: var(--green); border-color: var(--green-border); }}

    /* ══════════════════════════════════════════
       LAYOUT
    ══════════════════════════════════════════ */
    .container {{
      max-width: 1380px;
      margin: 0 auto;
      padding: 32px 28px 64px;
    }}

    /* ══════════════════════════════════════════
       SECTIONS
    ══════════════════════════════════════════ */
    .section {{ margin-bottom: 48px; }}
    .section-header {{
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 6px;
    }}
    .section-header h2 {{
      font-size: 16px; font-weight: 800;
      color: var(--slate); letter-spacing: -0.3px;
    }}
    .section-desc {{
      color: var(--text2); font-size: 12px;
      margin-bottom: 20px; line-height: 1.7;
      max-width: 680px;
    }}
    .section-divider {{
      height: 1px; background: var(--border);
      margin: 0 0 20px;
    }}

    /* ══════════════════════════════════════════
       COMMIT STRIP
    ══════════════════════════════════════════ */
    .commit-strip {{
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px 20px;
      display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
      margin-bottom: 28px;
      font-size: 11px;
      box-shadow: var(--shadow-sm);
    }}
    .commit-item {{
      display: flex; align-items: center; gap: 5px;
      color: var(--text3); font-family: var(--mono);
    }}
    .commit-item strong {{ color: var(--text2); font-weight: 600; }}
    .commit-sep {{ color: var(--border2); }}
    .commit-strip a {{
      color: var(--accent); text-decoration: none; font-weight: 600;
      font-family: var(--mono); font-size: 11px;
      margin-left: auto;
    }}
    .commit-strip a:hover {{ text-decoration: underline; }}

    /* ══════════════════════════════════════════
       METRIC CARDS
    ══════════════════════════════════════════ */
    .metrics-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }}
    .metric {{
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 18px 18px;
      display: flex; flex-direction: column; gap: 6px;
      box-shadow: var(--shadow-sm);
      transition: box-shadow 0.15s, border-color 0.15s;
      position: relative; overflow: hidden;
    }}
    .metric::after {{
      content: ''; position: absolute;
      top: 0; left: 0; right: 0; height: 3px;
      border-radius: var(--radius) var(--radius) 0 0;
    }}
    .metric:hover {{ box-shadow: var(--shadow); }}
    .metric.m-red    {{ border-color: var(--red-border);    background: var(--red-bg); }}
    .metric.m-red::after    {{ background: var(--red); }}
    .metric.m-amber  {{ border-color: var(--amber-border);  background: var(--amber-bg); }}
    .metric.m-amber::after  {{ background: var(--amber); }}
    .metric.m-green  {{ border-color: var(--green-border);  background: var(--green-bg); }}
    .metric.m-green::after  {{ background: var(--green); }}
    .metric.m-blue   {{ border-color: var(--blue-border);   background: var(--blue-bg); }}
    .metric.m-blue::after   {{ background: var(--blue); }}
    .metric.m-accent {{ border-color: var(--accent-mid);    background: var(--accent-light); }}
    .metric.m-accent::after {{ background: var(--accent); }}
    .metric-icon {{ font-size: 18px; line-height: 1; }}
    .metric-num {{
      font-size: 2.4rem; font-weight: 800; line-height: 1;
      font-family: var(--mono); letter-spacing: -2px;
    }}
    .metric-num.c-red    {{ color: var(--red); }}
    .metric-num.c-amber  {{ color: var(--amber); }}
    .metric-num.c-green  {{ color: var(--green); }}
    .metric-num.c-blue   {{ color: var(--blue); }}
    .metric-num.c-accent {{ color: var(--accent); }}
    .metric-num.c-slate  {{ color: var(--slate); }}
    .metric-lbl {{
      font-size: 10px; color: var(--text2);
      text-transform: uppercase; letter-spacing: 0.7px; font-weight: 700;
    }}

    /* ══════════════════════════════════════════
       PROGRESS BAR
    ══════════════════════════════════════════ */
    .progress-card {{
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px 24px;
      margin-bottom: 0; box-shadow: var(--shadow-sm);
    }}
    .progress-header {{
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px;
    }}
    .progress-label {{ font-size: 13px; font-weight: 700; color: var(--slate); }}
    .progress-pct {{
      font-size: 22px; font-weight: 800; color: var(--green);
      font-family: var(--mono); letter-spacing: -1px;
    }}
    .progress-track {{
      height: 10px; border-radius: 5px;
      background: var(--bg3); border: 1px solid var(--border);
      overflow: hidden; margin-bottom: 10px;
    }}
    .progress-fill {{
      height: 100%; border-radius: 5px;
      background: linear-gradient(90deg, #059669, #10B981);
      transition: width 0.6s ease;
    }}
    .progress-legend {{
      display: flex; gap: 16px; font-size: 11px; color: var(--text3);
    }}
    .progress-legend span {{ display: flex; align-items: center; gap: 5px; }}
    .legend-dot {{
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }}

    /* ══════════════════════════════════════════
       CARD
    ══════════════════════════════════════════ */
    .card {{
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); overflow: hidden;
      box-shadow: var(--shadow-sm);
    }}
    .card-header {{
      padding: 14px 20px; border-bottom: 1px solid var(--border);
      background: var(--bg3);
      display: flex; align-items: center; justify-content: space-between;
    }}
    .card-title {{
      font-size: 13px; font-weight: 700; color: var(--slate);
      display: flex; align-items: center; gap: 8px;
    }}

    /* ══════════════════════════════════════════
       FILTER BAR
    ══════════════════════════════════════════ */
    .filter-bar {{
      display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
      padding: 14px 20px; border-bottom: 1px solid var(--border);
      background: var(--bg2);
    }}
    .filter-lbl {{
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.7px;
      color: var(--text3); margin-right: 4px;
    }}
    .fbtn {{
      padding: 5px 12px; border-radius: 6px;
      border: 1px solid var(--border); background: var(--bg3);
      color: var(--text2); cursor: pointer;
      font-size: 11px; font-weight: 700; font-family: var(--font);
      transition: all 0.13s; white-space: nowrap;
    }}
    .fbtn:hover:not(.active) {{ background: var(--bg); border-color: var(--border2); color: var(--text); }}
    .fbtn.active              {{ background: var(--accent-light); border-color: var(--accent-mid); color: var(--accent); }}
    .fbtn.active.btn-high     {{ background: var(--red-bg);   border-color: var(--red-border);   color: var(--red); }}
    .fbtn.active.btn-medium   {{ background: var(--amber-bg); border-color: var(--amber-border); color: var(--amber); }}
    .fbtn.active.btn-low      {{ background: var(--green-bg); border-color: var(--green-border); color: var(--green); }}

    /* ══════════════════════════════════════════
       TABLES
    ══════════════════════════════════════════ */
    .table-wrap {{ overflow-x: auto; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
    th {{
      background: var(--bg3); color: var(--text3);
      padding: 9px 14px; text-align: left;
      font-weight: 700; font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.6px;
      border-bottom: 1px solid var(--border);
      white-space: nowrap; position: sticky; top: 0;
    }}
    td {{
      padding: 11px 14px; border-bottom: 1px solid var(--border);
      vertical-align: top; background: var(--bg2);
    }}
    tr:last-child td {{ border-bottom: none; }}
    tr:hover td {{ background: var(--bg3); }}
    tr.hidden {{ display: none !important; }}
    .empty-row {{
      text-align: center; color: var(--text3);
      padding: 40px 20px !important; font-size: 13px;
      background: var(--bg2) !important;
    }}
    .text-muted {{ color: var(--text4); font-size: 12px; }}

    /* ── Severity badges ── */
    .sev-high   {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--red-bg);   color:var(--red);   border:1px solid var(--red-border); }}
    .sev-medium {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--amber-bg); color:var(--amber); border:1px solid var(--amber-border); }}
    .sev-low    {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--green-bg); color:var(--green); border:1px solid var(--green-border); }}
    .sev-info   {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--blue-bg);  color:var(--blue);  border:1px solid var(--blue-border); }}
    .sev-pass   {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--green-bg); color:var(--green); border:1px solid var(--green-border); }}
    .sev-high::before   {{ content:''; width:5px; height:5px; border-radius:50%; background:var(--red);   flex-shrink:0; }}
    .sev-medium::before {{ content:''; width:5px; height:5px; border-radius:50%; background:var(--amber); flex-shrink:0; }}
    .sev-low::before    {{ content:''; width:5px; height:5px; border-radius:50%; background:var(--green); flex-shrink:0; }}
    .sev-pass::before   {{ content:''; width:5px; height:5px; border-radius:50%; background:var(--green); flex-shrink:0; }}

    /* ── Inline code elements ── */
    code {{ font-family: var(--mono); font-size: 11px; }}
    .rule-id {{
      background: var(--accent-light); color: var(--accent);
      border: 1px solid var(--accent-mid);
      padding: 2px 7px; border-radius: 5px;
      font-size: 10px; font-weight: 600;
    }}
    .resource-tag {{
      background: var(--bg3); color: var(--text2);
      border: 1px solid var(--border);
      padding: 2px 7px; border-radius: 5px;
      display: inline-block; max-width: 220px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }}
    .file-tag {{
      background: var(--bg3); color: var(--text2);
      border: 1px solid var(--border);
      padding: 2px 7px; border-radius: 5px;
    }}
    .line-tag {{ color: var(--text3); font-size: 10px; font-family: var(--mono); }}
    .count-badge {{
      background: var(--red-bg); color: var(--red);
      border: 1px solid var(--red-border);
      padding: 2px 10px; border-radius: 12px;
      font-size: 11px; font-weight: 700; font-family: var(--mono);
    }}
    .ref-link {{
      color: var(--accent); font-size: 11px; text-decoration: none;
      font-weight: 600; display: inline-block; margin-top: 3px;
    }}
    .ref-link:hover {{ text-decoration: underline; }}
    .rule-ref {{ margin-top: 3px; }}

    /* ── Cell widths ── */
    .rule-name-cell  {{ min-width: 200px; color: var(--slate); font-weight: 600; line-height: 1.5; }}
    .desc-cell       {{ min-width: 240px; color: var(--text2); line-height: 1.65; }}
    .fix-cell        {{ min-width: 240px; color: var(--text2); line-height: 1.65; }}
    .resources-cell  {{ font-size: 11px; color: var(--text3); font-family: var(--mono); max-width: 240px; }}

    /* ══════════════════════════════════════════
       EMPTY STATE
    ══════════════════════════════════════════ */
    .empty-state {{
      text-align: center; padding: 56px 32px;
      color: var(--text3); background: var(--bg2);
    }}
    .empty-icon {{ font-size: 3rem; display: block; margin-bottom: 12px; }}
    .empty-state p {{ font-size: 14px; color: var(--text2); font-weight: 500; }}
    .empty-state span {{ font-size: 12px; color: var(--text3); display: block; margin-top: 4px; }}

    /* ══════════════════════════════════════════
       FOOTER
    ══════════════════════════════════════════ */
    footer {{
      text-align: center;
      padding: 24px 32px;
      color: var(--text3);
      font-size: 11px;
      border-top: 1px solid var(--border);
      background: var(--bg2);
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 8px;
    }}
    footer a {{ color: var(--accent); text-decoration: none; font-weight: 600; }}
    footer a:hover {{ text-decoration: underline; }}
    .footer-brand {{
      display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text2);
    }}
    .footer-brand-icon {{
      width: 24px; height: 24px; background: var(--accent);
      border-radius: 6px; display: flex; align-items: center;
      justify-content: center; font-size: 12px;
    }}

    @media (max-width: 768px) {{
      .container {{ padding: 20px 16px 48px; }}
      .metrics-grid {{ grid-template-columns: repeat(2, 1fr); }}
      header {{ padding: 0 16px; }}
      .nav-bar {{ padding: 0 16px; }}
    }}
  </style>
</head>
<body>

<!-- ═══ HEADER ═══════════════════════════════════════════════════════════ -->
<header>
  <div class="header-icon">🏗️</div>
  <div class="header-title-wrap">
    <div class="header-title">Checkov — IaC Security Report</div>
    <div class="header-sub">
      <span>📦 <strong>{REPO}</strong></span>
      <span class="commit-sep">·</span>
      <span>🌿 <strong>{BRANCH}</strong></span>
      <span class="commit-sep">·</span>
      <span>🔖 <strong>{commit_short}</strong></span>
      <span class="commit-sep">·</span>
      <span>{FECHA}</span>
    </div>
  </div>
  <div class="header-divider-v"></div>
  <div class="header-badge-wrap">
    <span class="status-badge">{BADGE_TEXT}</span>
  </div>
</header>

<!-- ═══ NAV ══════════════════════════════════════════════════════════════ -->
<nav class="nav-bar">
  <a href="#resumen">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
    Resumen
  </a>
  <a href="#por-regla">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
    Por regla
  </a>
  <a href="#detalle-fallos" class="fail-link">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    Checks fallidos
    <span class="nav-count">{total_failed}</span>
  </a>
  <a href="#detalle-pasados" class="pass-link">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    Checks aprobados
    <span class="nav-count">{total_passed}</span>
  </a>
</nav>

<!-- ═══ CONTENIDO ════════════════════════════════════════════════════════ -->
<div class="container">

  <!-- Commit strip -->
  <div class="commit-strip">
    <div class="commit-item">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      Scan: <strong>{FECHA}</strong>
    </div>
    <span class="commit-sep">·</span>
    <div class="commit-item">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      Framework: <strong>CloudFormation / SAM</strong>
    </div>
    <span class="commit-sep">·</span>
    <div class="commit-item">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      Herramienta: <strong>Checkov 3.x</strong>
    </div>
    <a href="{RUN_URL}" target="_blank">Ver ejecución en GitHub Actions →</a>
  </div>

  <!-- ═══ RESUMEN ════════════════════════════════════════════════════ -->
  <section class="section" id="resumen">
    <div class="section-header">
      <h2>Resumen ejecutivo</h2>
    </div>
    <p class="section-desc">
      Checkov escaneó la infraestructura como código con CloudFormation/SAM y encontró
      <strong>{total_failed}</strong> checks fallidos y <strong>{total_passed}</strong> aprobados
      de un total de <strong>{total_checks}</strong> revisiones.
    </p>
    <div class="section-divider"></div>

    <div class="metrics-grid">
      <div class="metric m-red">
        <span class="metric-icon">🔴</span>
        <span class="metric-num c-red">{count_high}</span>
        <span class="metric-lbl">High severity</span>
      </div>
      <div class="metric m-amber">
        <span class="metric-icon">🟡</span>
        <span class="metric-num c-amber">{count_medium}</span>
        <span class="metric-lbl">Medium severity</span>
      </div>
      <div class="metric m-green">
        <span class="metric-icon">🟢</span>
        <span class="metric-num c-green">{count_low}</span>
        <span class="metric-lbl">Low severity</span>
      </div>
      <div class="metric m-red">
        <span class="metric-icon">❌</span>
        <span class="metric-num c-red">{total_failed}</span>
        <span class="metric-lbl">Checks fallidos</span>
      </div>
      <div class="metric m-green">
        <span class="metric-icon">✅</span>
        <span class="metric-num c-green">{total_passed}</span>
        <span class="metric-lbl">Checks aprobados</span>
      </div>
      <div class="metric m-accent">
        <span class="metric-icon">📊</span>
        <span class="metric-num c-accent">{total_checks}</span>
        <span class="metric-lbl">Total revisiones</span>
      </div>
    </div>

    <div class="progress-card">
      <div class="progress-header">
        <span class="progress-label">Tasa de aprobación del scan</span>
        <span class="progress-pct">{pass_pct}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:{pass_pct}%"></div>
      </div>
      <div class="progress-legend">
        <span><span class="legend-dot" style="background:var(--green)"></span>{total_passed} aprobados</span>
        <span><span class="legend-dot" style="background:var(--red)"></span>{total_failed} fallidos</span>
        <span><span class="legend-dot" style="background:var(--border2)"></span>{total_checks} total</span>
      </div>
    </div>
  </section>

  <!-- ═══ POR REGLA ═══════════════════════════════════════════════════ -->
  <section class="section" id="por-regla">
    <div class="section-header">
      <h2>Agrupación por regla</h2>
    </div>
    <p class="section-desc">
      Checks fallidos agrupados por ID de regla Checkov. El número indica cuántos
      recursos distintos fueron afectados por cada política de seguridad.
    </p>
    <div class="section-divider"></div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
          Resumen de reglas fallidas
        </div>
        <span style="font-size:11px;color:var(--text3);">{len(by_rule)} reglas distintas</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:100px">Severidad</th>
              <th style="width:150px">Check ID</th>
              <th>Descripción de la regla</th>
              <th style="width:80px;text-align:center">Recursos</th>
              <th>Recursos afectados</th>
            </tr>
          </thead>
          <tbody>
            {rule_summary_rows}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- ═══ FALLOS ══════════════════════════════════════════════════════ -->
  <section class="section" id="detalle-fallos">
    <div class="section-header">
      <h2>Detalle de checks fallidos</h2>
      <span style="font-size:12px;color:var(--text3);font-weight:600;margin-left:4px;">({total_failed} resultados)</span>
    </div>
    <p class="section-desc">
      Cada fila representa un recurso individual que no superó el check de seguridad.
      Incluye descripción del problema y solución recomendada.
    </p>
    <div class="section-divider"></div>

    {'<div class="card"><div class="empty-state"><span class="empty-icon">✨</span><p>No se encontraron checks fallidos</p><span>Todo el IaC cumple las políticas de seguridad de Checkov.</span></div></div>' if not failed_rows else f"""
    <div class="card">
      <div class="filter-bar">
        <span class="filter-lbl">Filtrar por severidad:</span>
        <button class="fbtn active"       onclick="filterTable('failed','ALL',this)">Todos <span style="opacity:.7">({total_failed})</span></button>
        <button class="fbtn btn-high"     onclick="filterTable('failed','error',this)">High <span style="opacity:.7">({count_high})</span></button>
        <button class="fbtn btn-medium"   onclick="filterTable('failed','warning',this)">Medium <span style="opacity:.7">({count_medium})</span></button>
        <button class="fbtn btn-low"      onclick="filterTable('failed','note',this)">Low <span style="opacity:.7">({count_low})</span></button>
      </div>
      <div class="table-wrap">
        <table id="table-failed">
          <thead>
            <tr>
              <th style="width:96px">Severidad</th>
              <th style="width:136px">Check ID</th>
              <th style="min-width:180px">Regla</th>
              <th style="min-width:160px">Recurso afectado</th>
              <th style="min-width:140px">Archivo / Línea</th>
              <th style="min-width:220px">Problema detectado</th>
              <th style="min-width:220px">Solución recomendada</th>
            </tr>
          </thead>
          <tbody>
            {failed_rows}
          </tbody>
        </table>
      </div>
    </div>"""}
  </section>

  <!-- ═══ APROBADOS ═══════════════════════════════════════════════════ -->
  <section class="section" id="detalle-pasados">
    <div class="section-header">
      <h2>Checks aprobados</h2>
      <span style="font-size:12px;color:var(--text3);font-weight:600;margin-left:4px;">({total_passed} resultados)</span>
    </div>
    <p class="section-desc">
      Recursos que superaron satisfactoriamente los checks de seguridad de Checkov.
    </p>
    <div class="section-divider"></div>

    {'<div class="card"><div class="empty-state"><span class="empty-icon">🔍</span><p>No hay resultados aprobados registrados</p><span>Revisa la configuración del SARIF o el resultado del scan.</span></div></div>' if not passed_rows else f"""
    <div class="card">
      <div class="table-wrap">
        <table id="table-passed">
          <thead>
            <tr>
              <th style="width:96px">Estado</th>
              <th style="width:136px">Check ID</th>
              <th>Regla</th>
              <th>Recurso</th>
              <th>Archivo / Línea</th>
            </tr>
          </thead>
          <tbody>
            {passed_rows}
          </tbody>
        </table>
      </div>
    </div>"""}
  </section>

</div><!-- /.container -->

<!-- ═══ FOOTER ══════════════════════════════════════════════════════════ -->
<footer>
  <div class="footer-brand">
    <div class="footer-brand-icon">🏗️</div>
    Checkov IaC Security Report · {REPO}
  </div>
  <span>
    <a href="https://www.checkov.io/" target="_blank">Checkov</a>
    &nbsp;·&nbsp;
    <a href="{RUN_URL}" target="_blank">GitHub Actions</a>
    &nbsp;·&nbsp;
    Generado automáticamente · {FECHA}
  </span>
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

os.makedirs(os.path.dirname(OUT) if os.path.dirname(OUT) else ".", exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

print(f"✅  {OUT} generado ({len(html):,} chars)")
print(f"    Fallos   → {count_high} HIGH, {count_medium} MEDIUM, {count_low} LOW  (total: {total_failed})")
print(f"    Aprobados→ {total_passed}")
print(f"    Total    → {total_checks}")
