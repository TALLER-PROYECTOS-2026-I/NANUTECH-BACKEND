#!/usr/bin/env python3
"""
generate-report.py  — v2 Light Edition
Mismo comportamiento funcional, diseño completamente renovado.
Paleta: blanco/índigo/slate (Lab2Next-inspired).
100% responsive. Severidades con colores semánticos.
"""
import os, json, sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _SCRIPT_DIR)
try:
    from zap_translations import ZAP_TRANSLATIONS, ZAP_TRANSLATIONS_BY_NAME, translate_alert
except ImportError:
    ZAP_TRANSLATIONS = {}
    ZAP_TRANSLATIONS_BY_NAME = {}
    def translate_alert(plugin_id, name): return None

# ── Entorno ───────────────────────────────────────────────────────────────────
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
ZAP_ADMIN_JSON   = os.environ.get("ZAP_ADMIN_JSON",   "gh-pages-site/admin/reporte-ADMIN-json.json")
ZAP_GERENTE_JSON = os.environ.get("ZAP_GERENTE_JSON", "gh-pages-site/gerente/reporte-GERENTE-json.json")
ZAP_CHOFER_JSON  = os.environ.get("ZAP_CHOFER_JSON",  "gh-pages-site/chofer/reporte-CHOFER-json.json")

RISK_LABELS = {
    "3": ("HIGH",   "sev-high"),
    "2": ("MEDIUM", "sev-medium"),
    "1": ("LOW",    "sev-low"),
    "0": ("INFO",   "sev-info"),
}

# ── Badge global según BADGE_COLOR env ───────────────────────────────────────
_bc = BADGE_COLOR.lstrip("#").lower()
if _bc in ("f85149", "dc2626", "b91c1c"):
    _GLOBAL_BG = "#FEF2F2"; _GLOBAL_BD = "#FECACA"; _GLOBAL_TC = "#DC2626"
elif _bc in ("e3b341", "d97706", "f59e0b"):
    _GLOBAL_BG = "#FFFBEB"; _GLOBAL_BD = "#FDE68A"; _GLOBAL_TC = "#D97706"
else:
    _GLOBAL_BG = "#ECFDF5"; _GLOBAL_BD = "#A7F3D0"; _GLOBAL_TC = "#059669"

# ── Leer JSON AC ──────────────────────────────────────────────────────────────
ac_data = {}
if os.path.exists(AC_JSON):
    with open(AC_JSON, encoding="utf-8") as f:
        ac_data = json.load(f)
fecha_gen  = ac_data.get("generado_en", "N/A")
resultados = ac_data.get("resultados", {})

# ── Cargar alertas ZAP ────────────────────────────────────────────────────────
def load_zap_alerts(filepath):
    if not os.path.exists(filepath): return []
    try:
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
    except: return []
    alerts = []; seen = set()
    sites = data.get("site", [])
    if not isinstance(sites, list): sites = [sites]
    for site in sites:
        for alert in site.get("alerts", []):
            key = (alert.get("name",""), alert.get("cweid",""))
            if key in seen: continue
            seen.add(key)
            alerts.append({
                "name":      alert.get("name","Sin nombre"),
                "riskcode":  str(alert.get("riskcode","0")),
                "riskdesc":  alert.get("riskdesc","Info"),
                "desc":      alert.get("desc",""),
                "solution":  alert.get("solution",""),
                "cweid":     alert.get("cweid",""),
                "count":     str(alert.get("count","1")),
                "instances": alert.get("instances",[]),
                "pluginid":  str(alert.get("pluginid","")),
                "alertRef":  str(alert.get("alertRef","")),
            })
    alerts.sort(key=lambda a: int(a["riskcode"]) if a["riskcode"].isdigit() else 0, reverse=True)
    return alerts

def get_translated_field(alert, field, original_value):
    plugin_id = str(alert.get("pluginid", alert.get("alertRef","")))
    name      = alert.get("name","")
    t = translate_alert(plugin_id, name)
    if t and field in t and t[field]: return t[field]
    if original_value:
        return original_value.replace("<p>","").replace("</p>"," ").strip()
    return ""

def get_translated_name(alert):
    plugin_id = str(alert.get("pluginid", alert.get("alertRef","")))
    t = translate_alert(plugin_id, alert.get("name",""))
    if t and t.get("name"): return t["name"]
    return alert.get("name","")

