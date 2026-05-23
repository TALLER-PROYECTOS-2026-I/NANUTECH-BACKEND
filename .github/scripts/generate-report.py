#!/usr/bin/env python3
"""
generate-report.py
Genera el index.html del reporte de seguridad para GitHub Pages.

Lee datos desde:
  - access-control-report.json     → resultados de Broken Access Control
  - reporte-ADMIN-json.json        → hallazgos ZAP del rol ADMIN
  - reporte-GERENTE-json.json      → hallazgos ZAP del rol GERENTE
  - reporte-CHOFER-json.json       → hallazgos ZAP del rol CHOFER
  - variables de entorno           → fecha, URL del run, badge, contadores

Estructura JSON de ZAP esperada:
  {
    "site": [
      {
        "@name": "https://...",
        "alerts": [
          {
            "name": "Cross Site Scripting",
            "riskcode": "3",        ← 3=High 2=Medium 1=Low 0=Info
            "riskdesc": "High (Medium)",
            "desc": "...",
            "solution": "...",
            "cweid": "79",
            "instances": [
              { "uri": "...", "method": "GET", "param": "", "evidence": "" }
            ],
            "count": "2"
          }
        ]
      }
    ]
  }
"""
import os
import json

# ── Variables de entorno ──────────────────────────────────────────────────────
FECHA       = os.environ.get("FECHA", "")
RUN_URL     = os.environ.get("RUN_URL", "#")
REPO        = os.environ.get("REPO", "Nanutech")
TOTAL       = os.environ.get("TOTAL", "0")
PASS_N      = os.environ.get("PASS_N", "0")
FAIL        = os.environ.get("FAIL", "0")
CRIT        = os.environ.get("CRIT", "0")
MENOR       = os.environ.get("MENOR", "0")
BADGE_TEXT  = os.environ.get("BADGE_TEXT", "SECURE")
BADGE_COLOR = os.environ.get("BADGE_COLOR", "238636")
BADGE_BD    = os.environ.get("BADGE_BD", "#3fb950")
AC_JSON     = os.environ.get("AC_JSON", "gh-pages-site/access-control-report.json")
OUT         = os.environ.get("OUT", "gh-pages-site/index.html")

# Rutas de los reportes JSON de ZAP por rol
ZAP_ADMIN_JSON   = os.environ.get("ZAP_ADMIN_JSON",   "gh-pages-site/admin/reporte-ADMIN-json.json")
ZAP_GERENTE_JSON = os.environ.get("ZAP_GERENTE_JSON", "gh-pages-site/gerente/reporte-GERENTE-json.json")
ZAP_CHOFER_JSON  = os.environ.get("ZAP_CHOFER_JSON",  "gh-pages-site/chofer/reporte-CHOFER-json.json")

# ── Mapeo riskcode → etiqueta visual ─────────────────────────────────────────
RISK_LABELS = {
    "3": ("🔴 High",   "riesgo-high"),
    "2": ("🟠 Medium", "riesgo-medium"),
    "1": ("🟡 Low",    "riesgo-low"),
    "0": ("🔵 Info",   "riesgo-info"),
}

# ── Leer JSON de access control ───────────────────────────────────────────────
ac_data = {}
if os.path.exists(AC_JSON):
    with open(AC_JSON, encoding="utf-8") as f:
        ac_data = json.load(f)

fecha_gen  = ac_data.get("generado_en", "N/A")
resultados = ac_data.get("resultados", {})

