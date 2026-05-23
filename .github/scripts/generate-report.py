#!/usr/bin/env python3
"""
generate-report.py
Genera el index.html del reporte de seguridad para GitHub Pages.
Lee los datos desde:
  - access-control-report.json  (resultados de Broken Access Control)
  - variables de entorno        (fecha, URL del run, badge, contadores)
"""
import os, json, sys

# ── Leer variables de entorno ─────────────────────────────────────────────────
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

# ── Leer JSON de access control ───────────────────────────────────────────────
data = {}
if os.path.exists(AC_JSON):
    with open(AC_JSON) as f:
        data = json.load(f)

fecha_gen = data.get("generado_en", "N/A")
resultados = data.get("resultados", {})

# ── Generar filas de la tabla de hallazgos ────────────────────────────────────
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
        detalle  = item.get("detalle", "")

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

# ── Generar resumen por rol ───────────────────────────────────────────────────
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

# ── Sección de hallazgos ──────────────────────────────────────────────────────
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
    .grid-4{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:20px}}
    .metric{{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;text-align:center}}
    .metric .num{{font-size:2.2rem;font-weight:700;display:block;margin-bottom:6px;line-height:1}}
    .metric .lbl{{font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:0.8px}}
    .metric.alert-critico{{border-color:#f85149;background:#f8514912}}
    .metric.alert-pass{{border-color:#3fb950;background:#3fb95012}}
    .num.pass{{color:#3fb950}} .num.fail{{color:#f85149}} .num.warn{{color:#e3b341}} .num.info{{color:#58a6ff}}
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
    .zap-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}}
    .zap-card{{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px}}
    .zap-card h3{{font-size:13px;color:#f0f6fc;margin-bottom:10px;font-weight:600;display:flex;align-items:center;gap:8px}}
    .zap-card p{{color:#8b949e;font-size:12px;margin-bottom:12px;line-height:1.6}}
    .role-badge{{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}}
    .role-admin{{background:#58a6ff22;color:#58a6ff;border:1px solid #58a6ff44}}
    .role-gerente{{background:#a371f722;color:#a371f7;border:1px solid #a371f744}}
    .role-chofer{{background:#3fb95022;color:#3fb950;border:1px solid #3fb95044}}
    .zap-links{{display:flex;flex-direction:column;gap:6px}}
    .zap-link{{display:block;padding:8px 12px;background:#21262d;border:1px solid #30363d;border-radius:5px;color:#58a6ff;font-size:12px;transition:background 0.15s}}
    .zap-link:hover{{background:#30363d;text-decoration:none}}
    .hallazgos-table td:first-child span{{display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600}}
    .riesgo-high{{background:#f8514933;color:#f85149}}
    .riesgo-medium{{background:#e3b34133;color:#e3b341}}
    .riesgo-low{{background:#3fb95022;color:#3fb950}}
    .empty-state{{text-align:center;padding:40px;color:#8b949e}}
    .empty-state .icon{{font-size:2.5rem;display:block;margin-bottom:10px}}
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
  <a href="#hallazgos-zap">⚠️ Hallazgos ZAP</a>
</nav>

<div class="container">

  <div class="meta">
    <span>Generado: <strong>{FECHA}</strong></span>
    <span>·</span>
    <span>Escaneo: <strong>{fecha_gen}</strong></span>
    <span>·</span>
    <a href="{RUN_URL}" target="_blank">Ver workflow en GitHub Actions →</a>
  </div>

  <!-- RESUMEN -->
  <section id="resumen">
    <h2>📊 Resumen ejecutivo</h2>
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
  </section>

  <!-- ACCESS CONTROL -->
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

  <!-- ZAP SCANS -->
  <section id="zap-scans">
    <h2>🛡️ Reportes de escaneo ZAP por rol</h2>
    <p style="color:#8b949e;font-size:13px;margin-bottom:16px">
      Cada reporte incluye pruebas de: SQL Injection · XSS · CORS · Path Traversal · SSRF · Security Headers · Integer Overflow
    </p>
    <div class="zap-grid">

      <div class="zap-card">
        <h3><span class="role-badge role-admin">ADMIN</span> Escaneo ROL ADMIN</h3>
        <p>Endpoints cubiertos: /camiones, /dashboard, /jornadas, /conductores, /contratos/vigentes, /unidades/disponibles, /gps/*, /auth/*</p>
        <div class="zap-links">
          <a class="zap-link" href="admin/reporte-ADMIN.html">📋 Ver reporte HTML completo</a>
          <a class="zap-link" href="admin/reporte-ADMIN-json.json">📄 Descargar JSON (CI/CD)</a>
        </div>
      </div>

      <div class="zap-card">
        <h3><span class="role-badge role-gerente">GERENTE</span> Escaneo ROL GERENTE</h3>
        <p>Endpoints cubiertos: /dashboard/gerencial, /jornadas, /conductores, /contratos, /unidades/disponibles, /auth/*</p>
        <div class="zap-links">
          <a class="zap-link" href="gerente/reporte-GERENTE.html">📋 Ver reporte HTML completo</a>
          <a class="zap-link" href="gerente/reporte-GERENTE-json.json">📄 Descargar JSON (CI/CD)</a>
        </div>
      </div>

      <div class="zap-card">
        <h3><span class="role-badge role-chofer">CHOFER</span> Escaneo ROL CHOFER</h3>
        <p>Endpoints cubiertos: /jornadas/actual/{{conductorId}}, /jornadas/iniciar, /jornadas/finalizar, /auth/*</p>
        <div class="zap-links">
          <a class="zap-link" href="chofer/reporte-CHOFER.html">📋 Ver reporte HTML completo</a>
          <a class="zap-link" href="chofer/reporte-CHOFER-json.json">📄 Descargar JSON (CI/CD)</a>
        </div>
      </div>

    </div>
  </section>

  <!-- HALLAZGOS ZAP -->
  <section id="hallazgos-zap">
    <h2>⚠️ Hallazgos detectados por ZAP</h2>
    <div class="card">
      <table class="hallazgos-table">
        <thead><tr>
          <th>Riesgo</th><th>Vulnerabilidad</th><th>CWE</th>
          <th>Endpoints afectados</th><th>Acción recomendada</th>
        </tr></thead>
        <tbody>
          <tr>
            <td><span class="riesgo-medium">🟠 Medium</span></td>
            <td><strong>Integer Overflow Error</strong></td>
            <td><code>CWE-190</code></td>
            <td><code>/jornadas/actual/{{conductorId}}</code><br><code>/jornadas/iniciar</code><br><code>/jornadas/finalizar</code></td>
            <td style="font-size:12px;color:#8b949e">Validar tamaño máximo de enteros antes de procesar. Input de 44+ dígitos causa HTTP 500.</td>
          </tr>
          <tr>
            <td><span class="riesgo-medium">🟠 Medium</span></td>
            <td><strong>CORS Misconfiguration</strong></td>
            <td><code>CWE-942</code></td>
            <td><code>/auth/forgot-password</code><br><code>/auth/forgot-password/confirm</code><br><code>/jornadas/finalizar</code></td>
            <td style="font-size:12px;color:#8b949e">El servidor acepta Origin de dominios arbitrarios. Configurar Access-Control-Allow-Origin con dominios específicos del frontend.</td>
          </tr>
          <tr>
            <td><span class="riesgo-medium">🟠 Medium</span></td>
            <td><strong>Cross-Domain (CORS *)</strong></td>
            <td><code>CWE-264</code></td>
            <td><code>/auth/me</code>, <code>/auth/login</code><br><code>/auth/forgot-password</code><br><code>/jornadas/actual/...</code></td>
            <td style="font-size:12px;color:#8b949e">Access-Control-Allow-Origin: * expone endpoints a cualquier dominio. Restringir a dominios del frontend en API Gateway.</td>
          </tr>
          <tr>
            <td><span class="riesgo-medium">🟠 Medium</span></td>
            <td><strong>Proxy Disclosure</strong></td>
            <td><code>CWE-204</code></td>
            <td><code>/auth/login</code><br><code>/auth/forgot-password</code></td>
            <td style="font-size:12px;color:#8b949e">CloudFront identificado como proxy via TRACE/OPTIONS. Deshabilitar métodos TRACE y TRACK en CloudFront.</td>
          </tr>
          <tr>
            <td><span class="riesgo-low">🟡 Low</span></td>
            <td><strong>HSTS no configurado</strong></td>
            <td><code>CWE-319</code></td>
            <td>Todos los endpoints</td>
            <td style="font-size:12px;color:#8b949e">Agregar: Strict-Transport-Security: max-age=31536000; includeSubDomains en API Gateway response headers.</td>
          </tr>
          <tr>
            <td><span class="riesgo-low">🟡 Low</span></td>
            <td><strong>X-Content-Type-Options faltante</strong></td>
            <td><code>CWE-693</code></td>
            <td><code>/auth/login</code><br><code>/auth/forgot-password</code></td>
            <td style="font-size:12px;color:#8b949e">Agregar: X-Content-Type-Options: nosniff en todas las respuestas de API Gateway.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

</div>

<footer>
  Nanutech Security Scan &nbsp;·&nbsp; OWASP ZAP 2.17.0 &nbsp;·&nbsp;
  Generado automáticamente con <a href="{RUN_URL}" target="_blank">GitHub Actions</a>
</footer>

</body>
</html>"""

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)
print(f"✅ {OUT} generado ({len(html)} chars)")