def build_zap_table(alerts, rol_label):
    if not alerts:
        return f'<div class="empty-state"><span class="empty-icon">✅</span><p>Sin hallazgos para {rol_label}</p><span>El escaneo ZAP no detectó vulnerabilidades.</span></div>'
    rows = ""
    for alert in alerts:
        rc = alert["riskcode"]
        sev_label, sev_class = RISK_LABELS.get(rc, ("INFO","sev-info"))
        cwe = f'<code class="cwe-tag">CWE-{alert["cweid"]}</code>' if alert["cweid"] else "—"
        name_es = get_translated_name(alert)
        instances = alert["instances"][:3]
        eps_html = "<br>".join(
            f'<code class="ep-tag">{i.get("method","?")} {i.get("uri","?")[:60]}</code>'
            for i in instances
        )
        if len(alert["instances"]) > 3:
            eps_html += f'<br><span class="more-tag">+{len(alert["instances"])-3} más</span>'
        desc_es  = get_translated_field(alert, "description", alert.get("desc",""))
        desc_s   = desc_es[:280]+"…" if len(desc_es)>280 else desc_es
        sol_es   = get_translated_field(alert, "solution", alert.get("solution",""))
        sol_s    = sol_es[:240]+"…" if len(sol_es)>240 else sol_es
        plugin_id = str(alert.get("pluginid", alert.get("alertRef","")))
        t_av = translate_alert(plugin_id, alert.get("name","")) is not None
        lang = '<span class="lang-badge lang-es">ES</span>' if t_av else '<span class="lang-badge lang-en">EN</span>'
        rows += f"""<tr data-risk="{rc}">
          <td><span class="{sev_class}">{sev_label}</span></td>
          <td><span class="alert-name">{name_es}</span>{lang}</td>
          <td>{cwe}</td>
          <td class="ep-cell">{eps_html or "—"}</td>
          <td class="desc-cell">{desc_s or "—"}</td>
          <td class="sol-cell">{sol_s or "—"}</td>
        </tr>\n"""
    return f"""<div class="table-wrap"><table class="data-table" id="zap-table">
      <thead><tr>
        <th style="width:88px">Severidad</th>
        <th style="min-width:180px">Vulnerabilidad</th>
        <th style="width:110px">CWE</th>
        <th style="min-width:180px">Endpoints</th>
        <th style="min-width:220px">Descripción</th>
        <th style="min-width:200px">Solución</th>
      </tr></thead>
      <tbody>{rows}</tbody>
    </table></div>"""

alerts_admin   = load_zap_alerts(ZAP_ADMIN_JSON)
alerts_gerente = load_zap_alerts(ZAP_GERENTE_JSON)
alerts_chofer  = load_zap_alerts(ZAP_CHOFER_JSON)
all_alerts = alerts_admin + alerts_gerente + alerts_chofer
zap_high   = sum(1 for a in all_alerts if a["riskcode"]=="3")
zap_medium = sum(1 for a in all_alerts if a["riskcode"]=="2")
zap_low    = sum(1 for a in all_alerts if a["riskcode"]=="1")
zap_info   = sum(1 for a in all_alerts if a["riskcode"]=="0")
zap_total  = len(set((a["name"],a["cweid"]) for a in all_alerts))

table_admin   = build_zap_table(alerts_admin,   "ROL ADMIN")
table_gerente = build_zap_table(alerts_gerente, "ROL GERENTE")
table_chofer  = build_zap_table(alerts_chofer,  "ROL CHOFER")

# ── Access Control ────────────────────────────────────────────────────────────
ROLES_AC = ["ADMIN","GERENTE","CHOFER","ANONIMO","PUBLICO"]
ROLE_META = {
    "ADMIN":   ("role-admin",   "A"),
    "GERENTE": ("role-gerente", "G"),
    "CHOFER":  ("role-chofer",  "C"),
    "ANONIMO": ("role-anonimo", "?"),
    "PUBLICO": ("role-publico", "P"),
}

def resultado_badge(r, status):
    if r=="PASS":        return f'<span class="st-pass">✓ {status}</span>'
    elif r=="FAIL_CRITICO": return f'<span class="st-crit">✗ {status}</span>'
    else:                return f'<span class="st-warn">⚠ {status}</span>'

def build_ac_tab(rol):
    items = resultados.get(rol,[])
    if not items:
        return '<div class="empty-state"><span class="empty-icon">🔍</span><p>Sin pruebas registradas</p><span>No hay datos para este rol.</span></div>'
    total  = len(items)
    passed = sum(1 for i in items if i.get("resultado")=="PASS")
    crits  = sum(1 for i in items if i.get("resultado")=="FAIL_CRITICO")
    warns  = sum(1 for i in items if i.get("resultado")=="FAIL_MENOR")
    summary = f"""<div class="rol-summary">
      <div class="rol-stat"><span class="rs-num c-slate">{total}</span><span class="rs-lbl">Total</span></div>
      <div class="rol-stat rs-pass"><span class="rs-num c-green">{passed}</span><span class="rs-lbl">Pasadas</span></div>
      <div class="rol-stat rs-crit"><span class="rs-num c-red">{crits}</span><span class="rs-lbl">Críticos</span></div>
      <div class="rol-stat rs-warn"><span class="rs-num c-amber">{warns}</span><span class="rs-lbl">Warnings</span></div>
    </div>"""
    filters = f"""<div class="filter-bar">
      <span class="filter-lbl">Filtrar:</span>
      <button class="fbtn active" onclick="filterAC('{rol}','ALL',this)">Todos ({total})</button>
      <button class="fbtn fbtn-pass" onclick="filterAC('{rol}','PASS',this)">Pasadas ({passed})</button>
      <button class="fbtn fbtn-crit" onclick="filterAC('{rol}','FAIL_CRITICO',this)">Críticos ({crits})</button>
      <button class="fbtn fbtn-warn" onclick="filterAC('{rol}','FAIL_MENOR',this)">Warnings ({warns})</button>
    </div>"""
    rows = ""
    for item in items:
        r        = item.get("resultado","PASS")
        method   = item.get("method","")
        endpoint = item.get("endpoint","")
        expected = item.get("expected","")
        status   = item.get("http_status","")
        roles_ok = item.get("roles_permitidos","")
        nota     = item.get("nota","")
        detalle  = item.get("detalle","")
        st_badge = resultado_badge(r, status)
        if expected=="200":   exp_b='<span class="exp-200">→ 2xx</span>'
        elif expected=="403": exp_b='<span class="exp-403">→ 401/403</span>'
        else:                 exp_b='<span class="exp-pub">Público</span>'
        desc = nota if nota else ("Acceso correcto." if r=="PASS" else "")
        if detalle and r!="PASS": desc += f'<span class="detail-note">{detalle}</span>'
        row_c = {"PASS":"row-pass","FAIL_CRITICO":"row-crit","FAIL_MENOR":"row-warn"}.get(r,"")
        rows += f"""<tr class="{row_c}" data-resultado="{r}">
          <td><span class="method-badge">{method}</span></td>
          <td><code class="ep-mono">{endpoint}</code></td>
          <td>{exp_b}</td>
          <td>{st_badge}</td>
          <td class="desc-cell">{desc}</td>
          <td class="roles-cell">{roles_ok}</td>
        </tr>\n"""
    table = f"""<div class="table-wrap"><table class="data-table" id="ac-table-{rol}">
      <thead><tr>
        <th>Método</th><th>Endpoint</th><th>Esperado</th>
        <th>HTTP Real</th><th>Descripción</th><th>Roles autorizados</th>
      </tr></thead>
      <tbody>{rows}</tbody>
    </table></div>"""
    return summary + filters + table