# ── Función: leer hallazgos de un reporte JSON de ZAP ────────────────────────
def load_zap_alerts(filepath):
    """
    Lee un reporte JSON de ZAP y devuelve una lista de alertas únicas.
    Cada alerta tiene: name, riskcode, riskdesc, desc, solution, cweid, instances.
    Deduplica por (name, cweid) para no repetir el mismo hallazgo.
    """
    if not os.path.exists(filepath):
        return []

    try:
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError):
        return []

    alerts = []
    seen   = set()

    sites = data.get("site", [])
    if not isinstance(sites, list):
        sites = [sites]

    for site in sites:
        for alert in site.get("alerts", []):
            key = (alert.get("name", ""), alert.get("cweid", ""))
            if key in seen:
                continue
            seen.add(key)
            alerts.append({
                "name":      alert.get("name", "Sin nombre"),
                "riskcode":  str(alert.get("riskcode", "0")),
                "riskdesc":  alert.get("riskdesc", "Info"),
                "desc":      alert.get("desc", ""),
                "solution":  alert.get("solution", ""),
                "cweid":     alert.get("cweid", ""),
                "count":     str(alert.get("count", "1")),
                "instances": alert.get("instances", []),
            })

    # Ordenar por riskcode descendente (High primero)
    alerts.sort(key=lambda a: int(a["riskcode"]) if a["riskcode"].isdigit() else 0, reverse=True)
    return alerts

# ── Función: construir tabla de hallazgos ZAP ─────────────────────────────────
def build_zap_table(alerts, rol_label):
    """
    Construye el HTML de la tabla de hallazgos para un rol específico.
    Si no hay alertas devuelve un estado vacío.
    """
    if not alerts:
        return f'''
        <div class="empty-state">
          <span class="icon">✅</span>
          <p>No se encontraron hallazgos en el escaneo ZAP para {rol_label},
             o el reporte aún no está disponible.</p>
        </div>'''

    rows = ""
    for alert in alerts:
        riskcode = alert["riskcode"]
        risk_label, risk_class = RISK_LABELS.get(riskcode, ("🔵 Info", "riesgo-info"))
        cwe = f'<code>CWE-{alert["cweid"]}</code>' if alert["cweid"] else "N/A"

        # Hasta 3 endpoints afectados para no sobrecargar la tabla
        instances = alert["instances"][:3]
        endpoints_html = "<br>".join(
            f'<code>{inst.get("method","?")} {inst.get("uri","?")}</code>'
            for inst in instances
        )
        if len(alert["instances"]) > 3:
            endpoints_html += f'<br><span style="color:#8b949e;font-size:11px">+{len(alert["instances"])-3} más</span>'

        # Solución truncada a 200 chars para la tabla
        solution = alert["solution"].replace("<p>", "").replace("</p>", " ").strip()
        solution = solution[:200] + "..." if len(solution) > 200 else solution

        rows += f'''
        <tr>
          <td><span class="{risk_class}">{risk_label}</span></td>
          <td><strong>{alert["name"]}</strong></td>
          <td>{cwe}</td>
          <td>{endpoints_html or "N/A"}</td>
          <td style="font-size:12px;color:#8b949e">{solution or "Ver reporte completo."}</td>
        </tr>'''

    return f'''
    <table class="hallazgos-table">
      <thead><tr>
        <th>Riesgo</th>
        <th>Vulnerabilidad</th>
        <th>CWE</th>
        <th>Endpoints afectados</th>
        <th>Acción recomendada</th>
      </tr></thead>
      <tbody>{rows}</tbody>
    </table>'''

# ── Cargar hallazgos de los 3 roles ──────────────────────────────────────────
alerts_admin   = load_zap_alerts(ZAP_ADMIN_JSON)
alerts_gerente = load_zap_alerts(ZAP_GERENTE_JSON)
alerts_chofer  = load_zap_alerts(ZAP_CHOFER_JSON)

# Contadores de hallazgos ZAP por severidad (todos los roles combinados)
all_alerts = alerts_admin + alerts_gerente + alerts_chofer
zap_high   = sum(1 for a in all_alerts if a["riskcode"] == "3")
zap_medium = sum(1 for a in all_alerts if a["riskcode"] == "2")
zap_low    = sum(1 for a in all_alerts if a["riskcode"] == "1")
zap_info   = sum(1 for a in all_alerts if a["riskcode"] == "0")
zap_total  = len(set((a["name"], a["cweid"]) for a in all_alerts))  # únicos globales

table_admin   = build_zap_table(alerts_admin,   "ROL ADMIN")
table_gerente = build_zap_table(alerts_gerente, "ROL GERENTE")
table_chofer  = build_zap_table(alerts_chofer,  "ROL CHOFER")

