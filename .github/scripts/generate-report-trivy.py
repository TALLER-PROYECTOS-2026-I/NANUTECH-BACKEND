#!/usr/bin/env python3
"""
generate-report-trivy.py  —  v1 Light Edition
Genera index.html del reporte Trivy (dependencias npm + secretos)
con paleta clara Lab2Next-inspired (blanco / índigo / slate).

Variables de entorno:
  TRIVY_FILE  → ruta al JSON de Trivy (default: trivy-output.json)
  OUT         → ruta del HTML generado (default: gh-pages-site/trivy/index.html)
  FECHA       → timestamp del scan
  RUN_URL     → URL de la ejecución en GitHub Actions
  REPO        → nombre del repositorio
  BRANCH      → rama escaneada
  COMMIT      → SHA del commit
"""

import os
import json
from collections import defaultdict

# ── Entorno ──────────────────────────────────────────────────────────────────
TRIVY_FILE = os.environ.get("TRIVY_FILE", "trivy-output.json")
OUT        = os.environ.get("OUT",        "gh-pages-site/trivy/index.html")
FECHA      = os.environ.get("FECHA",      "N/A")
RUN_URL    = os.environ.get("RUN_URL",    "#")
REPO       = os.environ.get("REPO",      "Nanutech")
BRANCH     = os.environ.get("BRANCH",    "—")
COMMIT     = os.environ.get("COMMIT",    "—")

# ── Paleta de severidad ──────────────────────────────────────────────────────
SEV_META = {
    "CRITICAL": ("CRITICAL", "sev-critical", "#7C3AED", "#F5F3FF", "#DDD6FE"),
    "HIGH":     ("HIGH",     "sev-high",     "#DC2626", "#FEF2F2", "#FECACA"),
    "MEDIUM":   ("MEDIUM",   "sev-medium",   "#D97706", "#FFFBEB", "#FDE68A"),
    "LOW":      ("LOW",      "sev-low",      "#059669", "#ECFDF5", "#A7F3D0"),
    "UNKNOWN":  ("UNKNOWN",  "sev-unknown",  "#94A3B8", "#F8FAFC", "#E2E8F0"),
}

# ── Leer JSON de Trivy ───────────────────────────────────────────────────────
def load_trivy(path):
    if not os.path.exists(path):
        print(f"⚠️  No se encontró {path} — reporte vacío")
        return []
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("Results", [])
    except (json.JSONDecodeError, IOError) as e:
        print(f"⚠️  Error leyendo Trivy JSON: {e}")
        return []

results = load_trivy(TRIVY_FILE)

# ── Separar vulnerabilidades y secretos ──────────────────────────────────────
vulns   = []   # CVEs en dependencias npm
secrets = []   # Secretos hardcodeados

for result in results:
    target = result.get("Target", "")
    cls    = result.get("Class", "")

    # Vulnerabilidades de paquetes
    for v in result.get("Vulnerabilities", []):
        sev = v.get("Severity", "UNKNOWN").upper()
        meta = SEV_META.get(sev, SEV_META["UNKNOWN"])
        cvss_score = ""
        cvss = v.get("CVSS", {})
        for source in ("nvd", "ghsa", "redhat"):
            if source in cvss:
                score = cvss[source].get("V3Score") or cvss[source].get("V2Score")
                if score:
                    cvss_score = str(score)
                    break
        refs = v.get("References", [])
        first_ref = refs[0] if refs else ""
        vulns.append({
            "id":        v.get("VulnerabilityID", ""),
            "pkg":       v.get("PkgName", ""),
            "installed": v.get("InstalledVersion", ""),
            "fixed":     v.get("FixedVersion", "—"),
            "sev":       sev,
            "sev_label": meta[0],
            "sev_class": meta[1],
            "sev_color": meta[2],
            "title":     v.get("Title", ""),
            "desc":      v.get("Description", ""),
            "cvss":      cvss_score,
            "ref":       first_ref,
            "target":    target,
        })

    # Secretos
    for s in result.get("Secrets", []):
        sev = s.get("Severity", "HIGH").upper()
        meta = SEV_META.get(sev, SEV_META["HIGH"])
        secrets.append({
            "rule_id":   s.get("RuleID", ""),
            "category":  s.get("Category", ""),
            "sev":       sev,
            "sev_label": meta[0],
            "sev_class": meta[1],
            "sev_color": meta[2],
            "title":     s.get("Title", ""),
            "file":      target,
            "start_ln":  str(s.get("StartLine", "")),
            "end_ln":    str(s.get("EndLine", "")),
            "match":     s.get("Match", "***REDACTED***"),
        })