# Construir tabs AC
ac_tab_btns = ""; ac_tab_contents = ""
for i, rol in enumerate(ROLES_AC):
    items  = resultados.get(rol,[])
    total  = len(items)
    crits  = sum(1 for x in items if x.get("resultado")=="FAIL_CRITICO")
    warns  = sum(1 for x in items if x.get("resultado")=="FAIL_MENOR")
    cls, _ = ROLE_META.get(rol,("role-admin","?"))
    active_btn = "active" if i==0 else ""
    active_tab = "active" if i==0 else ""
    dot = ('<span class="status-dot dot-crit"></span>' if crits>0
           else '<span class="status-dot dot-warn"></span>' if warns>0
           else '<span class="status-dot dot-pass"></span>' if total>0 else "")
    ac_tab_btns += f'<button class="tab-btn {active_btn}" onclick="showACTab(\'{rol}\',this)"><span class="rbadge {cls}">{rol}</span><span class="tab-count">{total}</span>{dot}</button>\n'
    ac_tab_contents += f'<div id="ac-tab-{rol}" class="tab-pane {active_tab}"><div class="card">{build_ac_tab(rol)}</div></div>\n'

# Resumen por rol
rol_summary = ""
for rol in ROLES_AC:
    items = resultados.get(rol,[])
    if not items: continue
    rt=len(items); rp=sum(1 for i in items if i.get("resultado")=="PASS")
    rc=sum(1 for i in items if i.get("resultado")=="FAIL_CRITICO")
    rw=sum(1 for i in items if i.get("resultado")=="FAIL_MENOR")
    cls,_ = ROLE_META.get(rol,("role-admin","?"))
    icon = ("🚨" if rc>0 else "⚠️" if rw>0 else "✅")
    icls = ("c-red" if rc>0 else "c-amber" if rw>0 else "c-green")
    rol_summary += f"""<tr>
      <td><span class="rbadge {cls}">{rol}</span></td>
      <td class="c-slate fw7">{rt}</td>
      <td class="c-green fw7">{rp}</td>
      <td class="c-red fw7">{rc}</td>
      <td class="c-amber fw7">{rw}</td>
      <td class="{icls} fw7">{icon}</td>
    </tr>\n"""
if not rol_summary:
    rol_summary='<tr><td colspan="6" class="empty-row">Sin datos</td></tr>'