# ── Generar filas de la tabla de Access Control ───────────────────────────────
ac_rows = ""
for rol, items in resultados.items():
    for item in items:
        r = item.get("resultado", "")
        if r not in ("FAIL_CRITICO", "FAIL_MENOR"):
            continue
        method   = item.get("method", "")
        endpoint = item.get("endpoint", "")
        status   = item.get("http_status", "")
        roles_ok = item.get("roles_permitidos", "")
        nota     = item.get("nota", "")

        if r == "FAIL_CRITICO":
            row_class = "row-critico"
            tag = f'<span class="tag-critico">🚨 {status}</span>'
        else:
            row_class = "row-menor"
            tag = f'<span class="tag-menor">⚠️ {status}</span>'

        ac_rows += (
            f'<tr class="{row_class}">'
            f'<td><span class="tag-rol">{rol}</span></td>'
            f'<td><span class="method">{method}</span></td>'
            f'<td><code>{endpoint}</code></td>'
            f'<td>{tag}</td>'
            f'<td class="roles-ok">{roles_ok}</td>'
            f'<td style="font-size:12px;color:#8b949e">{nota}</td>'
            f'</tr>\n'
        )

# ── Generar resumen por rol (Access Control) ──────────────────────────────────
rol_summary = ""
for rol in ["ADMIN", "GERENTE", "CHOFER", "PUBLICO", "ANONIMO"]:
    items = resultados.get(rol, [])
    if not items:
        continue
    r_total = len(items)
    r_pass  = sum(1 for i in items if i.get("resultado") == "PASS")
    r_crit  = sum(1 for i in items if i.get("resultado") == "FAIL_CRITICO")
    r_menor = sum(1 for i in items if i.get("resultado") == "FAIL_MENOR")

    if r_crit > 0:
        icon = "🚨"; cls = "fail"
    elif r_menor > 0:
        icon = "⚠️"; cls = "warn"
    else:
        icon = "✅"; cls = "pass"

    rol_summary += (
        f'<tr>'
        f'<td><strong>{rol}</strong></td>'
        f'<td>{r_total}</td>'
        f'<td class="pass">{r_pass}</td>'
        f'<td class="fail">{r_crit}</td>'
        f'<td class="warn">{r_menor}</td>'
        f'<td class="{cls}">{icon}</td>'
        f'</tr>\n'
    )

if not rol_summary:
    rol_summary = '<tr><td colspan="6" style="text-align:center;color:#8b949e;padding:20px">No hay datos disponibles</td></tr>'

# ── Sección hallazgos Access Control ─────────────────────────────────────────
if ac_rows:
    ac_section = f"""
    <table>
      <thead><tr>
        <th>Rol</th><th>Método</th><th>Endpoint</th>
        <th>HTTP Recibido</th><th>Roles autorizados</th><th>Descripción</th>
      </tr></thead>
      <tbody>{ac_rows}</tbody>
    </table>"""
else:
    ac_section = '<div class="empty-state"><span class="icon">✅</span><p>No se detectaron vulnerabilidades de control de acceso.</p></div>'