# ── Estadísticas ──────────────────────────────────────────────────────────────
total_vulns   = len(vulns)
total_secrets = len(secrets)

count_critical = sum(1 for v in vulns if v["sev"] == "CRITICAL")
count_high     = sum(1 for v in vulns if v["sev"] == "HIGH")
count_medium   = sum(1 for v in vulns if v["sev"] == "MEDIUM")
count_low      = sum(1 for v in vulns if v["sev"] == "LOW")

# Paquetes únicos afectados
pkgs_affected  = len(set(v["pkg"] for v in vulns))

# Agrupar por paquete
by_pkg = defaultdict(list)
for v in vulns:
    by_pkg[v["pkg"]].append(v)

# Orden de severidad para badge global
if count_critical > 0:
    BADGE_TEXT = "CRITICAL"; BADGE_COLOR = "#7C3AED"; BADGE_BG = "#F5F3FF"; BADGE_BD = "#DDD6FE"
elif count_high > 0:
    BADGE_TEXT = "HIGH RISK"; BADGE_COLOR = "#DC2626"; BADGE_BG = "#FEF2F2"; BADGE_BD = "#FECACA"
elif count_medium > 0:
    BADGE_TEXT = "MEDIUM"; BADGE_COLOR = "#D97706"; BADGE_BG = "#FFFBEB"; BADGE_BD = "#FDE68A"
elif total_vulns > 0 or total_secrets > 0:
    BADGE_TEXT = "LOW RISK"; BADGE_COLOR = "#059669"; BADGE_BG = "#ECFDF5"; BADGE_BD = "#A7F3D0"
else:
    BADGE_TEXT = "CLEAN"; BADGE_COLOR = "#059669"; BADGE_BG = "#ECFDF5"; BADGE_BD = "#A7F3D0"

commit_short = COMMIT[:7] if len(COMMIT) > 7 else COMMIT

# ── Helpers HTML ──────────────────────────────────────────────────────────────
def sev_order(v):
    order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "UNKNOWN": 4}
    return order.get(v["sev"], 5)

vulns_sorted   = sorted(vulns, key=sev_order)
secrets_sorted = sorted(secrets, key=sev_order)

def build_vuln_rows(items):
    if not items:
        return ""
    rows = ""
    for v in items:
        cvss_html = (
            f'<span class="cvss-badge cvss-{"high" if float(v["cvss"]) >= 7 else "medium" if float(v["cvss"]) >= 4 else "low"}">'
            f'{v["cvss"]}</span>'
            if v["cvss"] else '<span class="text-muted">—</span>'
        )
        fixed_html = (
            f'<code class="fixed-tag">{v["fixed"]}</code>'
            if v["fixed"] and v["fixed"] != "—"
            else '<span class="text-muted no-fix">Sin fix</span>'
        )
        ref_html = f'<a href="{v["ref"]}" target="_blank" class="ref-link">Ver advisory →</a>' if v["ref"] else ""
        rows += f"""<tr data-sev="{v['sev']}" data-pkg="{v['pkg']}">
          <td><span class="{v['sev_class']}">{v['sev_label']}</span></td>
          <td><code class="vuln-id">{v['id']}</code></td>
          <td class="pkg-cell"><code class="pkg-tag">{v['pkg']}</code></td>
          <td><code class="version-tag installed">{v['installed']}</code></td>
          <td>{fixed_html}</td>
          <td>{cvss_html}</td>
          <td class="title-cell">{v['title']}<br>{ref_html}</td>
        </tr>\n"""
    return rows

def build_secret_rows(items):
    if not items:
        return ""
    rows = ""
    for s in items:
        lines = f"L{s['start_ln']}" if s["start_ln"] else "—"
        if s["end_ln"] and s["end_ln"] != s["start_ln"]:
            lines += f"–{s['end_ln']}"
        rows += f"""<tr data-sev="{s['sev']}">
          <td><span class="{s['sev_class']}">{s['sev_label']}</span></td>
          <td><code class="rule-id">{s['rule_id']}</code></td>
          <td class="pkg-cell">{s['category']}</td>
          <td class="title-cell">{s['title']}</td>
          <td><code class="file-tag">{s['file']}</code><br><span class="line-tag">{lines}</span></td>
          <td><code class="secret-match">{s['match']}</code></td>
        </tr>\n"""
    return rows

