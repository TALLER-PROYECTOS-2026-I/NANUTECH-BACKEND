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
"""
import os
import json
import sys
import os.path

# ── Cargar diccionario de traducciones ZAP ───────────────────────────────────
# Se intenta importar desde el mismo directorio del script.
# Si no está disponible, se usa un dict vacío y los textos quedan en inglés.
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _SCRIPT_DIR)
try:
    from zap_translations import ZAP_TRANSLATIONS, ZAP_TRANSLATIONS_BY_NAME, translate_alert
except ImportError:
    ZAP_TRANSLATIONS = {}
    ZAP_TRANSLATIONS_BY_NAME = {}
    def translate_alert(plugin_id, name):
        return None


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

ZAP_ADMIN_JSON   = os.environ.get("ZAP_ADMIN_JSON",   "gh-pages-site/admin/reporte-ADMIN-json.json")
ZAP_GERENTE_JSON = os.environ.get("ZAP_GERENTE_JSON", "gh-pages-site/gerente/reporte-GERENTE-json.json")
ZAP_CHOFER_JSON  = os.environ.get("ZAP_CHOFER_JSON",  "gh-pages-site/chofer/reporte-CHOFER-json.json")

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

# ── Leer hallazgos ZAP ───────────────────────────────────────────────────────
def load_zap_alerts(filepath):
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError):
        return []
    alerts = []
    seen   = set()
    sites  = data.get("site", [])
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
    alerts.sort(key=lambda a: int(a["riskcode"]) if a["riskcode"].isdigit() else 0, reverse=True)
    return alerts

def get_translated_field(alert, field, original_value):
    """
    Busca la traducción al español de un campo de un hallazgo ZAP.
    Prioridad: Plugin ID → nombre normalizado → texto original en inglés.
    """
    plugin_id = str(alert.get("pluginid", alert.get("alertRef", "")))
    name      = alert.get("name", "")
    t = translate_alert(plugin_id, name)
    if t and field in t and t[field]:
        return t[field]
    # Fallback: texto original limpio
    if original_value:
        cleaned = original_value.replace("<p>", "").replace("</p>", " ").strip()
        return cleaned
    return ""


def get_translated_name(alert):
    """Devuelve el nombre del hallazgo traducido al español."""
    plugin_id = str(alert.get("pluginid", alert.get("alertRef", "")))
    name      = alert.get("name", "")
    t = translate_alert(plugin_id, name)
    if t and t.get("name"):
        return t["name"]
    return name


def build_zap_table(alerts, rol_label):
    if not alerts:
        return f'''<div class="empty-state">
          <span class="icon">✅</span>
          <p>No se encontraron hallazgos en el escaneo ZAP para {rol_label},
             o el reporte aún no está disponible.</p>
        </div>'''
    rows = ""
    for alert in alerts:
        riskcode   = alert["riskcode"]
        risk_label, risk_class = RISK_LABELS.get(riskcode, ("🔵 Info", "riesgo-info"))
        cwe        = f'<code>CWE-{alert["cweid"]}</code>' if alert["cweid"] else "N/A"

        # Nombre traducido
        name_es    = get_translated_name(alert)

        # Endpoints afectados (máximo 3)
        instances  = alert["instances"][:3]
        endpoints_html = "<br>".join(
            f'<code>{inst.get("method","?")} {inst.get("uri","?")}</code>'
            for inst in instances
        )
        if len(alert["instances"]) > 3:
            endpoints_html += f'<br><span style="color:#8b949e;font-size:11px">+{len(alert["instances"])-3} más</span>'

        # Descripción traducida (truncada a 300 chars en la tabla)
        desc_es    = get_translated_field(alert, "description", alert.get("desc", ""))
        desc_short = desc_es[:300] + "..." if len(desc_es) > 300 else desc_es

        # Solución traducida (truncada a 250 chars en la tabla)
        sol_es     = get_translated_field(alert, "solution", alert.get("solution", ""))
        sol_short  = sol_es[:250] + "..." if len(sol_es) > 250 else sol_es

        # Otra info traducida
        other_raw  = alert.get("otherinfo", alert.get("other_info", ""))
        other_es   = get_translated_field(alert, "other_info", other_raw)
        other_short = other_es[:200] + "..." if len(other_es) > 200 else other_es

        # Indicador de traducción disponible
        plugin_id  = str(alert.get("pluginid", alert.get("alertRef", "")))
        t_available = translate_alert(plugin_id, alert.get("name", "")) is not None
        lang_badge  = '<span style="font-size:9px;background:#3fb95022;color:#3fb950;padding:1px 5px;border-radius:3px;margin-left:4px">ES</span>' if t_available else '<span style="font-size:9px;background:#58a6ff22;color:#58a6ff;padding:1px 5px;border-radius:3px;margin-left:4px">EN</span>'

        rows += f'''<tr>
          <td><span class="{risk_class}">{risk_label}</span></td>
          <td><strong>{name_es}</strong>{lang_badge}</td>
          <td>{cwe}</td>
          <td style="font-size:12px">{endpoints_html or "N/A"}</td>
          <td style="font-size:12px;color:#c9d1d9">{desc_short or "Ver reporte completo."}</td>
          <td style="font-size:12px;color:#8b949e">{sol_short or "Ver reporte completo."}</td>
          <td style="font-size:11px;color:#8b949e;font-style:italic">{other_short}</td>
        </tr>'''
    return f'''<table class="hallazgos-table">
      <thead><tr>
        <th>Riesgo</th>
        <th>Vulnerabilidad</th>
        <th>CWE</th>
        <th>Endpoints afectados</th>
        <th>Descripción</th>
        <th>Solución recomendada</th>
        <th>Otra información</th>
      </tr></thead>
      <tbody>{rows}</tbody>
    </table>'''

alerts_admin   = load_zap_alerts(ZAP_ADMIN_JSON)
alerts_gerente = load_zap_alerts(ZAP_GERENTE_JSON)
alerts_chofer  = load_zap_alerts(ZAP_CHOFER_JSON)
all_alerts = alerts_admin + alerts_gerente + alerts_chofer
zap_high   = sum(1 for a in all_alerts if a["riskcode"] == "3")
zap_medium = sum(1 for a in all_alerts if a["riskcode"] == "2")
zap_low    = sum(1 for a in all_alerts if a["riskcode"] == "1")
zap_info   = sum(1 for a in all_alerts if a["riskcode"] == "0")
zap_total  = len(set((a["name"], a["cweid"]) for a in all_alerts))

table_admin   = build_zap_table(alerts_admin,   "ROL ADMIN")
table_gerente = build_zap_table(alerts_gerente, "ROL GERENTE")
table_chofer  = build_zap_table(alerts_chofer,  "ROL CHOFER")

# ── Construir tabs de Access Control por rol ──────────────────────────────────
ROLES_AC = ["ADMIN", "GERENTE", "CHOFER", "ANONIMO", "PUBLICO"]

ROLE_COLORS = {
    "ADMIN":   ("role-admin",   "#58a6ff"),
    "GERENTE": ("role-gerente", "#a371f7"),
    "CHOFER":  ("role-chofer",  "#3fb950"),
    "ANONIMO": ("role-anonimo", "#e3b341"),
    "PUBLICO": ("role-publico", "#8b949e"),
}

def resultado_icon(r):
    if r == "PASS":
        return "✅"
    elif r == "FAIL_CRITICO":
        return "🚨"
    else:
        return "⚠️"

def resultado_class(r):
    if r == "PASS":
        return "row-pass"
    elif r == "FAIL_CRITICO":
        return "row-critico"
    else:
        return "row-menor"

def resultado_badge(r, status):
    if r == "PASS":
        return f'<span class="tag-pass">✅ {status}</span>'
    elif r == "FAIL_CRITICO":
        return f'<span class="tag-critico">🚨 {status}</span>'
    else:
        return f'<span class="tag-menor">⚠️ {status}</span>'

def build_ac_tab(rol):
    items = resultados.get(rol, [])
    if not items:
        return '<div class="empty-state"><span class="icon">🔍</span><p>No hay pruebas registradas para este rol.</p></div>'

    total  = len(items)
    passed = sum(1 for i in items if i.get("resultado") == "PASS")
    crits  = sum(1 for i in items if i.get("resultado") == "FAIL_CRITICO")
    warns  = sum(1 for i in items if i.get("resultado") == "FAIL_MENOR")

    # Mini resumen del rol
    summary_html = f'''
    <div class="rol-summary">
      <div class="rol-stat stat-total"><span class="stat-num">{total}</span><span class="stat-lbl">Total</span></div>
      <div class="rol-stat stat-pass"><span class="stat-num">{passed}</span><span class="stat-lbl">✅ Pasadas</span></div>
      <div class="rol-stat stat-crit"><span class="stat-num">{crits}</span><span class="stat-lbl">🚨 Críticos</span></div>
      <div class="rol-stat stat-warn"><span class="stat-num">{warns}</span><span class="stat-lbl">⚠️ Warnings</span></div>
    </div>'''

    # Filtros visuales (botones JS)
    filter_html = f'''
    <div class="filter-bar" id="filter-{rol}">
      <button class="filter-btn active" onclick="filterAC('{rol}','ALL',this)">Todos ({total})</button>
      <button class="filter-btn" onclick="filterAC('{rol}','PASS',this)">✅ Pasadas ({passed})</button>
      <button class="filter-btn btn-crit" onclick="filterAC('{rol}','FAIL_CRITICO',this)">🚨 Críticos ({crits})</button>
      <button class="filter-btn btn-warn" onclick="filterAC('{rol}','FAIL_MENOR',this)">⚠️ Warnings ({warns})</button>
    </div>'''

    # Tabla completa con todas las pruebas
    rows = ""
    for item in items:
        r        = item.get("resultado", "PASS")
        method   = item.get("method", "")
        endpoint = item.get("endpoint", "")
        expected = item.get("expected", "")
        status   = item.get("http_status", "")
        roles_ok = item.get("roles_permitidos", "")
        nota     = item.get("nota", "")
        detalle  = item.get("detalle", "")

        icon        = resultado_icon(r)
        row_class   = resultado_class(r)
        status_badge = resultado_badge(r, status)

        # Descripción combinada
        desc = nota if nota else ("Acceso correcto según la política de roles." if r == "PASS" else "")
        if detalle and r != "PASS":
            desc += f'<br><span style="color:#8b949e;font-size:11px">{detalle}</span>'

        # Expected badge
        if expected == "200":
            exp_badge = '<span class="tag-exp-200">Debe → 2xx</span>'
        elif expected == "403":
            exp_badge = '<span class="tag-exp-403">Debe → 401/403</span>'
        else:
            exp_badge = '<span class="tag-exp-pub">Público</span>'

        rows += f'''<tr class="{row_class}" data-resultado="{r}">
          <td style="text-align:center;font-size:16px">{icon}</td>
          <td><span class="method">{method}</span></td>
          <td><code style="font-size:11px">{endpoint}</code></td>
          <td>{exp_badge}</td>
          <td>{status_badge}</td>
          <td style="font-size:12px;color:#8b949e;max-width:300px">{desc}</td>
          <td style="font-size:11px;color:#8b949e">{roles_ok}</td>
        </tr>'''

    table_html = f'''<table id="ac-table-{rol}">
      <thead><tr>
        <th style="width:40px">Estado</th>
        <th>Método</th>
        <th>Endpoint</th>
        <th>Esperado</th>
        <th>HTTP Real</th>
        <th>Descripción</th>
        <th>Roles autorizados</th>
      </tr></thead>
      <tbody>{rows}</tbody>
    </table>'''

    return summary_html + filter_html + table_html

# Construir tabs HTML para Access Control
ac_tab_buttons = ""
ac_tab_contents = ""

for i, rol in enumerate(ROLES_AC):
    items   = resultados.get(rol, [])
    total   = len(items)
    crits   = sum(1 for x in items if x.get("resultado") == "FAIL_CRITICO")
    warns   = sum(1 for x in items if x.get("resultado") == "FAIL_MENOR")
    passed  = sum(1 for x in items if x.get("resultado") == "PASS")
    cls, color = ROLE_COLORS.get(rol, ("role-admin", "#58a6ff"))

    active_btn = "active" if i == 0 else ""
    active_tab = "active" if i == 0 else ""

    # Indicador de estado en el botón
    if crits > 0:
        estado_dot = '&nbsp;<span class="dot dot-crit"></span>'
    elif warns > 0:
        estado_dot = '&nbsp;<span class="dot dot-warn"></span>'
    elif total > 0:
        estado_dot = '&nbsp;<span class="dot dot-pass"></span>'
    else:
        estado_dot = ''

    ac_tab_buttons += f'''<button class="tab-btn {active_btn}" onclick="showACTab('{rol}',this)">
      <span class="role-badge {cls}">{rol}</span>&nbsp;{total} pruebas{estado_dot}
    </button>\n'''

    content = build_ac_tab(rol)
    ac_tab_contents += f'''<div id="ac-tab-{rol}" class="tab-content {active_tab}">
      <div class="card">{content}</div>
    </div>\n'''

# Resumen por rol (tabla pequeña arriba)
rol_summary = ""
for rol in ROLES_AC:
    items   = resultados.get(rol, [])
    if not items:
        continue
    r_total = len(items)
    r_pass  = sum(1 for i in items if i.get("resultado") == "PASS")
    r_crit  = sum(1 for i in items if i.get("resultado") == "FAIL_CRITICO")
    r_menor = sum(1 for i in items if i.get("resultado") == "FAIL_MENOR")
    cls, _ = ROLE_COLORS.get(rol, ("role-admin", "#58a6ff"))
    if r_crit > 0:
        icon = "🚨"; icls = "fail"
    elif r_menor > 0:
        icon = "⚠️"; icls = "warn"
    else:
        icon = "✅"; icls = "pass"
    rol_summary += (
        f'<tr>'
        f'<td><span class="role-badge {cls}">{rol}</span></td>'
        f'<td>{r_total}</td>'
        f'<td class="pass">{r_pass}</td>'
        f'<td class="fail">{r_crit}</td>'
        f'<td class="warn">{r_menor}</td>'
        f'<td class="{icls}">{icon}</td>'
        f'</tr>\n'
    )
if not rol_summary:
    rol_summary = '<tr><td colspan="6" style="text-align:center;color:#8b949e;padding:20px">No hay datos</td></tr>'

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
    .container{{max-width:1300px;margin:0 auto;padding:28px 24px}}
    .meta{{color:#8b949e;font-size:12px;margin-bottom:24px;display:flex;gap:20px;align-items:center;flex-wrap:wrap}}
    .meta strong{{color:#c9d1d9}}
    section{{margin-bottom:40px}}
    section > h2{{font-size:1rem;color:#f0f6fc;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #30363d;display:flex;align-items:center;gap:8px}}
    .grid-4{{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:20px}}
    .grid-5{{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:20px}}
    .metric{{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;text-align:center}}
    .metric .num{{font-size:2.2rem;font-weight:700;display:block;margin-bottom:6px;line-height:1}}
    .metric .lbl{{font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:0.8px}}
    .metric.alert-critico{{border-color:#f85149;background:#f8514912}}
    .metric.alert-pass{{border-color:#3fb950;background:#3fb95012}}
    .metric.alert-high{{border-color:#f85149;background:#f8514908}}
    .metric.alert-medium{{border-color:#e3b341;background:#e3b34108}}
    .num.pass{{color:#3fb950}} .num.fail{{color:#f85149}} .num.warn{{color:#e3b341}} .num.info{{color:#58a6ff}} .num.gray{{color:#8b949e}}
    .card{{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;margin-bottom:16px;overflow-x:auto}}
    .card-title{{font-size:13px;color:#f0f6fc;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:8px}}
    table{{width:100%;border-collapse:collapse;font-size:13px}}
    th{{background:#21262d;color:#8b949e;padding:9px 12px;text-align:left;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #30363d;white-space:nowrap}}
    td{{padding:9px 12px;border-bottom:1px solid #21262d;vertical-align:middle}}
    tr:last-child td{{border-bottom:none}}
    tr.row-critico{{background:#f8514906}}
    tr.row-menor{{background:#e3b34106}}
    tr.row-pass{{background:transparent}}
    tr:hover td{{background:#21262d}}
    tr.hidden{{display:none}}
    code{{background:#21262d;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12px;color:#79c0ff}}
    .tag-critico{{background:#f8514933;color:#f85149;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap}}
    .tag-menor{{background:#e3b34133;color:#e3b341;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap}}
    .tag-pass{{background:#3fb95033;color:#3fb950;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap}}
    .tag-exp-200{{background:#58a6ff22;color:#58a6ff;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;white-space:nowrap;border:1px solid #58a6ff44}}
    .tag-exp-403{{background:#f8514922;color:#f85149;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;white-space:nowrap;border:1px solid #f8514944}}
    .tag-exp-pub{{background:#8b949e22;color:#8b949e;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;white-space:nowrap;border:1px solid #8b949e44}}
    .tag-rol{{background:#21262d;color:#c9d1d9;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;border:1px solid #30363d}}
    .method{{background:#58a6ff22;color:#58a6ff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;font-family:monospace}}
    .roles-ok{{color:#8b949e;font-size:12px}}
    .pass{{color:#3fb950}} .fail{{color:#f85149}} .warn{{color:#e3b341}}
    /* Role badges */
    .role-badge{{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}}
    .role-admin{{background:#58a6ff22;color:#58a6ff;border:1px solid #58a6ff44}}
    .role-gerente{{background:#a371f722;color:#a371f7;border:1px solid #a371f744}}
    .role-chofer{{background:#3fb95022;color:#3fb950;border:1px solid #3fb95044}}
    .role-anonimo{{background:#e3b34122;color:#e3b341;border:1px solid #e3b34144}}
    .role-publico{{background:#8b949e22;color:#8b949e;border:1px solid #8b949e44}}
    /* Tabs */
    .tab-buttons{{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}}
    .tab-btn{{padding:7px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#8b949e;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.15s;display:flex;align-items:center;gap:6px}}
    .tab-btn.active{{background:#161b22;border-color:#58a6ff;color:#f0f6fc}}
    .tab-btn:hover:not(.active){{background:#30363d;color:#c9d1d9}}
    .tab-content{{display:none}}
    .tab-content.active{{display:block}}
    /* Dots de estado en tabs */
    .dot{{display:inline-block;width:8px;height:8px;border-radius:50%}}
    .dot-crit{{background:#f85149}}
    .dot-warn{{background:#e3b341}}
    .dot-pass{{background:#3fb950}}
    /* Rol summary cards */
    .rol-summary{{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}}
    .rol-stat{{background:#21262d;border:1px solid #30363d;border-radius:6px;padding:10px 16px;text-align:center;min-width:80px}}
    .stat-pass{{border-color:#3fb95044}}
    .stat-crit{{border-color:#f8514944}}
    .stat-warn{{border-color:#e3b34144}}
    .stat-num{{display:block;font-size:1.5rem;font-weight:700;color:#f0f6fc;line-height:1}}
    .stat-lbl{{display:block;font-size:10px;color:#8b949e;margin-top:4px;text-transform:uppercase}}
    /* Filter bar */
    .filter-bar{{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}}
    .filter-btn{{padding:5px 12px;border-radius:5px;border:1px solid #30363d;background:#21262d;color:#8b949e;cursor:pointer;font-size:12px;transition:all 0.15s}}
    .filter-btn.active{{background:#58a6ff22;border-color:#58a6ff;color:#58a6ff}}
    .filter-btn.btn-crit.active{{background:#f8514922;border-color:#f85149;color:#f85149}}
    .filter-btn.btn-warn.active{{background:#e3b34122;border-color:#e3b341;color:#e3b341}}
    .filter-btn:hover:not(.active){{background:#30363d;color:#c9d1d9}}
    /* ZAP section */
    .zap-links{{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}}
    .zap-link{{display:inline-block;padding:6px 12px;background:#21262d;border:1px solid #30363d;border-radius:5px;color:#58a6ff;font-size:12px;transition:background 0.15s}}
    .zap-link:hover{{background:#30363d;text-decoration:none}}
    .hallazgos-table td:first-child span{{display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600}}
    .riesgo-high{{background:#f8514933;color:#f85149}}
    .riesgo-medium{{background:#e3b34133;color:#e3b341}}
    .riesgo-low{{background:#3fb95022;color:#3fb950}}
    .riesgo-info{{background:#58a6ff22;color:#58a6ff}}
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
</nav>

<div class="container">

  <div class="meta">
    <span>Generado: <strong>{FECHA}</strong></span>
    <span>·</span>
    <span>Escaneo AC: <strong>{fecha_gen}</strong></span>
    <span>·</span>
    <a href="{RUN_URL}" target="_blank">Ver workflow en GitHub Actions →</a>
  </div>

  <!-- ═══ RESUMEN ══════════════════════════════════════════════════════════ -->
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

    <!-- Resumen compacto por rol -->
    <div class="card">
      <div class="card-title">Resultado por rol — Access Control</div>
      <table>
        <thead><tr>
          <th>Rol</th><th>Total pruebas</th><th>Pasadas</th>
          <th>Críticos</th><th>Warnings</th><th>Estado</th>
        </tr></thead>
        <tbody>{rol_summary}</tbody>
      </table>
    </div>
  </section>

  <!-- ═══ ACCESS CONTROL CON TABS POR ROL ═════════════════════════════════ -->
  <section id="access-control">
    <h2>🔒 Broken Access Control — OWASP A01</h2>
    <p style="color:#8b949e;font-size:13px;margin-bottom:16px">
      Selecciona un rol para ver el detalle completo de todas sus pruebas —
      tanto las que pasaron como las que fallaron. Usa los filtros dentro de
      cada tab para ver solo los críticos, warnings o pasadas.
    </p>

    <div class="tab-buttons">
      {ac_tab_buttons}
    </div>

    {ac_tab_contents}
  </section>

  <!-- ═══ ZAP SCANS CON TABS POR ROL ══════════════════════════════════════ -->
  <section id="zap-scans">
    <h2>🛡️ Hallazgos ZAP Active Scan por rol</h2>
    <p style="color:#8b949e;font-size:13px;margin-bottom:20px">
      Vulnerabilidades técnicas detectadas por OWASP ZAP.
      Incluye: SQL Injection · XSS · CORS · Path Traversal · SSRF ·
      Security Headers · Integer Overflow.
      Los hallazgos se leen directamente de los reportes JSON generados por ZAP.
    </p>

    <div class="tab-buttons">
      <button class="tab-btn active" onclick="showZAPTab('zadmin',this)">
        <span class="role-badge role-admin">ADMIN</span>&nbsp;{len(alerts_admin)} hallazgo{"s" if len(alerts_admin) != 1 else ""}
      </button>
      <button class="tab-btn" onclick="showZAPTab('zgerente',this)">
        <span class="role-badge role-gerente">GERENTE</span>&nbsp;{len(alerts_gerente)} hallazgo{"s" if len(alerts_gerente) != 1 else ""}
      </button>
      <button class="tab-btn" onclick="showZAPTab('zchofer',this)">
        <span class="role-badge role-chofer">CHOFER</span>&nbsp;{len(alerts_chofer)} hallazgo{"s" if len(alerts_chofer) != 1 else ""}
      </button>
    </div>

    <div id="tab-zadmin" class="tab-content active">
      <div class="card">
        <div class="card-title">
          <span class="role-badge role-admin">ADMIN</span>
          /camiones/*, /dashboard, /conductores/*, /contratos/vigentes,
          /unidades/disponibles, /gps/*, /jornadas/*, /alertas/*, /auth/*
        </div>
        <div class="zap-links">
          <a class="zap-link" href="admin/reporte-ADMIN.html">📋 Reporte HTML completo</a>
          <a class="zap-link" href="admin/reporte-ADMIN-json.json">📄 JSON raw</a>
        </div>
        {table_admin}
      </div>
    </div>

    <div id="tab-zgerente" class="tab-content">
      <div class="card">
        <div class="card-title">
          <span class="role-badge role-gerente">GERENTE</span>
          /dashboard/gerencial, /conductores, /contratos/*, /unidades/disponibles,
          /jornadas/*, /auth/*
        </div>
        <div class="zap-links">
          <a class="zap-link" href="gerente/reporte-GERENTE.html">📋 Reporte HTML completo</a>
          <a class="zap-link" href="gerente/reporte-GERENTE-json.json">📄 JSON raw</a>
        </div>
        {table_gerente}
      </div>
    </div>

    <div id="tab-zchofer" class="tab-content">
      <div class="card">
        <div class="card-title">
          <span class="role-badge role-chofer">CHOFER</span>
          /jornadas/actual/{{conductorId}}, /jornadas/iniciar,
          /jornadas/finalizar, /alertas/sos, /alertas/auxilio, /auth/*
        </div>
        <div class="zap-links">
          <a class="zap-link" href="chofer/reporte-CHOFER.html">📋 Reporte HTML completo</a>
          <a class="zap-link" href="chofer/reporte-CHOFER-json.json">📄 JSON raw</a>
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
  // ── Tabs de ZAP ────────────────────────────────────────────────────────
  function showZAPTab(id, btn) {{
    document.querySelectorAll('[id^="tab-z"]').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    btn.closest('.tab-buttons').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }}

  // ── Tabs de Access Control ─────────────────────────────────────────────
  function showACTab(rol, btn) {{
    document.querySelectorAll('[id^="ac-tab-"]').forEach(el => el.classList.remove('active'));
    document.getElementById('ac-tab-' + rol).classList.add('active');
    btn.closest('.tab-buttons').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }}

  // ── Filtro dentro de cada tab de Access Control ────────────────────────
  function filterAC(rol, tipo, btn) {{
    const table = document.getElementById('ac-table-' + rol);
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {{
      if (tipo === 'ALL') {{
        row.classList.remove('hidden');
      }} else {{
        const r = row.getAttribute('data-resultado');
        if (r === tipo) {{
          row.classList.remove('hidden');
        }} else {{
          row.classList.add('hidden');
        }}
      }}
    }});
    const bar = document.getElementById('filter-' + rol);
    if (bar) {{
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }}
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