# ── HTML completo ─────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nanutech — Security Report</title>
  <style>
    *{{margin:0;padding:0;box-sizing:border-box}}
    body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;font-size:14px}}
    a{{color:#58a6ff;text-decoration:none}} a:hover{{text-decoration:underline}}
    header{{background:#161b22;border-bottom:2px solid {BADGE_BD};padding:18px 40px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}}
    header h1{{font-size:1.3rem;color:#f0f6fc;font-weight:600}}
    .repo{{color:#8b949e;font-size:12px;margin-left:8px}}
    .badge{{background:#{BADGE_COLOR};color:#fff;padding:5px 14px;border-radius:20px;font-size:0.75rem;font-weight:700;letter-spacing:1.5px;margin-left:auto}}
    nav{{background:#161b22;border-bottom:1px solid #30363d;padding:0 40px;display:flex;gap:0;overflow-x:auto}}
    nav a{{color:#8b949e;padding:12px 16px;font-size:13px;border-bottom:2px solid transparent;display:block;white-space:nowrap}}
    nav a:hover{{color:#f0f6fc;border-bottom-color:#58a6ff;text-decoration:none}}
    .container{{max-width:1200px;margin:0 auto;padding:28px 24px}}
    .meta{{color:#8b949e;font-size:12px;margin-bottom:24px;display:flex;gap:20px;align-items:center;flex-wrap:wrap}}
    .meta strong{{color:#c9d1d9}}
    section{{margin-bottom:36px}}
    section > h2{{font-size:1rem;color:#f0f6fc;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #30363d;display:flex;align-items:center;gap:8px}}
    .grid-4{{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:20px}}
    .grid-5{{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}}
    .metric{{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;text-align:center}}
    .metric .num{{font-size:2.2rem;font-weight:700;display:block;margin-bottom:6px;line-height:1}}
    .metric .lbl{{font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:0.8px}}
    .metric.alert-critico{{border-color:#f85149;background:#f8514912}}
    .metric.alert-pass{{border-color:#3fb950;background:#3fb95012}}
    .metric.alert-high{{border-color:#f85149;background:#f8514908}}
    .metric.alert-medium{{border-color:#e3b341;background:#e3b34108}}
    .num.pass{{color:#3fb950}} .num.fail{{color:#f85149}} .num.warn{{color:#e3b341}} .num.info{{color:#58a6ff}} .num.gray{{color:#8b949e}}
    .card{{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;margin-bottom:16px}}
    .card-title{{font-size:13px;color:#f0f6fc;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:8px}}
    table{{width:100%;border-collapse:collapse;font-size:13px}}
    th{{background:#21262d;color:#8b949e;padding:9px 12px;text-align:left;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #30363d}}
    td{{padding:9px 12px;border-bottom:1px solid #21262d;vertical-align:middle}}
    tr:last-child td{{border-bottom:none}}
    tr.row-critico{{background:#f8514906}} tr.row-menor{{background:#e3b34106}}
    tr:hover td{{background:#21262d}}
    code{{background:#21262d;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12px;color:#79c0ff}}
    .tag-critico{{background:#f8514933;color:#f85149;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap}}
    .tag-menor{{background:#e3b34133;color:#e3b341;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap}}
    .tag-rol{{background:#21262d;color:#c9d1d9;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;border:1px solid #30363d}}
    .method{{background:#58a6ff22;color:#58a6ff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;font-family:monospace}}
    .roles-ok{{color:#8b949e;font-size:12px}}
    .pass{{color:#3fb950}} .fail{{color:#f85149}} .warn{{color:#e3b341}}
    .zap-section{{margin-bottom:24px}}
    .zap-section h3{{font-size:13px;color:#f0f6fc;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px;padding:10px 16px;background:#21262d;border-radius:6px;border-left:3px solid #58a6ff}}
    .zap-links{{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}}
    .zap-link{{display:inline-block;padding:6px 12px;background:#21262d;border:1px solid #30363d;border-radius:5px;color:#58a6ff;font-size:12px;transition:background 0.15s}}
    .zap-link:hover{{background:#30363d;text-decoration:none}}
    .hallazgos-table td:first-child span{{display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600}}
    .riesgo-high{{background:#f8514933;color:#f85149}}
    .riesgo-medium{{background:#e3b34133;color:#e3b341}}
    .riesgo-low{{background:#3fb95022;color:#3fb950}}
    .riesgo-info{{background:#58a6ff22;color:#58a6ff}}
    .role-badge{{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}}
    .role-admin{{background:#58a6ff22;color:#58a6ff;border:1px solid #58a6ff44}}
    .role-gerente{{background:#a371f722;color:#a371f7;border:1px solid #a371f744}}
    .role-chofer{{background:#3fb95022;color:#3fb950;border:1px solid #3fb95044}}
    .empty-state{{text-align:center;padding:40px;color:#8b949e}}
    .empty-state .icon{{font-size:2.5rem;display:block;margin-bottom:10px}}
    .tab-buttons{{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}}
    .tab-btn{{padding:7px 16px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#8b949e;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.15s}}
    .tab-btn.active{{background:#58a6ff22;border-color:#58a6ff;color:#58a6ff}}
    .tab-content{{display:none}} .tab-content.active{{display:block}}
    footer{{text-align:center;padding:20px;color:#8b949e;font-size:12px;border-top:1px solid #21262d;margin-top:40px}}
  </style>
</head>
<body>

<header>
  <h1>🔐 Nanutech Security Report</h1>
  <span class="repo">{REPO}</span>
  <span class="badge">{BADGE_TEXT}</span>
</header>

<nav>
  <a href="#resumen">📊 Resumen</a>
  <a href="#access-control">🔒 Access Control</a>
  <a href="#zap-scans">🛡️ ZAP Scans</a>
</nav>

<div class="container">

  <div class="meta">
    <span>Generado: <strong>{FECHA}</strong></span>
    <span>·</span>
    <span>Escaneo AC: <strong>{fecha_gen}</strong></span>
    <span>·</span>
    <a href="{RUN_URL}" target="_blank">Ver workflow en GitHub Actions →</a>
  </div>

  <!-- ═══════════════════════════════════════════════════════
       RESUMEN EJECUTIVO
  ══════════════════════════════════════════════════════════ -->
  <section id="resumen">
    <h2>📊 Resumen ejecutivo</h2>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title">🔒 Broken Access Control (OWASP A01)</div>
      <div class="grid-4">
        <div class="metric {'alert-critico' if int(CRIT) > 0 else ''}">
          <span class="num fail">{CRIT}</span>
          <span class="lbl">🚨 Críticos</span>
        </div>
        <div class="metric">
          <span class="num warn">{MENOR}</span>
          <span class="lbl">⚠️ Warnings</span>
        </div>
        <div class="metric alert-pass">
          <span class="num pass">{PASS_N}</span>
          <span class="lbl">✅ Pasadas</span>
        </div>
        <div class="metric">
          <span class="num info">{TOTAL}</span>
          <span class="lbl">Total pruebas</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🛡️ Hallazgos ZAP Active Scan (todos los roles)</div>
      <div class="grid-5">
        <div class="metric {'alert-high' if zap_high > 0 else ''}">
          <span class="num fail">{zap_high}</span>
          <span class="lbl">🔴 High</span>
        </div>
        <div class="metric {'alert-medium' if zap_medium > 0 else ''}">
          <span class="num warn">{zap_medium}</span>
          <span class="lbl">🟠 Medium</span>
        </div>
        <div class="metric">
          <span class="num pass">{zap_low}</span>
          <span class="lbl">🟡 Low</span>
        </div>
        <div class="metric">
          <span class="num info">{zap_info}</span>
          <span class="lbl">🔵 Info</span>
        </div>
        <div class="metric">
          <span class="num gray">{zap_total}</span>
          <span class="lbl">Únicos</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══════════════════════════════════════════════════════
       ACCESS CONTROL
  ══════════════════════════════════════════════════════════ -->
  <section id="access-control">
    <h2>🔒 Broken Access Control — OWASP A01</h2>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Resultado por rol</div>
      <table>
        <thead><tr>
          <th>Rol</th><th>Total pruebas</th><th>Pasadas</th>
          <th>Críticos</th><th>Warnings</th><th>Estado</th>
        </tr></thead>
        <tbody>{rol_summary}</tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-title">Detalle de hallazgos por endpoint</div>
      {ac_section}
    </div>
  </section>

  <!-- ═══════════════════════════════════════════════════════
       ZAP SCANS — hallazgos dinámicos por rol
  ══════════════════════════════════════════════════════════ -->
  <section id="zap-scans">
    <h2>🛡️ Hallazgos ZAP Active Scan por rol</h2>
    <p style="color:#8b949e;font-size:13px;margin-bottom:20px">
      Vulnerabilidades técnicas detectadas por OWASP ZAP en el active scan.
      Incluye: SQL Injection · XSS · CORS · Path Traversal · SSRF · Security Headers · Integer Overflow.
      Los hallazgos se leen directamente de los reportes JSON generados por ZAP en cada ejecución.
    </p>

    <div class="tab-buttons">
      <button class="tab-btn active" onclick="showTab('admin')">
        <span class="role-badge role-admin">ADMIN</span>&nbsp;
        {len(alerts_admin)} hallazgo{"s" if len(alerts_admin) != 1 else ""}
      </button>
      <button class="tab-btn" onclick="showTab('gerente')">
        <span class="role-badge role-gerente">GERENTE</span>&nbsp;
        {len(alerts_gerente)} hallazgo{"s" if len(alerts_gerente) != 1 else ""}
      </button>
      <button class="tab-btn" onclick="showTab('chofer')">
        <span class="role-badge role-chofer">CHOFER</span>&nbsp;
        {len(alerts_chofer)} hallazgo{"s" if len(alerts_chofer) != 1 else ""}
      </button>
    </div>

    <!-- TAB ADMIN -->
    <div id="tab-admin" class="tab-content active">
      <div class="card">
        <div class="card-title">
          <span class="role-badge role-admin">ADMIN</span>
          Endpoints escaneados: /camiones, /dashboard, /jornadas, /conductores,
          /contratos/vigentes, /unidades/disponibles, /gps/*, /alertas/*, /auth/*
        </div>
        <div class="zap-links">
          <a class="zap-link" href="admin/reporte-ADMIN.html">📋 Reporte HTML completo</a>
          <a class="zap-link" href="admin/reporte-ADMIN-json.json">📄 JSON raw (CI/CD)</a>
        </div>
        {table_admin}
      </div>
    </div>

    <!-- TAB GERENTE -->
    <div id="tab-gerente" class="tab-content">
      <div class="card">
        <div class="card-title">
          <span class="role-badge role-gerente">GERENTE</span>
          Endpoints escaneados: /dashboard/gerencial, /jornadas, /conductores,
          /contratos, /unidades/disponibles, /alertas/*, /auth/*
        </div>
        <div class="zap-links">
          <a class="zap-link" href="gerente/reporte-GERENTE.html">📋 Reporte HTML completo</a>
          <a class="zap-link" href="gerente/reporte-GERENTE-json.json">📄 JSON raw (CI/CD)</a>
        </div>
        {table_gerente}
      </div>
    </div>

    <!-- TAB CHOFER -->
    <div id="tab-chofer" class="tab-content">
      <div class="card">
        <div class="card-title">
          <span class="role-badge role-chofer">CHOFER</span>
          Endpoints escaneados: /jornadas/actual/{{conductorId}},
          /jornadas/iniciar, /jornadas/finalizar, /alertas/sos, /alertas/auxilio, /auth/*
        </div>
        <div class="zap-links">
          <a class="zap-link" href="chofer/reporte-CHOFER.html">📋 Reporte HTML completo</a>
          <a class="zap-link" href="chofer/reporte-CHOFER-json.json">📄 JSON raw (CI/CD)</a>
        </div>
        {table_chofer}
      </div>
    </div>

  </section>

</div>

<footer>
  Nanutech Security Scan &nbsp;·&nbsp; OWASP ZAP &nbsp;·&nbsp;
  Generado automáticamente con
  <a href="{RUN_URL}" target="_blank">GitHub Actions</a>
</footer>

<script>
  function showTab(rol) {{
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + rol).classList.add('active');
    event.currentTarget.classList.add('active');
  }}
</script>

</body>
</html>"""

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)
print(f"✅ {OUT} generado ({len(html):,} chars)")
print(f"   Access Control → {CRIT} críticos, {MENOR} warnings, {PASS_N}/{TOTAL} pasadas")
print(f"   ZAP hallazgos  → {zap_high} High, {zap_medium} Medium, {zap_low} Low, {zap_info} Info ({zap_total} únicos)")