def build_pkg_summary():
    if not by_pkg:
        return '<tr><td colspan="5" class="empty-row">Sin vulnerabilidades detectadas ✅</td></tr>'
    rows = ""
    # Ordenar por severidad máxima
    def pkg_sev_key(item):
        _, vs = item
        sevs = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        return min(sevs.get(v["sev"], 4) for v in vs)

    for pkg, vs in sorted(by_pkg.items(), key=pkg_sev_key):
        worst      = sorted(vs, key=sev_order)[0]
        count      = len(vs)
        installed  = vs[0]["installed"]
        fixed_vers = sorted(set(v["fixed"] for v in vs if v["fixed"] != "—"))
        fix_str    = fixed_vers[0] if fixed_vers else "—"
        fix_html   = f'<code class="fixed-tag">{fix_str}</code>' if fix_str != "—" else '<span class="text-muted no-fix">Sin fix disponible</span>'
        ids        = ", ".join(v["id"] for v in vs[:3])
        if len(vs) > 3:
            ids += f" (+{len(vs)-3})"
        rows += f"""<tr>
          <td class="pkg-cell"><code class="pkg-tag">{pkg}</code></td>
          <td><span class="{worst['sev_class']}">{worst['sev_label']}</span></td>
          <td><code class="version-tag installed">{installed}</code></td>
          <td>{fix_html}</td>
          <td style="text-align:center"><span class="count-badge">{count}</span></td>
          <td class="ids-cell">{ids}</td>
        </tr>\n"""
    return rows

vuln_rows   = build_vuln_rows(vulns_sorted)
secret_rows = build_secret_rows(secrets_sorted)
pkg_rows    = build_pkg_summary()