# ── HTML ──────────────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nanutech — Security Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {{ margin:0; padding:0; box-sizing:border-box; }}

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
      --green-bd:     #A7F3D0;
      --green-light:  #D1FAE5;
      --amber:        #D97706;
      --amber-bg:     #FFFBEB;
      --amber-bd:     #FDE68A;
      --red:          #DC2626;
      --red-bg:       #FEF2F2;
      --red-bd:       #FECACA;
      --red-light:    #FEE2E2;
      --purple:       #7C3AED;
      --purple-bg:    #F5F3FF;
      --purple-bd:    #DDD6FE;
      --blue:         #0284C7;
      --blue-bg:      #F0F9FF;
      --blue-bd:      #BAE6FD;
      --slate:        #0F172A;
      --slate2:       #1E293B;
      --text2:        #475569;
      --text3:        #94A3B8;
      --text4:        #CBD5E1;
      --font:         'Inter', system-ui, sans-serif;
      --mono:         'JetBrains Mono', monospace;
      --radius:       10px;
      --radius-sm:    7px;
      --shadow-sm:    0 1px 3px rgba(15,23,42,.08),0 1px 2px rgba(15,23,42,.05);
      --shadow:       0 4px 16px rgba(15,23,42,.09);
      --header-h:     64px;
    }}

    html {{ scroll-behavior:smooth; scroll-padding-top:calc(var(--header-h) + 52px); }}
    body {{
      font-family:var(--font); background:var(--bg); color:var(--slate);
      min-height:100vh; font-size:13px; line-height:1.6;
      -webkit-font-smoothing:antialiased;
    }}
    ::-webkit-scrollbar {{ width:5px; height:5px; }}
    ::-webkit-scrollbar-thumb {{ background:var(--border2); border-radius:3px; }}
    ::-webkit-scrollbar-thumb:hover {{ background:var(--accent); }}

    /* ── HEADER ── */
    header {{
      position:sticky; top:0; z-index:200;
      background:rgba(255,255,255,.94); backdrop-filter:blur(12px);
      border-bottom:1px solid var(--border); box-shadow:var(--shadow-sm);
      height:var(--header-h); display:flex; align-items:center;
      padding:0 24px; gap:14px;
    }}
    .h-logo {{
      width:36px; height:36px; background:var(--accent);
      border-radius:9px; display:flex; align-items:center; justify-content:center;
      font-size:15px; font-weight:800; color:#fff;
      box-shadow:0 2px 8px rgba(37,99,235,.28); flex-shrink:0;
    }}
    .h-title {{ font-size:14px; font-weight:800; color:var(--slate); letter-spacing:-.2px; }}
    .h-div   {{ width:1px; height:18px; background:var(--border); }}
    .h-sub   {{ font-size:11px; color:var(--text3); display:none; }}
    @media(min-width:640px){{ .h-sub{{ display:block; }} }}
    .h-right {{ margin-left:auto; display:flex; align-items:center; gap:8px; }}
    .global-badge {{
      display:inline-flex; align-items:center; gap:6px;
      padding:4px 12px; border-radius:20px; font-size:11px; font-weight:800;
      letter-spacing:1.5px; font-family:var(--mono);
      background:{_GLOBAL_BG}; color:{_GLOBAL_TC}; border:1px solid {_GLOBAL_BD};
    }}
    .global-badge::before {{
      content:''; width:7px; height:7px; background:{_GLOBAL_TC};
      border-radius:50%; animation:pulse-dot 2s infinite;
    }}
    @keyframes pulse-dot {{ 0%,100%{{opacity:1;transform:scale(1)}} 50%{{opacity:.5;transform:scale(.7)}} }}

    /* ── NAV ── */
    .nav-bar {{
      position:sticky; top:var(--header-h); z-index:150;
      background:var(--bg2); border-bottom:1px solid var(--border);
      display:flex; overflow-x:auto; padding:0 24px;
      box-shadow:0 1px 3px rgba(15,23,42,.05);
    }}
    .nav-bar a {{
      display:inline-flex; align-items:center; gap:6px;
      padding:12px 16px; font-size:12px; font-weight:600;
      color:var(--text2); border-bottom:2px solid transparent;
      text-decoration:none; white-space:nowrap; transition:all .14s;
    }}
    .nav-bar a:hover {{ color:var(--accent); border-bottom-color:var(--accent-mid); }}

    /* ── LAYOUT ── */
    .container {{ max-width:1380px; margin:0 auto; padding:28px 16px 64px; }}
    @media(min-width:640px){{ .container{{ padding:28px 24px 64px; }} }}
    @media(min-width:1024px){{ .container{{ padding:32px 28px 64px; }} }}

    /* ── COMMIT STRIP ── */
    .commit-strip {{
      background:var(--bg2); border:1px solid var(--border);
      border-radius:var(--radius); padding:12px 16px;
      display:flex; gap:6px; flex-wrap:wrap; align-items:center;
      margin-bottom:24px; font-size:11px; box-shadow:var(--shadow-sm);
    }}
    .ci {{ display:flex; align-items:center; gap:5px; color:var(--text3); font-family:var(--mono); }}
    .ci strong {{ color:var(--text2); font-weight:600; }}
    .csep {{ color:var(--border2); display:none; }}
    @media(min-width:640px){{ .csep{{ display:inline; }} }}
    .commit-strip a {{ color:var(--accent); text-decoration:none; font-weight:600; font-family:var(--mono); font-size:11px; margin-left:auto; }}

    /* ── SECTIONS ── */
    .section {{ margin-bottom:40px; }}
    .section-header {{ display:flex; align-items:center; gap:10px; margin-bottom:6px; }}
    .section-header h2 {{ font-size:15px; font-weight:800; color:var(--slate); letter-spacing:-.3px; }}
    .section-desc {{ color:var(--text2); font-size:12px; margin-bottom:18px; line-height:1.7; }}
    .section-divider {{ height:1px; background:var(--border); margin:0 0 18px; }}

    /* ── METRICS GRID ── */
    .metrics-grid {{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:10px; margin-bottom:14px;
    }}
    @media(min-width:480px){{ .metrics-grid{{ grid-template-columns:repeat(2,1fr); gap:12px; }} }}
    @media(min-width:768px){{ .metrics-grid.g4{{ grid-template-columns:repeat(4,1fr); }} }}
    @media(min-width:900px){{ .metrics-grid.g5{{ grid-template-columns:repeat(5,1fr); }} }}

    .metric {{
      background:var(--bg2); border:1px solid var(--border);
      border-radius:var(--radius); padding:16px 14px;
      display:flex; flex-direction:column; gap:5px;
      box-shadow:var(--shadow-sm); position:relative; overflow:hidden;
    }}
    .metric::after {{
      content:''; position:absolute; top:0; left:0; right:0; height:3px;
      border-radius:var(--radius) var(--radius) 0 0;
      background:var(--m-bar, var(--accent));
    }}
    .metric.m-red    {{ border-color:var(--red-bd);    background:var(--red-bg);    --m-bar:var(--red); }}
    .metric.m-amber  {{ border-color:var(--amber-bd);  background:var(--amber-bg);  --m-bar:var(--amber); }}
    .metric.m-green  {{ border-color:var(--green-bd);  background:var(--green-bg);  --m-bar:var(--green); }}
    .metric.m-blue   {{ border-color:var(--blue-bd);   background:var(--blue-bg);   --m-bar:var(--blue); }}
    .metric.m-accent {{ border-color:var(--accent-mid);background:var(--accent-light);--m-bar:var(--accent); }}
    .metric.m-purple {{ border-color:var(--purple-bd); background:var(--purple-bg); --m-bar:var(--purple); }}
    .metric.m-slate  {{ border-color:var(--border2);   background:var(--bg3);       --m-bar:var(--text3); }}
    .m-num {{
      font-size:2rem; font-weight:800; line-height:1;
      font-family:var(--mono); letter-spacing:-1.5px;
    }}
    .m-lbl {{ font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text2); }}
    .c-red    {{ color:var(--red); }}
    .c-amber  {{ color:var(--amber); }}
    .c-green  {{ color:var(--green); }}
    .c-blue   {{ color:var(--blue); }}
    .c-accent {{ color:var(--accent); }}
    .c-purple {{ color:var(--purple); }}
    .c-slate  {{ color:var(--slate); }}
    .fw7 {{ font-weight:700; }}

    /* ── CARD ── */
    .card {{
      background:var(--bg2); border:1px solid var(--border);
      border-radius:var(--radius); overflow:hidden;
      box-shadow:var(--shadow-sm); margin-bottom:14px;
    }}
    .card-header {{
      padding:12px 18px; border-bottom:1px solid var(--border);
      background:var(--bg3); display:flex; align-items:center;
      justify-content:space-between; flex-wrap:wrap; gap:8px;
    }}
    .card-title {{
      font-size:13px; font-weight:700; color:var(--slate);
      display:flex; align-items:center; gap:8px;
    }}
    .card-sub {{ font-size:11px; color:var(--text3); }}

    /* ── TABS ── */
    .tab-buttons {{
      display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px;
    }}
    .tab-btn {{
      display:inline-flex; align-items:center; gap:7px;
      padding:7px 12px; border-radius:7px;
      border:1px solid var(--border); background:var(--bg3);
      color:var(--text2); cursor:pointer; font-size:12px;
      font-weight:600; font-family:var(--font); transition:all .14s;
    }}
    .tab-btn:hover:not(.active) {{ background:var(--bg2); border-color:var(--border2); color:var(--slate); }}
    .tab-btn.active {{
      background:var(--accent-light); border-color:var(--accent-mid);
      color:var(--accent);
    }}
    .tab-count {{
      background:var(--bg2); border:1px solid var(--border);
      color:var(--text3); padding:1px 6px; border-radius:9px;
      font-size:10px; font-weight:700; font-family:var(--mono);
    }}
    .tab-pane {{ display:none; }}
    .tab-pane.active {{ display:block; }}
    .status-dot {{
      display:inline-block; width:7px; height:7px; border-radius:50%;
    }}
    .dot-crit {{ background:var(--red); }}
    .dot-warn {{ background:var(--amber); }}
    .dot-pass {{ background:var(--green); }}

    /* ── ROLE BADGES ── */
    .rbadge {{
      display:inline-flex; align-items:center;
      padding:2px 9px; border-radius:20px;
      font-size:10px; font-weight:700; letter-spacing:.04em;
    }}
    .role-admin   {{ background:var(--accent-light); color:var(--accent);  border:1px solid var(--accent-mid); }}
    .role-gerente {{ background:var(--purple-bg);    color:var(--purple);  border:1px solid var(--purple-bd); }}
    .role-chofer  {{ background:var(--green-bg);     color:var(--green);   border:1px solid var(--green-bd); }}
    .role-anonimo {{ background:var(--amber-bg);     color:var(--amber);   border:1px solid var(--amber-bd); }}
    .role-publico {{ background:var(--bg3);          color:var(--text3);   border:1px solid var(--border); }}

    /* ── ROL SUMMARY ── */
    .rol-summary {{
      display:flex; gap:8px; flex-wrap:wrap; padding:14px 16px;
      border-bottom:1px solid var(--border); background:var(--bg3);
    }}
    .rol-stat {{
      background:var(--bg2); border:1px solid var(--border);
      border-radius:var(--radius-sm); padding:8px 14px;
      text-align:center; min-width:70px;
    }}
    .rs-pass {{ border-color:var(--green-bd); }}
    .rs-crit {{ border-color:var(--red-bd); }}
    .rs-warn {{ border-color:var(--amber-bd); }}
    .rs-num {{
      display:block; font-size:1.4rem; font-weight:800;
      line-height:1; font-family:var(--mono); letter-spacing:-1px;
    }}
    .rs-lbl {{ display:block; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text3); margin-top:3px; }}

    /* ── FILTER BAR ── */
    .filter-bar {{
      display:flex; gap:6px; flex-wrap:wrap; align-items:center;
      padding:12px 16px; border-bottom:1px solid var(--border);
      background:var(--bg2);
    }}
    .filter-lbl {{ font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text3); margin-right:2px; }}
    .fbtn {{
      padding:4px 11px; border-radius:6px; border:1px solid var(--border);
      background:var(--bg3); color:var(--text2); cursor:pointer;
      font-size:11px; font-weight:700; font-family:var(--font); transition:all .13s;
    }}
    .fbtn:hover:not(.active) {{ background:var(--bg2); border-color:var(--border2); color:var(--slate); }}
    .fbtn.active      {{ background:var(--accent-light); border-color:var(--accent-mid); color:var(--accent); }}
    .fbtn-pass.active {{ background:var(--green-bg);  border-color:var(--green-bd);  color:var(--green); }}
    .fbtn-crit.active {{ background:var(--red-bg);    border-color:var(--red-bd);    color:var(--red); }}
    .fbtn-warn.active {{ background:var(--amber-bg);  border-color:var(--amber-bd);  color:var(--amber); }}

    /* ── TABLES ── */
    .table-wrap {{ overflow-x:auto; }}
    .data-table {{ width:100%; border-collapse:collapse; font-size:12px; }}
    .data-table th {{
      background:var(--bg3); color:var(--text3);
      padding:8px 12px; text-align:left;
      font-weight:700; font-size:10px;
      text-transform:uppercase; letter-spacing:.6px;
      border-bottom:1px solid var(--border); white-space:nowrap;
    }}
    .data-table td {{
      padding:10px 12px; border-bottom:1px solid var(--border);
      vertical-align:top; background:var(--bg2);
    }}
    .data-table tr:last-child td {{ border-bottom:none; }}
    .data-table tr:hover td {{ background:var(--bg3); }}
    .data-table tr.hidden {{ display:none; }}
    .data-table tr.row-crit td {{ background:#FFF5F5; }}
    .data-table tr.row-warn td {{ background:#FFFDF0; }}
    .data-table tr.row-pass td {{ background:var(--bg2); }}
    .empty-row {{ text-align:center; color:var(--text3); padding:36px !important; background:var(--bg2) !important; }}

    /* ── SEVERITY BADGES ── */
    .sev-high   {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--red-bg);    color:var(--red);    border:1px solid var(--red-bd); }}
    .sev-medium {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--amber-bg);  color:var(--amber);  border:1px solid var(--amber-bd); }}
    .sev-low    {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--green-bg);  color:var(--green);  border:1px solid var(--green-bd); }}
    .sev-info   {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--blue-bg);   color:var(--blue);   border:1px solid var(--blue-bd); }}
    .sev-high::before   {{ content:''; width:5px; height:5px; border-radius:50%; background:var(--red);   flex-shrink:0; }}
    .sev-medium::before {{ content:''; width:5px; height:5px; border-radius:50%; background:var(--amber); flex-shrink:0; }}
    .sev-low::before    {{ content:''; width:5px; height:5px; border-radius:50%; background:var(--green); flex-shrink:0; }}

    /* ── STATUS BADGES ── */
    .st-pass {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); background:var(--green-bg);  color:var(--green);  border:1px solid var(--green-bd); }}
    .st-crit {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); background:var(--red-bg);    color:var(--red);    border:1px solid var(--red-bd); }}
    .st-warn {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); background:var(--amber-bg);  color:var(--amber);  border:1px solid var(--amber-bd); }}

    /* ── INLINE CODE ── */
    code {{ font-family:var(--mono); font-size:11px; }}
    .cwe-tag {{ background:var(--purple-bg); color:var(--purple); border:1px solid var(--purple-bd); padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600; }}
    .ep-tag  {{ background:var(--bg3); color:var(--text2); border:1px solid var(--border); padding:1px 5px; border-radius:4px; display:inline-block; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }}
    .ep-mono {{ background:var(--bg3); color:var(--text2); border:1px solid var(--border); padding:2px 6px; border-radius:4px; display:inline-block; max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; }}
    .more-tag{{ color:var(--text3); font-size:10px; font-style:italic; }}
    .lang-badge {{ font-size:9px; padding:1px 5px; border-radius:3px; margin-left:4px; font-weight:700; font-family:var(--mono); }}
    .lang-es {{ background:var(--green-bg); color:var(--green); border:1px solid var(--green-bd); }}
    .lang-en {{ background:var(--blue-bg);  color:var(--blue);  border:1px solid var(--blue-bd); }}
    .alert-name {{ font-weight:600; color:var(--slate); }}
    .method-badge {{ background:var(--accent-light); color:var(--accent); border:1px solid var(--accent-mid); padding:2px 7px; border-radius:4px; font-size:10px; font-weight:700; font-family:var(--mono); }}
    .exp-200 {{ background:var(--green-bg);  color:var(--green);  border:1px solid var(--green-bd);  padding:2px 7px; border-radius:4px; font-size:10px; font-weight:700; font-family:var(--mono); }}
    .exp-403 {{ background:var(--red-bg);    color:var(--red);    border:1px solid var(--red-bd);    padding:2px 7px; border-radius:4px; font-size:10px; font-weight:700; font-family:var(--mono); }}
    .exp-pub {{ background:var(--bg3);       color:var(--text3);  border:1px solid var(--border);    padding:2px 7px; border-radius:4px; font-size:10px; font-weight:700; font-family:var(--mono); }}
    .detail-note {{ display:block; color:var(--text3); font-size:11px; font-style:italic; margin-top:3px; }}
    .desc-cell {{ min-width:200px; color:var(--text2); line-height:1.55; }}
    .sol-cell  {{ min-width:180px; color:var(--text2); line-height:1.55; }}
    .ep-cell   {{ min-width:160px; }}
    .roles-cell{{ font-size:11px; color:var(--text3); min-width:120px; }}

    /* ── ZAP LINKS ── */
    .zap-links {{ display:flex; gap:8px; flex-wrap:wrap; padding:12px 16px; border-bottom:1px solid var(--border); background:var(--bg3); }}
    .zap-link {{
      display:inline-flex; align-items:center; gap:5px;
      padding:5px 11px; background:var(--bg2); border:1px solid var(--border);
      border-radius:6px; color:var(--accent); font-size:11px;
      font-weight:600; text-decoration:none; transition:all .13s;
    }}
    .zap-link:hover {{ background:var(--accent-light); border-color:var(--accent-mid); text-decoration:none; }}

    /* ── EMPTY STATE ── */
    .empty-state {{ text-align:center; padding:48px 24px; color:var(--text3); background:var(--bg2); }}
    .empty-icon  {{ font-size:2.5rem; display:block; margin-bottom:10px; }}
    .empty-state p {{ font-size:14px; color:var(--text2); font-weight:500; }}
    .empty-state span {{ font-size:12px; display:block; margin-top:4px; }}

    /* ── FOOTER ── */
    footer {{
      background:var(--bg2); border-top:1px solid var(--border);
      padding:16px 24px; display:flex; align-items:center;
      justify-content:space-between; flex-wrap:wrap; gap:8px;
      font-size:11px; color:var(--text3);
    }}
    .footer-brand {{ display:flex; align-items:center; gap:8px; font-weight:600; color:var(--text2); }}
    .footer-logo  {{ width:22px; height:22px; background:var(--accent); border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#fff; }}
    footer a {{ color:var(--accent); text-decoration:none; font-weight:600; }}
    footer a:hover {{ text-decoration:underline; }}
  </style>
</head>
<body>

<!-- HEADER -->
<header>
  <div class="h-logo">🔐</div>
  <span class="h-title">Security Report</span>
  <div class="h-div"></div>
  <span class="h-sub">{REPO}</span>
  <div class="h-right">
    <span class="global-badge">{BADGE_TEXT}</span>
  </div>
</header>

<!-- NAV -->
<nav class="nav-bar">
  <a href="#resumen">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
    Resumen
  </a>
  <a href="#access-control">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    Access Control
  </a>
  <a href="#zap-scans">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    ZAP Scans
  </a>
</nav>

<!-- CONTENIDO -->
<div class="container">

  <div class="commit-strip">
    <div class="ci">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      Generado: <strong>{FECHA}</strong>
    </div>
    <span class="csep">·</span>
    <div class="ci">Scan AC: <strong>{fecha_gen}</strong></div>
    <a href="{RUN_URL}" target="_blank">Ver en GitHub Actions →</a>
  </div>

  <!-- ═══ RESUMEN ══════════════════════════════════════════════════ -->
  <section class="section" id="resumen">
    <div class="section-header"><h2>Resumen ejecutivo</h2></div>
    <p class="section-desc">Resultados consolidados de Broken Access Control (OWASP A01) y hallazgos del escaneo activo ZAP por rol de usuario.</p>
    <div class="section-divider"></div>

    <!-- AC metrics -->
    <div class="card" style="margin-bottom:14px;">
      <div class="card-header">
        <div class="card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Broken Access Control — OWASP A01
        </div>
      </div>
      <div style="padding:16px;">
        <div class="metrics-grid g4">
          <div class="metric m-red">
            <span class="m-num c-red">{CRIT}</span>
            <span class="m-lbl">🚨 Críticos</span>
          </div>
          <div class="metric m-amber">
            <span class="m-num c-amber">{MENOR}</span>
            <span class="m-lbl">⚠️ Warnings</span>
          </div>
          <div class="metric m-green">
            <span class="m-num c-green">{PASS_N}</span>
            <span class="m-lbl">✅ Pasadas</span>
          </div>
          <div class="metric m-accent">
            <span class="m-num c-accent">{TOTAL}</span>
            <span class="m-lbl">Total pruebas</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ZAP metrics -->
    <div class="card" style="margin-bottom:14px;">
      <div class="card-header">
        <div class="card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          ZAP Active Scan — todos los roles
        </div>
      </div>
      <div style="padding:16px;">
        <div class="metrics-grid g5">
          <div class="metric m-red">
            <span class="m-num c-red">{zap_high}</span>
            <span class="m-lbl">🔴 High</span>
          </div>
          <div class="metric m-amber">
            <span class="m-num c-amber">{zap_medium}</span>
            <span class="m-lbl">🟠 Medium</span>
          </div>
          <div class="metric m-green">
            <span class="m-num c-green">{zap_low}</span>
            <span class="m-lbl">🟡 Low</span>
          </div>
          <div class="metric m-blue">
            <span class="m-num c-blue">{zap_info}</span>
            <span class="m-lbl">🔵 Info</span>
          </div>
          <div class="metric m-slate">
            <span class="m-num c-slate">{zap_total}</span>
            <span class="m-lbl">Únicos</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Resumen por rol -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Resultado por rol — Access Control</div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Rol</th><th>Total</th><th>Pasadas</th>
            <th>Críticos</th><th>Warnings</th><th>Estado</th>
          </tr></thead>
          <tbody>{rol_summary}</tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- ═══ ACCESS CONTROL ═══════════════════════════════════════════ -->
  <section class="section" id="access-control">
    <div class="section-header"><h2>Broken Access Control — OWASP A01</h2></div>
    <p class="section-desc">Detalle por rol de todas las pruebas de control de acceso. Usa los filtros internos para ver solo críticos, warnings o pasadas.</p>
    <div class="section-divider"></div>

    <div class="tab-buttons">{ac_tab_btns}</div>
    {ac_tab_contents}
  </section>

  <!-- ═══ ZAP SCANS ════════════════════════════════════════════════ -->
  <section class="section" id="zap-scans">
    <div class="section-header"><h2>ZAP Active Scan — hallazgos por rol</h2></div>
    <p class="section-desc">Vulnerabilidades técnicas detectadas por OWASP ZAP: SQL Injection, XSS, CORS, Path Traversal, SSRF, Security Headers. Leídas directamente de los reportes JSON generados por ZAP.</p>
    <div class="section-divider"></div>

    <div class="tab-buttons">
      <button class="tab-btn active" onclick="showZAPTab('zadmin',this)">
        <span class="rbadge role-admin">ADMIN</span>
        <span class="tab-count">{len(alerts_admin)}</span>
      </button>
      <button class="tab-btn" onclick="showZAPTab('zgerente',this)">
        <span class="rbadge role-gerente">GERENTE</span>
        <span class="tab-count">{len(alerts_gerente)}</span>
      </button>
      <button class="tab-btn" onclick="showZAPTab('zchofer',this)">
        <span class="rbadge role-chofer">CHOFER</span>
        <span class="tab-count">{len(alerts_chofer)}</span>
      </button>
    </div>

    <div id="tab-zadmin" class="tab-pane active">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="rbadge role-admin">ADMIN</span> — hallazgos ZAP</div>
          <span class="card-sub">{len(alerts_admin)} hallazgo(s)</span>
        </div>
        <div class="zap-links">
          <a class="zap-link" href="admin/reporte-ADMIN.html">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Reporte HTML completo
          </a>
          <a class="zap-link" href="admin/reporte-ADMIN-json.json">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            JSON raw
          </a>
        </div>
        {table_admin}
      </div>
    </div>

    <div id="tab-zgerente" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="rbadge role-gerente">GERENTE</span> — hallazgos ZAP</div>
          <span class="card-sub">{len(alerts_gerente)} hallazgo(s)</span>
        </div>
        <div class="zap-links">
          <a class="zap-link" href="gerente/reporte-GERENTE.html">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Reporte HTML completo
          </a>
          <a class="zap-link" href="gerente/reporte-GERENTE-json.json">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            JSON raw
          </a>
        </div>
        {table_gerente}
      </div>
    </div>

    <div id="tab-zchofer" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="rbadge role-chofer">CHOFER</span> — hallazgos ZAP</div>
          <span class="card-sub">{len(alerts_chofer)} hallazgo(s)</span>
        </div>
        <div class="zap-links">
          <a class="zap-link" href="chofer/reporte-CHOFER.html">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Reporte HTML completo
          </a>
          <a class="zap-link" href="chofer/reporte-CHOFER-json.json">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            JSON raw
          </a>
        </div>
        {table_chofer}
      </div>
    </div>

  </section>
</div>

<!-- FOOTER -->
<footer>
  <div class="footer-brand">
    <div class="footer-logo">🔐</div>
    Nanutech Security Report · {REPO}
  </div>
  <span>
    <a href="https://www.zaproxy.org" target="_blank">OWASP ZAP</a> ·
    <a href="{RUN_URL}" target="_blank">GitHub Actions</a> ·
    {FECHA}
  </span>
</footer>

<script>
  function showZAPTab(id, btn) {{
    document.querySelectorAll('[id^="tab-z"]').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    btn.closest('.tab-buttons').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }}
  function showACTab(rol, btn) {{
    document.querySelectorAll('[id^="ac-tab-"]').forEach(el => el.classList.remove('active'));
    document.getElementById('ac-tab-' + rol).classList.add('active');
    btn.closest('.tab-buttons').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }}
  function filterAC(rol, tipo, btn) {{
    const table = document.getElementById('ac-table-' + rol);
    if (!table) return;
    table.querySelectorAll('tbody tr').forEach(row => {{
      row.classList.toggle('hidden', tipo !== 'ALL' && row.dataset.resultado !== tipo);
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
print(f"✅ {OUT} generado ({len(html):,} chars)")
print(f"   Access Control → {CRIT} críticos, {MENOR} warnings, {PASS_N}/{TOTAL} pasadas")
print(f"   ZAP            → {zap_high} High, {zap_medium} Medium, {zap_low} Low, {zap_info} Info ({zap_total} únicos)")
