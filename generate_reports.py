#!/usr/bin/env python3
"""
Generador de reportes HTML a partir de artifacts de GitHub Actions
"""

import json
import os
import shutil
from datetime import datetime

# ============================================================
# Configuración
# ============================================================

sprint = os.environ.get('SPRINT', datetime.now().strftime('%Y-%m'))
datetime_ = os.environ.get('DATETIME', datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC'))
run_id = os.environ.get('RUN_ID', 'unknown')
cov_pct = os.environ.get('COV_PCT', '0')
cov_stmt = os.environ.get('COV_STMT', '0')
cov_branch = os.environ.get('COV_BRANCH', '0')
cov_fn = os.environ.get('COV_FN', '0')
t_pass = os.environ.get('T_PASS', '0')
t_total = os.environ.get('T_TOTAL', '0')
vuln = os.environ.get('VULN', '0')
owner = os.environ.get('REPO_OWNER', '')
repo = os.environ.get('REPO_NAME', '')

base_url = f"https://{owner}.github.io/{repo}"
out_root = "docs"
reports_dir = f"{out_root}/reports/latest"
sprint_dir = f"{out_root}/sprints/{sprint}"

os.makedirs(reports_dir, exist_ok=True)
os.makedirs(sprint_dir, exist_ok=True)

# ============================================================
# Estilos CSS
# ============================================================

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0e27;color:#e2e8f0;padding:24px}
.container{max-width:1400px;margin:0 auto}
h1{font-size:28px;margin-bottom:8px}
h2{font-size:20px;margin:24px 0 16px}
.sub{color:#94a3b8;margin-bottom:24px;font-size:14px}
.stats{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:30px}
.stat-card{background:#1e293b;border-radius:16px;padding:20px 28px;text-align:center;min-width:140px}
.stat-number{font-size:36px;font-weight:800}
.stat-label{font-size:12px;color:#64748b;margin-top:6px;text-transform:uppercase}
.vuln-item,.issue-item{background:#1e293b;border-radius:12px;padding:16px;margin-bottom:12px;border-left:4px solid}
.vuln-critical{border-left-color:#ef4444}
.vuln-high{border-left-color:#f97316}
.vuln-medium{border-left-color:#eab308}
.vuln-low{border-left-color:#22c55e}
table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden}
th,td{padding:12px 16px;text-align:left;border-bottom:1px solid #334155}
th{background:#0f172a;color:#94a3b8;font-size:12px;text-transform:uppercase}
td{font-size:13px}
.coverage-bar{background:#334155;border-radius:10px;height:8px;width:120px;overflow:hidden}
.coverage-fill{background:#10b981;height:100%;border-radius:10px}
pre{background:#0f172a;padding:16px;border-radius:12px;overflow-x:auto;font-size:11px;margin-top:16px}
.back-link{display:inline-block;margin-bottom:20px;color:#60a5fa;text-decoration:none}
.back-link:hover{text-decoration:underline}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;margin-top:20px}
.report-card{background:#1e293b;border-radius:16px;padding:20px;text-decoration:none;color:#e2e8f0;transition:transform 0.2s}
.report-card:hover{transform:translateY(-3px);background:#243044}
.report-icon{font-size:40px;margin-bottom:12px}
.report-title{font-size:18px;font-weight:700;margin-bottom:6px}
.report-desc{font-size:12px;color:#64748b}
"""

# ============================================================
# Funciones helper
# ============================================================

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  ✅ {path}")

def page_template(title, icon, content):
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - NANUTECH</title>
    <style>{CSS}</style>
</head>
<body>
<div class="container">
    <a href="{base_url}/reports/latest/index.html" class="back-link">← Volver al Dashboard</a>
    <h1>{icon} {title}</h1>
    <div class="sub">Sprint {sprint} · Run #{run_id} · {datetime_}</div>
    {content}
</div>
</body>
</html>"""

# ============================================================
# 1. Reporte de Cobertura
# ============================================================

def generate_coverage_report():
    content = f"""
    <div class="stats">
        <div class="stat-card"><div class="stat-number">{cov_pct}%</div><div class="stat-label">Lines</div></div>
        <div class="stat-card"><div class="stat-number">{cov_stmt}%</div><div class="stat-label">Statements</div></div>
        <div class="stat-card"><div class="stat-number">{cov_branch}%</div><div class="stat-label">Branches</div></div>
        <div class="stat-card"><div class="stat-number">{cov_fn}%</div><div class="stat-label">Functions</div></div>
    </div>
    <div class="stats">
        <div class="stat-card"><div class="stat-number">{t_pass}/{t_total}</div><div class="stat-label">Tests</div></div>
        <div class="stat-card"><div class="stat-number">{vuln}</div><div class="stat-label">Vulnerabilities</div></div>
    </div>
    """
    
    # Intentar leer tabla de módulos del coverage-summary.json
    summary_paths = [
        "raw/coverage-report/coverage/coverage-summary.json",
        "raw/coverage-report/coverage-summary.json"
    ]
    
    table_rows = ""
    for path in summary_paths:
        if os.path.exists(path):
            with open(path) as f:
                data = json.load(f)
            for module, vals in data.items():
                if module == "total":
                    continue
                module_name = module.split("/")[-1].replace("functions/", "").replace("shared/", "")
                stmt = vals.get("statements", {}).get("pct", 0)
                branch = vals.get("branches", {}).get("pct", 0)
                func = vals.get("functions", {}).get("pct", 0)
                line = vals.get("lines", {}).get("pct", 0)
                table_rows += f"""
                <tr>
                    <td><code>{module_name}</code></td>
                    <td>{stmt}%</td>
                    <td>{branch}%</td>
                    <td>{func}%</td>
                    <td>{line}%</td>
                    <td><div class="coverage-bar"><div class="coverage-fill" style="width:{line}%"></div></div></td>
                </tr>"""
            break
    
    table = f"""
    <h2>📊 Cobertura por Módulo</h2>
    <table>
        <thead><tr><th>Módulo</th><th>Statements</th><th>Branches</th><th>Functions</th><th>Lines</th><th></th></tr></thead>
        <tbody>{table_rows if table_rows else '<tr><td colspan="6">No hay datos de módulos disponibles</td></tr>'}</tbody>
    </table>
    """
    
    write_file(f"{reports_dir}/coverage/index.html", page_template("Coverage Report", "📈", content + table))

# ============================================================
# 2. Reporte Snyk Dependencies
# ============================================================

def generate_snyk_deps_report():
    content = ""
    json_path = "raw/snyk-deps-results/snyk-deps.json"
    
    if os.path.exists(json_path):
        with open(json_path) as f:
            data = json.load(f)
        vulns = data.get("vulnerabilities", [])
        
        critical = sum(1 for v in vulns if v.get("severity") == "critical")
        high = sum(1 for v in vulns if v.get("severity") == "high")
        medium = sum(1 for v in vulns if v.get("severity") == "medium")
        
        content = f"""
        <div class="stats">
            <div class="stat-card"><div class="stat-number">{len(vulns)}</div><div class="stat-label">Total</div></div>
            <div class="stat-card"><div class="stat-number" style="color:#ef4444">{critical}</div><div class="stat-label">Critical</div></div>
            <div class="stat-card"><div class="stat-number" style="color:#f97316">{high}</div><div class="stat-label">High</div></div>
            <div class="stat-card"><div class="stat-number" style="color:#eab308">{medium}</div><div class="stat-label">Medium</div></div>
        </div>
        <h2>🔍 Vulnerabilidades encontradas</h2>
        """
        
        for v in vulns:
            sev = v.get("severity", "unknown")
            sev_class = f"vuln-{sev}" if sev in ["critical", "high", "medium", "low"] else "vuln-medium"
            content += f"""
            <div class="vuln-item {sev_class}">
                <strong>📦 {v.get('packageName', 'Unknown')}@{v.get('version', '?')}</strong>
                <span style="float:right;text-transform:uppercase;font-size:11px">{sev}</span>
                <div style="margin-top:8px;font-size:13px">{v.get('title', 'No description')}</div>
                <small style="color:#64748b">CVE: {v.get('identifiers', {}).get('CVE', ['N/A'])[0]}</small>
            </div>"""
        
        content += f"<details><summary>📄 Ver JSON completo</summary><pre>{json.dumps(data, indent=2)}</pre></details>"
    else:
        content = "<p style='color:#22c55e'>✅ No se encontraron vulnerabilidades en dependencias</p>"
    
    write_file(f"{reports_dir}/snyk-deps/index.html", page_template("Snyk Dependencies", "🔒", content))

# ============================================================
# 3. Reporte Snyk Code
# ============================================================

def generate_snyk_code_report():
    content = ""
    json_path = "raw/snyk-code-results/snyk-code.json"
    
    if os.path.exists(json_path):
        with open(json_path) as f:
            data = json.load(f)
        
        results = []
        for run in data.get("runs", []):
            results.extend(run.get("results", []))
        
        content = f"""
        <div class="stats">
            <div class="stat-card"><div class="stat-number">{len(results)}</div><div class="stat-label">Issues</div></div>
        </div>
        <h2>🔍 Hallazgos de código</h2>
        """
        
        for r in results:
            location = r.get("locations", [{}])[0].get("physicalLocation", {})
            uri = location.get("artifactLocation", {}).get("uri", "Unknown")
            msg = r.get("message", {}).get("text", "No message")
            level = r.get("level", "warning")
            level_class = "vuln-high" if level == "error" else "vuln-medium"
            content += f"""
            <div class="vuln-item {level_class}">
                <strong>📍 {uri}</strong>
                <div style="margin-top:6px;font-size:13px">{msg}</div>
            </div>"""
        
        content += f"<details><summary>📄 Ver JSON completo</summary><pre>{json.dumps(data, indent=2)}</pre></details>"
    else:
        content = "<p style='color:#22c55e'>✅ No se encontraron issues de código</p>"
    
    write_file(f"{reports_dir}/snyk-code/index.html", page_template("Snyk Code", "🔍", content))

# ============================================================
# 4. Reporte Snyk IaC
# ============================================================

def generate_snyk_iac_report():
    content = ""
    json_path = "raw/snyk-iac-results/snyk-iac.json"
    
    if os.path.exists(json_path):
        with open(json_path) as f:
            data = json.load(f)
        
        vulns = data.get("vulnerabilities", [])
        
        content = f"""
        <div class="stats">
            <div class="stat-card"><div class="stat-number">{len(vulns)}</div><div class="stat-label">Issues</div></div>
        </div>
        <h2>🏗️ Hallazgos de infraestructura</h2>
        """
        
        for v in vulns:
            content += f"""
            <div class="vuln-item vuln-high">
                <strong>{v.get('title', 'Unknown')}</strong>
                <div style="margin-top:6px;font-size:13px">{v.get('description', '')}</div>
                <small style="color:#64748b">Severity: {v.get('severity', 'unknown')}</small>
            </div>"""
        
        content += f"<details><summary>📄 Ver JSON completo</summary><pre>{json.dumps(data, indent=2)}</pre></details>"
    else:
        content = "<p style='color:#22c55e'>✅ No se encontraron issues de infraestructura</p>"
    
    write_file(f"{reports_dir}/snyk-iac/index.html", page_template("Snyk IaC", "🏗️", content))

# ============================================================
# 5. Reporte Security (npm audit)
# ============================================================

def generate_security_report():
    content = ""
    json_path = "raw/security-results/npm-audit.json"
    
    if os.path.exists(json_path):
        with open(json_path) as f:
            data = json.load(f)
        
        meta = data.get("metadata", {}).get("vulnerabilities", {})
        total = meta.get("total", 0)
        vulns = data.get("vulnerabilities", {})
        
        content = f"""
        <div class="stats">
            <div class="stat-card"><div class="stat-number">{total}</div><div class="stat-label">Total</div></div>
            <div class="stat-card"><div class="stat-number" style="color:#ef4444">{meta.get("critical", 0)}</div><div class="stat-label">Critical</div></div>
            <div class="stat-card"><div class="stat-number" style="color:#f97316">{meta.get("high", 0)}</div><div class="stat-label">High</div></div>
            <div class="stat-card"><div class="stat-number" style="color:#eab308">{meta.get("moderate", 0)}</div><div class="stat-label">Moderate</div></div>
        </div>
        <h2>🔍 Vulnerabilidades npm</h2>
        """
        
        for name, v in list(vulns.items())[:20]:
            content += f"""
            <div class="vuln-item vuln-medium">
                <strong>📦 {name}</strong>
                <div style="margin-top:6px;font-size:13px">{v.get('title', 'No description')}</div>
                <small style="color:#64748b">Severity: {v.get('severity', 'unknown')}</small>
            </div>"""
        
        content += f"<details><summary>📄 Ver JSON completo</summary><pre>{json.dumps(data, indent=2)}</pre></details>"
    else:
        content = "<p style='color:#22c55e'>✅ No se encontraron vulnerabilidades npm</p>"
    
    write_file(f"{reports_dir}/security/index.html", page_template("Security Report", "🛡️", content))

# ============================================================
# 6. Reporte Integration Tests
# ============================================================

def generate_integration_report():
    content = ""
    json_path = "raw/integration-test-results/integration-results.json"
    
    if os.path.exists(json_path):
        with open(json_path) as f:
            data = json.load(f)
        
        total = data.get("numTotalTests", 0)
        passed = data.get("numPassedTests", 0)
        failed = data.get("numFailedTests", 0)
        
        content = f"""
        <div class="stats">
            <div class="stat-card"><div class="stat-number">{total}</div><div class="stat-label">Total</div></div>
            <div class="stat-card"><div class="stat-number" style="color:#22c55e">{passed}</div><div class="stat-label">Passed</div></div>
            <div class="stat-card"><div class="stat-number" style="color:#ef4444">{failed}</div><div class="stat-label">Failed</div></div>
        </div>
        """
        
        # Mostrar resultados por suite
        for suite in data.get("testResults", []):
            content += f"<h3>📁 {suite.get('name', 'Unknown')}</h3>"
            for test in suite.get("assertionResults", []):
                status = test.get("status", "unknown")
                icon = "✅" if status == "passed" else "❌"
                color = "#22c55e" if status == "passed" else "#ef4444"
                content += f'<div style="padding:8px 0"><span style="color:{color}">{icon}</span> {test.get("title", "Unknown")}</div>'
        
        content += f"<details><summary>📄 Ver JSON completo</summary><pre>{json.dumps(data, indent=2)}</pre></details>"
    else:
        content = "<p>No hay datos de pruebas de integración disponibles</p>"
    
    write_file(f"{reports_dir}/integration/index.html", page_template("Integration Tests", "🔗", content))

# ============================================================
# 7. Dashboard Principal
# ============================================================

def generate_dashboard():
    cards = """
    <div class="grid">
        <a href="coverage/index.html" class="report-card">
            <div class="report-icon">📈</div>
            <div class="report-title">Coverage Report</div>
            <div class="report-desc">Cobertura de código por módulo</div>
        </a>
        <a href="snyk-deps/index.html" class="report-card">
            <div class="report-icon">🔒</div>
            <div class="report-title">Snyk Dependencies</div>
            <div class="report-desc">Vulnerabilidades en dependencias</div>
        </a>
        <a href="snyk-code/index.html" class="report-card">
            <div class="report-icon">🔍</div>
            <div class="report-title">Snyk Code (SAST)</div>
            <div class="report-desc">Análisis estático de código</div>
        </a>
        <a href="snyk-iac/index.html" class="report-card">
            <div class="report-icon">🏗️</div>
            <div class="report-title">Snyk IaC</div>
            <div class="report-desc">Infraestructura como código</div>
        </a>
        <a href="security/index.html" class="report-card">
            <div class="report-icon">🛡️</div>
            <div class="report-title">Security Report</div>
            <div class="report-desc">npm audit + Trivy</div>
        </a>
        <a href="integration/index.html" class="report-card">
            <div class="report-icon">🔗</div>
            <div class="report-title">Integration Tests</div>
            <div class="report-desc">Resultados de pruebas de integración</div>
        </a>
    </div>
    """
    
    dashboard = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NANUTECH Quality Dashboard</title>
    <style>{CSS}
    .header{{background:linear-gradient(135deg,#0f172a,#1e3a8a);border-radius:24px;padding:40px;margin-bottom:30px}}
    .header h1{{font-size:42px}}
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>🚛 NANUTECH Quality Dashboard</h1>
        <p>Sprint {sprint} · Run #{run_id} · {datetime_}</p>
    </div>
    
    <div class="stats">
        <div class="stat-card"><div class="stat-number">{cov_pct}%</div><div class="stat-label">Coverage</div></div>
        <div class="stat-card"><div class="stat-number">{t_pass}/{t_total}</div><div class="stat-label">Tests</div></div>
        <div class="stat-card"><div class="stat-number">{vuln}</div><div class="stat-label">Vulnerabilities</div></div>
    </div>
    
    <h2>📁 Reportes Disponibles</h2>
    {cards}
    
    <div style="margin-top:40px;padding:20px;text-align:center;color:#475569;border-top:1px solid #334155">
        Generado automáticamente por CI/CD Pipeline
    </div>
</div>
</body>
</html>"""
    
    write_file(f"{reports_dir}/index.html", dashboard)

# ============================================================
# 8. Redirects
# ============================================================

def generate_redirects():
    # Redirección del sprint
    write_file(f"{sprint_dir}/index.html", f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url={base_url}/reports/latest/index.html"></head>
<body><p>Redirigiendo al dashboard...</p></body></html>""")
    
    # Redirección principal
    write_file(f"{out_root}/index.html", f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url={base_url}/reports/latest/index.html"></head>
<body><p>Redirigiendo al dashboard...</p></body></html>""")

# ============================================================
# Main
# ============================================================

def main():
    print("\n" + "="*50)
    print("📊 Generando reportes HTML...")
    print("="*50)
    
    generate_coverage_report()
    generate_snyk_deps_report()
    generate_snyk_code_report()
    generate_snyk_iac_report()
    generate_security_report()
    generate_integration_report()
    generate_dashboard()
    generate_redirects()
    
    print("\n" + "="*50)
    print("✅ Reportes generados exitosamente!")
    print(f"📍 Dashboard: {base_url}/reports/latest/index.html")
    print("="*50 + "\n")

if __name__ == "__main__":
    main()