# ─────────────────────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trivy Security Report — {REPO}</title>
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

      --red:          #DC2626;
      --red-bg:       #FEF2F2;
      --red-border:   #FECACA;
      --red-light:    #FEE2E2;

      --purple:       #7C3AED;
      --purple-bg:    #F5F3FF;
      --purple-border:#DDD6FE;
      --purple-light: #EDE9FE;

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
      --shadow-sm:    0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.05);
      --shadow:       0 4px 16px rgba(15,23,42,0.09);
      --header-h:     64px;
    }}

    html {{ scroll-behavior: smooth; scroll-padding-top: calc(var(--header-h) + 52px); }}
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

    /* ════════════════ HEADER ════════════════ */
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
      background: linear-gradient(135deg, var(--accent), #7C3AED);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      box-shadow: 0 2px 10px rgba(37,99,235,0.28);
      flex-shrink: 0;
    }}
    .header-title-wrap {{ display: flex; flex-direction: column; gap: 2px; }}
    .header-title {{ font-size: 14px; font-weight: 800; color: var(--slate); letter-spacing: -0.2px; }}
    .header-sub {{
      font-size: 11px; color: var(--text3);
      display: flex; gap: 10px; align-items: center;
      font-family: var(--mono);
    }}
    .header-sub strong {{ color: var(--text2); }}
    .header-divider-v {{ width: 1px; height: 20px; background: var(--border); }}
    .status-badge {{
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 14px; border-radius: 20px;
      font-size: 11px; font-weight: 800; letter-spacing: 1.5px;
      font-family: var(--mono);
      background: {BADGE_BG};
      color: {BADGE_COLOR};
      border: 1px solid {BADGE_BD};
      margin-left: auto;
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

    /* ════════════════ NAV ════════════════ */
    .nav-bar {{
      position: sticky; top: var(--header-h); z-index: 150;
      background: var(--bg2); border-bottom: 1px solid var(--border);
      padding: 0 32px; display: flex; gap: 0; overflow-x: auto;
      box-shadow: 0 1px 3px rgba(15,23,42,0.05);
    }}
    .nav-bar a {{
      display: inline-flex; align-items: center; gap: 7px;
      padding: 13px 18px; font-size: 12px; font-weight: 600;
      color: var(--text2); border-bottom: 2px solid transparent;
      text-decoration: none; white-space: nowrap; transition: all 0.14s;
    }}
    .nav-bar a:hover {{ color: var(--accent); border-bottom-color: var(--accent-mid); }}
    .nav-count {{
      padding: 1px 7px; border-radius: 10px; font-size: 10px;
      font-weight: 700; font-family: var(--mono);
      background: var(--bg3); border: 1px solid var(--border); color: var(--text3);
    }}
    .nav-count.nc-red    {{ background: var(--red-light);    color: var(--red);    border-color: var(--red-border); }}
    .nav-count.nc-purple {{ background: var(--purple-light); color: var(--purple); border-color: var(--purple-border); }}
    .nav-count.nc-amber  {{ background: var(--amber-bg);     color: var(--amber);  border-color: var(--amber-border); }}

    /* ════════════════ LAYOUT ════════════════ */
    .container {{ max-width: 1380px; margin: 0 auto; padding: 32px 28px 64px; }}

    /* ════════════════ SECTIONS ════════════════ */
    .section {{ margin-bottom: 48px; }}
    .section-header {{ display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }}
    .section-header h2 {{ font-size: 16px; font-weight: 800; color: var(--slate); letter-spacing: -0.3px; }}
    .section-tag {{
      font-size: 10px; font-weight: 700; padding: 2px 8px;
      border-radius: 4px; font-family: var(--mono);
      background: var(--accent-light); color: var(--accent); border: 1px solid var(--accent-mid);
    }}
    .section-desc {{ color: var(--text2); font-size: 12px; margin-bottom: 20px; line-height: 1.7; max-width: 680px; }}
    .section-divider {{ height: 1px; background: var(--border); margin: 0 0 20px; }}

    /* ════════════════ COMMIT STRIP ════════════════ */
    .commit-strip {{
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 14px 20px;
      display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
      margin-bottom: 28px; font-size: 11px; box-shadow: var(--shadow-sm);
    }}
    .commit-item {{ display: flex; align-items: center; gap: 5px; color: var(--text3); font-family: var(--mono); }}
    .commit-item strong {{ color: var(--text2); font-weight: 600; }}
    .commit-sep {{ color: var(--border2); }}
    .commit-strip a {{
      color: var(--accent); text-decoration: none; font-weight: 600;
      font-family: var(--mono); font-size: 11px; margin-left: auto;
    }}
    .commit-strip a:hover {{ text-decoration: underline; }}

    /* ════════════════ ALERT BANNER ════════════════ */
    .alert-banner {{
      display: flex; align-items: flex-start; gap: 12px;
      padding: 14px 18px; border-radius: var(--radius);
      margin-bottom: 28px; border: 1px solid;
    }}
    .alert-banner.alert-critical {{
      background: var(--purple-bg); border-color: var(--purple-border); color: var(--purple);
    }}
    .alert-banner.alert-high {{
      background: var(--red-bg); border-color: var(--red-border); color: var(--red);
    }}
    .alert-icon {{ font-size: 18px; flex-shrink: 0; margin-top: 1px; }}
    .alert-body {{ flex: 1; }}
    .alert-title {{ font-size: 13px; font-weight: 700; margin-bottom: 3px; }}
    .alert-desc {{ font-size: 12px; opacity: 0.85; line-height: 1.5; }}

    /* ════════════════ METRICS ════════════════ */
    .metrics-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
      gap: 12px; margin-bottom: 16px;
    }}
    .metric {{
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px 18px 18px;
      display: flex; flex-direction: column; gap: 6px;
      box-shadow: var(--shadow-sm); transition: box-shadow 0.15s;
      position: relative; overflow: hidden;
    }}
    .metric::after {{
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      border-radius: var(--radius) var(--radius) 0 0;
    }}
    .metric:hover {{ box-shadow: var(--shadow); }}
    .metric.m-critical {{ border-color: var(--purple-border); background: var(--purple-bg); }}
    .metric.m-critical::after {{ background: var(--purple); }}
    .metric.m-red    {{ border-color: var(--red-border);    background: var(--red-bg); }}
    .metric.m-red::after    {{ background: var(--red); }}
    .metric.m-amber  {{ border-color: var(--amber-border);  background: var(--amber-bg); }}
    .metric.m-amber::after  {{ background: var(--amber); }}
    .metric.m-green  {{ border-color: var(--green-border);  background: var(--green-bg); }}
    .metric.m-green::after  {{ background: var(--green); }}
    .metric.m-accent {{ border-color: var(--accent-mid);    background: var(--accent-light); }}
    .metric.m-accent::after {{ background: var(--accent); }}
    .metric-icon {{ font-size: 18px; line-height: 1; }}
    .metric-num {{
      font-size: 2.4rem; font-weight: 800; line-height: 1;
      font-family: var(--mono); letter-spacing: -2px;
    }}
    .metric-num.c-critical {{ color: var(--purple); }}
    .metric-num.c-red      {{ color: var(--red); }}
    .metric-num.c-amber    {{ color: var(--amber); }}
    .metric-num.c-green    {{ color: var(--green); }}
    .metric-num.c-accent   {{ color: var(--accent); }}
    .metric-num.c-slate    {{ color: var(--slate); }}
    .metric-lbl {{ font-size: 10px; color: var(--text2); text-transform: uppercase; letter-spacing: 0.7px; font-weight: 700; }}

    /* ════════════════ CARDS ════════════════ */
    .card {{ background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-sm); }}
    .card-header {{
      padding: 14px 20px; border-bottom: 1px solid var(--border);
      background: var(--bg3); display: flex; align-items: center; justify-content: space-between;
    }}
    .card-title {{ font-size: 13px; font-weight: 700; color: var(--slate); display: flex; align-items: center; gap: 8px; }}
    .card-subtitle {{ font-size: 11px; color: var(--text3); }}

    /* ════════════════ FILTER BAR ════════════════ */
    .filter-bar {{
      display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
      padding: 14px 20px; border-bottom: 1px solid var(--border); background: var(--bg2);
    }}
    .filter-lbl {{ font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: var(--text3); margin-right: 4px; }}
    .fbtn {{
      padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border);
      background: var(--bg3); color: var(--text2); cursor: pointer;
      font-size: 11px; font-weight: 700; font-family: var(--font); transition: all 0.13s;
    }}
    .fbtn:hover:not(.active) {{ background: var(--bg); border-color: var(--border2); color: var(--text); }}
    .fbtn.active          {{ background: var(--accent-light); border-color: var(--accent-mid); color: var(--accent); }}
    .fbtn.active.btn-crit {{ background: var(--purple-bg); border-color: var(--purple-border); color: var(--purple); }}
    .fbtn.active.btn-high {{ background: var(--red-bg);    border-color: var(--red-border);    color: var(--red); }}
    .fbtn.active.btn-med  {{ background: var(--amber-bg);  border-color: var(--amber-border);  color: var(--amber); }}
    .fbtn.active.btn-low  {{ background: var(--green-bg);  border-color: var(--green-border);  color: var(--green); }}

    /* ════════════════ TABLES ════════════════ */
    .table-wrap {{ overflow-x: auto; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
    th {{
      background: var(--bg3); color: var(--text3);
      padding: 9px 14px; text-align: left;
      font-weight: 700; font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.6px;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }}
    td {{ padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: top; background: var(--bg2); }}
    tr:last-child td {{ border-bottom: none; }}
    tr:hover td {{ background: var(--bg3); }}
    tr.hidden {{ display: none !important; }}
    .empty-row {{ text-align: center; color: var(--text3); padding: 40px 20px !important; font-size: 13px; background: var(--bg2) !important; }}
    .text-muted {{ color: var(--text4); font-size: 12px; }}

    /* ── Severity badges ── */
    .sev-critical {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--purple-bg); color:var(--purple); border:1px solid var(--purple-border); }}
    .sev-high     {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--red-bg);    color:var(--red);    border:1px solid var(--red-border); }}
    .sev-medium   {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--amber-bg);  color:var(--amber);  border:1px solid var(--amber-border); }}
    .sev-low      {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--green-bg);  color:var(--green);  border:1px solid var(--green-border); }}
    .sev-unknown  {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--bg3);       color:var(--text3);  border:1px solid var(--border); }}
    .sev-critical::before, .sev-high::before, .sev-medium::before, .sev-low::before {{
      content:''; width:5px; height:5px; border-radius:50%; flex-shrink:0;
    }}
    .sev-critical::before {{ background:var(--purple); }}
    .sev-high::before     {{ background:var(--red); }}
    .sev-medium::before   {{ background:var(--amber); }}
    .sev-low::before      {{ background:var(--green); }}

    /* ── Inline code elements ── */
    code {{ font-family: var(--mono); font-size: 11px; }}
    .vuln-id {{ background: var(--accent-light); color: var(--accent); border: 1px solid var(--accent-mid); padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 600; }}
    .rule-id  {{ background: var(--purple-bg); color: var(--purple); border: 1px solid var(--purple-border); padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 600; }}
    .pkg-tag  {{ background: var(--bg3); color: var(--slate2); border: 1px solid var(--border2); padding: 2px 7px; border-radius: 5px; font-weight: 600; }}
    .version-tag {{ padding: 2px 7px; border-radius: 5px; }}
    .version-tag.installed {{ background: var(--red-bg); color: var(--red); border: 1px solid var(--red-border); }}
    .fixed-tag {{ background: var(--green-bg); color: var(--green); border: 1px solid var(--green-border); padding: 2px 7px; border-radius: 5px; font-weight: 600; }}
    .no-fix {{ color: var(--text3); font-size: 11px; font-style: italic; }}
    .file-tag {{ background: var(--bg3); color: var(--text2); border: 1px solid var(--border); padding: 2px 7px; border-radius: 5px; }}
    .line-tag {{ color: var(--text3); font-size: 10px; font-family: var(--mono); }}
    .secret-match {{ background: var(--purple-bg); color: var(--purple); border: 1px solid var(--purple-border); padding: 2px 7px; border-radius: 5px; letter-spacing: 0.5px; }}
    .count-badge {{ background: var(--red-bg); color: var(--red); border: 1px solid var(--red-border); padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; font-family: var(--mono); }}
    .ref-link {{ color: var(--accent); font-size: 11px; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 3px; }}
    .ref-link:hover {{ text-decoration: underline; }}
    .cvss-badge {{ padding: 2px 8px; border-radius: 5px; font-weight: 700; font-family: var(--mono); font-size: 11px; }}
    .cvss-high   {{ background: var(--red-bg);   color: var(--red);   border: 1px solid var(--red-border); }}
    .cvss-medium {{ background: var(--amber-bg); color: var(--amber); border: 1px solid var(--amber-border); }}
    .cvss-low    {{ background: var(--green-bg); color: var(--green); border: 1px solid var(--green-border); }}

    /* ── Cell hints ── */
    .pkg-cell   {{ min-width: 140px; }}
    .title-cell {{ min-width: 220px; color: var(--text2); line-height: 1.55; }}
    .ids-cell   {{ font-size: 11px; color: var(--text3); font-family: var(--mono); min-width: 200px; }}

    /* ════════════════ EMPTY STATE ════════════════ */
    .empty-state {{ text-align: center; padding: 56px 32px; color: var(--text3); background: var(--bg2); }}
    .empty-icon  {{ font-size: 3rem; display: block; margin-bottom: 12px; }}
    .empty-state p {{ font-size: 14px; color: var(--text2); font-weight: 500; }}
    .empty-state span {{ font-size: 12px; color: var(--text3); display: block; margin-top: 4px; }}

    /* ════════════════ FOOTER ════════════════ */
    footer {{
      text-align: center; padding: 20px 32px; color: var(--text3);
      font-size: 11px; border-top: 1px solid var(--border); background: var(--bg2);
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
    }}
    footer a {{ color: var(--accent); text-decoration: none; font-weight: 600; }}
    footer a:hover {{ text-decoration: underline; }}
    .footer-brand {{ display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text2); }}
    .footer-brand-icon {{ width: 24px; height: 24px; background: linear-gradient(135deg, var(--accent), #7C3AED); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; }}

    @media (max-width: 768px) {{
      .container {{ padding: 20px 16px 48px; }}
      .metrics-grid {{ grid-template-columns: repeat(2, 1fr); }}
      header, .nav-bar {{ padding-left: 16px; padding-right: 16px; }}
    }}
  </style>
</head>
<body>

<!-- ═══ HEADER ══════════════════════════════════════════════════════════ -->
<header>
  <div class="header-icon">🔍</div>
  <div class="header-title-wrap">
    <div class="header-title">Trivy — Dependency Security Report</div>
    <div class="header-sub">
      <span>📦 <strong>{REPO}</strong></span>
      <span>·</span>
      <span>🌿 <strong>{BRANCH}</strong></span>
      <span>·</span>
      <span>🔖 <strong>{commit_short}</strong></span>
      <span>·</span>
      <span>{FECHA}</span>
    </div>
  </div>
  <div class="header-divider-v"></div>
  <span class="status-badge">{BADGE_TEXT}</span>
</header>

<!-- ═══ NAV ═════════════════════════════════════════════════════════════ -->
<nav class="nav-bar">
  <a href="#resumen">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
    Resumen
  </a>
  <a href="#por-paquete">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
    Por paquete
    <span class="nav-count nc-amber">{pkgs_affected}</span>
  </a>
  <a href="#vulnerabilidades">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    CVEs / Vulnerabilidades
    <span class="nav-count nc-red">{total_vulns}</span>
  </a>
  <a href="#secretos">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    Secretos detectados
    <span class="nav-count nc-purple">{total_secrets}</span>
  </a>
</nav>

<!-- ═══ CONTENIDO ═══════════════════════════════════════════════════════ -->
<div class="container">

  <!-- Commit strip -->
  <div class="commit-strip">
    <div class="commit-item">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      Scan: <strong>{FECHA}</strong>
    </div>
    <span class="commit-sep">·</span>
    <div class="commit-item">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      Objetivo: <strong>package-lock.json · src/</strong>
    </div>
    <span class="commit-sep">·</span>
    <div class="commit-item">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Escáner: <strong>Trivy vuln + secret</strong>
    </div>
    <a href="{RUN_URL}" target="_blank">Ver ejecución en GitHub Actions →</a>
  </div>

  {'<div class="alert-banner alert-critical"><span class="alert-icon">🚨</span><div class="alert-body"><div class="alert-title">Secretos hardcodeados detectados en el código</div><div class="alert-desc">Se encontraron ' + str(total_secrets) + ' secreto(s) en el repositorio. Rotar las credenciales inmediatamente y eliminarlas del historial de Git.</div></div></div>' if total_secrets > 0 else ''}

  <!-- ═══ RESUMEN ══════════════════════════════════════════════════ -->
  <section class="section" id="resumen">
    <div class="section-header">
      <h2>Resumen ejecutivo</h2>
      <span class="section-tag">npm · Node.js</span>
    </div>
    <p class="section-desc">
      Trivy escaneó las dependencias npm del proyecto buscando vulnerabilidades CVE
      y secretos hardcodeados en el código fuente. Se encontraron
      <strong>{total_vulns}</strong> vulnerabilidades en <strong>{pkgs_affected}</strong> paquetes
      y <strong>{total_secrets}</strong> secreto(s) detectado(s).
    </p>
    <div class="section-divider"></div>

    <div class="metrics-grid">
      <div class="metric m-critical">
        <span class="metric-icon">🟣</span>
        <span class="metric-num c-critical">{count_critical}</span>
        <span class="metric-lbl">Critical</span>
      </div>
      <div class="metric m-red">
        <span class="metric-icon">🔴</span>
        <span class="metric-num c-red">{count_high}</span>
        <span class="metric-lbl">High</span>
      </div>
      <div class="metric m-amber">
        <span class="metric-icon">🟡</span>
        <span class="metric-num c-amber">{count_medium}</span>
        <span class="metric-lbl">Medium</span>
      </div>
      <div class="metric m-green">
        <span class="metric-icon">🟢</span>
        <span class="metric-num c-green">{count_low}</span>
        <span class="metric-lbl">Low</span>
      </div>
      <div class="metric m-accent">
        <span class="metric-icon">📦</span>
        <span class="metric-num c-accent">{pkgs_affected}</span>
        <span class="metric-lbl">Paquetes afectados</span>
      </div>
      <div class="metric m-critical">
        <span class="metric-icon">🔑</span>
        <span class="metric-num c-critical">{total_secrets}</span>
        <span class="metric-lbl">Secretos</span>
      </div>
    </div>
  </section>

  <!-- ═══ POR PAQUETE ══════════════════════════════════════════════ -->
  <section class="section" id="por-paquete">
    <div class="section-header">
      <h2>Resumen por paquete</h2>
    </div>
    <p class="section-desc">
      Paquetes npm vulnerables agrupados con su peor severidad, versión instalada,
      versión con el fix disponible y cantidad de CVEs detectados.
    </p>
    <div class="section-divider"></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          Paquetes vulnerables
        </div>
        <span class="card-subtitle">{pkgs_affected} paquete(s) con vulnerabilidades</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Paquete</th>
              <th style="width:96px">Peor severidad</th>
              <th style="width:120px">Versión instalada</th>
              <th style="width:130px">Fix disponible</th>
              <th style="width:70px;text-align:center">CVEs</th>
              <th>IDs detectados</th>
            </tr>
          </thead>
          <tbody>{pkg_rows}</tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- ═══ VULNERABILIDADES ═════════════════════════════════════════ -->
  <section class="section" id="vulnerabilidades">
    <div class="section-header">
      <h2>Detalle de vulnerabilidades CVE</h2>
      <span style="font-size:12px;color:var(--text3);font-weight:600;margin-left:4px;">({total_vulns} resultados)</span>
    </div>
    <p class="section-desc">
      Cada fila es un CVE individual detectado en una dependencia npm.
      La columna CVSS indica la puntuación de severidad estándar (0–10).
      Actualiza al paquete a la versión indicada en "Fix disponible".
    </p>
    <div class="section-divider"></div>

    {'<div class="card"><div class="empty-state"><span class="empty-icon">✨</span><p>Sin vulnerabilidades CVE detectadas</p><span>Todas las dependencias npm están en versiones seguras.</span></div></div>' if not vuln_rows else f"""
    <div class="card">
      <div class="filter-bar">
        <span class="filter-lbl">Filtrar:</span>
        <button class="fbtn active"     onclick="filterVulns('ALL',this)">Todos ({total_vulns})</button>
        <button class="fbtn btn-crit"   onclick="filterVulns('CRITICAL',this)">Critical ({count_critical})</button>
        <button class="fbtn btn-high"   onclick="filterVulns('HIGH',this)">High ({count_high})</button>
        <button class="fbtn btn-med"    onclick="filterVulns('MEDIUM',this)">Medium ({count_medium})</button>
        <button class="fbtn btn-low"    onclick="filterVulns('LOW',this)">Low ({count_low})</button>
      </div>
      <div class="table-wrap">
        <table id="table-vulns">
          <thead>
            <tr>
              <th style="width:96px">Severidad</th>
              <th style="width:160px">CVE / ID</th>
              <th style="width:140px">Paquete</th>
              <th style="width:110px">Instalado</th>
              <th style="width:120px">Fix disponible</th>
              <th style="width:70px">CVSS</th>
              <th>Título del advisory</th>
            </tr>
          </thead>
          <tbody>{vuln_rows}</tbody>
        </table>
      </div>
    </div>"""}
  </section>

  <!-- ═══ SECRETOS ════════════════════════════════════════════════ -->
  <section class="section" id="secretos">
    <div class="section-header">
      <h2>Secretos detectados en código</h2>
      <span style="font-size:12px;color:var(--text3);font-weight:600;margin-left:4px;">({total_secrets} resultados)</span>
    </div>
    <p class="section-desc">
      Credenciales, API keys o tokens encontrados hardcodeados en el código fuente.
      <strong>Acción inmediata requerida:</strong> rotar las credenciales y eliminarlas del historial con <code>git filter-repo</code>.
    </p>
    <div class="section-divider"></div>

    {'<div class="card"><div class="empty-state"><span class="empty-icon">🔒</span><p>Sin secretos detectados</p><span>No se encontraron credenciales hardcodeadas en el código fuente.</span></div></div>' if not secret_rows else f"""
    <div class="card">
      <div class="table-wrap">
        <table id="table-secrets">
          <thead>
            <tr>
              <th style="width:96px">Severidad</th>
              <th style="width:160px">Regla</th>
              <th style="width:100px">Categoría</th>
              <th>Descripción</th>
              <th style="min-width:180px">Archivo / Línea</th>
              <th style="min-width:160px">Coincidencia</th>
            </tr>
          </thead>
          <tbody>{secret_rows}</tbody>
        </table>
      </div>
    </div>"""}
  </section>

</div>

<!-- ═══ FOOTER ══════════════════════════════════════════════════════════ -->
<footer>
  <div class="footer-brand">
    <div class="footer-brand-icon">🔍</div>
    Trivy Security Report · {REPO}
  </div>
  <span>
    <a href="https://aquasecurity.github.io/trivy/" target="_blank">Trivy by Aqua Security</a>
    &nbsp;·&nbsp;
    <a href="{RUN_URL}" target="_blank">GitHub Actions</a>
    &nbsp;·&nbsp;
    Generado automáticamente · {FECHA}
  </span>
</footer>

<script>
  function filterVulns(sev, btn) {{
    const table = document.getElementById('table-vulns');
    if (!table) return;
    table.querySelectorAll('tbody tr').forEach(row => {{
      row.classList.toggle('hidden', sev !== 'ALL' && row.dataset.sev !== sev);
    }});
    btn.closest('.filter-bar').querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }}
</script>
</body>
</html>"""

os.makedirs(os.path.dirname(OUT) if os.path.dirname(OUT) else ".", exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

print(f"✅  {OUT} generado ({len(html):,} chars)")
print(f"    CVEs     → {count_critical} CRITICAL, {count_high} HIGH, {count_medium} MEDIUM, {count_low} LOW  (total: {total_vulns})")
print(f"    Paquetes → {pkgs_affected} afectados")
print(f"    Secretos → {total_secrets}")
