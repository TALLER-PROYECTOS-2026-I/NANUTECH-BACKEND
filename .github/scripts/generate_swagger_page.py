#!/usr/bin/env python3
"""
generate_swagger_page.py
Convierte un swagger YAML a JSON y genera una página HTML profesional.

Uso:
    python3 generate_swagger_page.py <ruta-swagger.yaml> <directorio-salida>

FIXES aplicados:
  1. tryItOutEnabled: true  → permite editar body en POSTs
  2. requestInterceptor     → extrae solo el token puro del header Authorization
                              para que tu backend local no reciba "Bearer eyJ..."
                              sino el token limpio que espera verifyLocalAccessToken
  3. Botón Authorize mejorado → tooltip con instrucción clara de pegar solo el token
  4. persistAuthorization: true → el token se mantiene al refrescar la página
"""

import sys
import re
import json
import shutil
import datetime
from pathlib import Path

# ── Dependencia externa ──────────────────────────────────────────────────────
try:
    import yaml
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyyaml", "--quiet"])
    import yaml


# ── Serializer JSON que maneja todos los tipos de Python ────────────────────
class SafeJsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()
        if isinstance(obj, datetime.time):
            return obj.isoformat()
        if isinstance(obj, set):
            return list(obj)
        if isinstance(obj, bytes):
            return obj.decode("utf-8", errors="replace")
        return str(obj)


# ── Normalizar recursivamente todos los valores del dict ─────────────────────
def normalize(node):
    if isinstance(node, dict):
        return {str(k): normalize(v) for k, v in node.items()}
    if isinstance(node, list):
        return [normalize(i) for i in node]
    if isinstance(node, (datetime.date, datetime.datetime)):
        return node.isoformat()
    if isinstance(node, datetime.time):
        return node.isoformat()
    if isinstance(node, bool):
        return node
    if isinstance(node, (int, float)):
        return node
    if node is None:
        return None
    return str(node)


# ── Cargar y limpiar el YAML ─────────────────────────────────────────────────
def load_swagger(yaml_path: Path) -> dict:
    print(f"📄 Leyendo: {yaml_path}")
    raw = yaml_path.read_text(encoding="utf-8")

    raw = re.sub(r"!\w*<[^>]*>", "", raw)
    raw = re.sub(r"!\w+(?=\s)", "", raw)

    data = yaml.safe_load(raw)
    data = normalize(data)

    for field in ("swagger", "openapi"):
        if field in data:
            data[field] = str(data[field]).strip().strip('"').strip("'")

    if "info" in data and "version" in data["info"]:
        data["info"]["version"] = str(data["info"]["version"])

    return data


# ── Extraer metadata ─────────────────────────────────────────────────────────
def extract_meta(data: dict) -> dict:
    info     = data.get("info", {})
    title    = info.get("title", "API Documentation")
    version  = str(info.get("version", "1.0"))
    host     = data.get("host", "")
    base     = data.get("basePath", "/")
    build    = datetime.datetime.utcnow().strftime("%d %b %Y %H:%M UTC")
    return dict(title=title, version=version, host=host, base=base, build=build)


# ── Generar HTML ─────────────────────────────────────────────────────────────
def generate_html(meta: dict, swagger_json_name: str) -> str:
    t  = meta["title"]
    v  = meta["version"]
    h  = meta["host"]
    b  = meta["base"]
    bd = meta["build"]

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{t} — Docs</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

    :root {{
      --bg:          #0d0f14;
      --bg2:         #13161e;
      --bg3:         #1a1d27;
      --surface:     #1e2130;
      --surface2:    #252840;
      --border:      rgba(255,255,255,0.07);
      --border2:     rgba(255,255,255,0.13);
      --accent:      #6c63ff;
      --accent2:     #4f46e5;
      --accent-glow: rgba(108,99,255,0.25);
      --green:       #22d3a0;
      --green-bg:    rgba(34,211,160,0.10);
      --blue:        #38bdf8;
      --blue-bg:     rgba(56,189,248,0.10);
      --amber:       #fbbf24;
      --amber-bg:    rgba(251,191,36,0.10);
      --red:         #f87171;
      --red-bg:      rgba(248,113,113,0.10);
      --purple:      #c084fc;
      --purple-bg:   rgba(192,132,252,0.10);
      --text:        #e8eaf0;
      --text2:       #9298b0;
      --text3:       #5d6380;
      --font:        'Inter', system-ui, sans-serif;
      --mono:        'JetBrains Mono', monospace;
      --radius:      12px;
      --radius-sm:   8px;
      --shadow:      0 4px 24px rgba(0,0,0,0.4);
      --sidebar-w:   280px;
      --header-h:    64px;
    }}

    html {{ scroll-behavior: smooth; }}
    body {{ font-family: var(--font); background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }}

    ::-webkit-scrollbar {{ width: 6px; height: 6px; }}
    ::-webkit-scrollbar-track {{ background: var(--bg2); }}
    ::-webkit-scrollbar-thumb {{ background: var(--surface2); border-radius: 3px; }}
    ::-webkit-scrollbar-thumb:hover {{ background: var(--accent); }}

    /* ── HEADER ── */
    .header {{
      position: fixed; top: 0; left: 0; right: 0; height: var(--header-h);
      background: rgba(13,15,20,0.85); backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; z-index: 1000;
    }}
    .header-left {{ display: flex; align-items: center; gap: 14px; }}
    .logo-mark {{
      width: 36px; height: 36px;
      background: linear-gradient(135deg, var(--accent), var(--purple));
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; color: #fff;
      box-shadow: 0 0 16px var(--accent-glow); flex-shrink: 0;
    }}
    .header-title {{ font-size: 15px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }}
    .header-right {{ display: flex; align-items: center; gap: 10px; }}
    .badge {{ display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: var(--mono); letter-spacing: 0.02em; }}
    .badge-version {{ background: var(--purple-bg); color: var(--purple); border: 1px solid rgba(192,132,252,0.2); }}
    .badge-live {{ background: var(--green-bg); color: var(--green); border: 1px solid rgba(34,211,160,0.2); }}
    .badge-live::before {{ content: ''; width: 6px; height: 6px; background: var(--green); border-radius: 50%; animation: pulse 2s infinite; }}
    @keyframes pulse {{ 0%, 100% {{ opacity: 1; transform: scale(1); }} 50% {{ opacity: 0.6; transform: scale(0.8); }} }}

    /* ── TOKEN HINT BANNER ── */
    .token-hint {{
      background: linear-gradient(90deg, rgba(108,99,255,0.12), rgba(192,132,252,0.08));
      border: 1px solid rgba(108,99,255,0.25);
      border-radius: var(--radius-sm);
      padding: 10px 16px;
      font-size: 12px;
      color: var(--text2);
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    .token-hint strong {{ color: var(--accent); }}
    .token-hint code {{
      font-family: var(--mono);
      background: rgba(108,99,255,0.15);
      border: 1px solid rgba(108,99,255,0.2);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      color: var(--purple);
    }}

    /* ── LAYOUT ── */
    .layout {{ display: flex; padding-top: var(--header-h); min-height: 100vh; }}

    /* ── SIDEBAR ── */
    .sidebar {{
      width: var(--sidebar-w); flex-shrink: 0; background: var(--bg2);
      border-right: 1px solid var(--border);
      position: fixed; top: var(--header-h); bottom: 0; left: 0;
      overflow-y: auto; padding: 20px 0;
      display: flex; flex-direction: column;
    }}
    .sidebar-section {{ padding: 0 0 16px; }}
    .sidebar-label {{ padding: 0 20px 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3); }}
    .sidebar-item {{
      display: flex; align-items: center; gap: 10px; padding: 9px 20px;
      cursor: pointer; font-size: 13px; color: var(--text2);
      border-left: 3px solid transparent; transition: all 0.18s;
    }}
    .sidebar-item:hover {{ color: var(--text); background: var(--bg3); }}
    .sidebar-item.active {{ color: var(--accent); background: rgba(108,99,255,0.08); border-left-color: var(--accent); font-weight: 500; }}
    .method-dot {{ width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }}
    .sidebar-divider {{ height: 1px; background: var(--border); margin: 8px 20px 16px; }}

    /* ── SEARCH ── */
    .search-wrap {{ padding: 12px 16px; border-bottom: 1px solid var(--border); }}
    .search-box {{ position: relative; }}
    .search-icon {{ position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text3); pointer-events: none; }}
    .search-input {{
      width: 100%; background: var(--bg3); border: 1px solid var(--border2);
      border-radius: var(--radius-sm); padding: 8px 12px 8px 32px;
      font-size: 12px; color: var(--text); font-family: var(--font); outline: none;
      transition: border-color 0.18s;
    }}
    .search-input:focus {{ border-color: var(--accent); }}
    .search-input::placeholder {{ color: var(--text3); }}

    /* ── MAIN ── */
    .main {{ flex: 1; margin-left: var(--sidebar-w); min-height: calc(100vh - var(--header-h)); }}

    /* ── HERO ── */
    .hero {{
      background: linear-gradient(135deg, var(--bg2) 0%, var(--bg3) 100%);
      border-bottom: 1px solid var(--border);
      padding: 48px 48px 40px; position: relative; overflow: hidden;
    }}
    .hero::before {{
      content: ''; position: absolute; top: -60px; right: -60px;
      width: 300px; height: 300px;
      background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
      pointer-events: none;
    }}
    .hero-tag {{
      display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px;
      border-radius: 20px; background: var(--accent-glow);
      border: 1px solid rgba(108,99,255,0.3);
      font-size: 11px; font-weight: 600; color: var(--accent);
      letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 16px;
    }}
    .hero h1 {{ font-size: 32px; font-weight: 700; color: var(--text); line-height: 1.2; margin-bottom: 10px; }}
    .hero h1 span {{ color: var(--accent); }}
    .hero-sub {{ font-size: 15px; color: var(--text2); line-height: 1.6; max-width: 560px; margin-bottom: 28px; }}
    .hero-meta {{ display: flex; flex-wrap: wrap; gap: 20px; align-items: center; }}
    .meta-item {{ display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text3); }}
    .meta-item strong {{ color: var(--text2); font-weight: 500; }}
    .meta-sep {{ width: 1px; height: 16px; background: var(--border2); }}

    /* ── STATS ── */
    .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1px; background: var(--border); border-bottom: 1px solid var(--border); }}
    .stat-item {{ background: var(--bg2); padding: 20px 24px; display: flex; flex-direction: column; gap: 4px; }}
    .stat-value {{ font-size: 26px; font-weight: 700; color: var(--text); font-family: var(--mono); line-height: 1; }}
    .stat-value.accent {{ color: var(--accent); }}
    .stat-value.green  {{ color: var(--green); }}
    .stat-value.blue   {{ color: var(--blue); }}
    .stat-value.amber  {{ color: var(--amber); }}
    .stat-label {{ font-size: 11px; color: var(--text3); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }}

    /* ── SWAGGER WRAP ── */
    .swagger-wrap {{ padding: 32px 40px 64px; }}

    /* ── SWAGGER UI OVERRIDES ── */
    #swagger-ui .swagger-ui {{ font-family: var(--font) !important; }}
    #swagger-ui .swagger-ui .topbar {{ display: none !important; }}
    #swagger-ui .swagger-ui .info   {{ display: none !important; }}
    #swagger-ui .swagger-ui .filter-container {{ display: none !important; }}

    #swagger-ui .swagger-ui .scheme-container {{
      background: var(--surface) !important; border: 1px solid var(--border2) !important;
      border-radius: var(--radius) !important; padding: 12px 20px !important;
      box-shadow: none !important; margin-bottom: 24px !important;
    }}
    #swagger-ui .swagger-ui select {{
      background: var(--bg3) !important; color: var(--text) !important;
      border: 1px solid var(--border2) !important; border-radius: var(--radius-sm) !important;
      font-family: var(--mono) !important; font-size: 12px !important; padding: 6px 10px !important;
    }}
    #swagger-ui .swagger-ui .opblock {{
      border: 1px solid var(--border) !important; border-radius: var(--radius) !important;
      background: var(--surface) !important; box-shadow: none !important; margin-bottom: 10px !important; overflow: hidden !important;
    }}
    #swagger-ui .swagger-ui .opblock:hover {{ border-color: var(--border2) !important; }}
    #swagger-ui .swagger-ui .opblock.is-open {{ border-color: var(--border2) !important; box-shadow: var(--shadow) !important; }}
    #swagger-ui .swagger-ui .opblock .opblock-summary {{ border-bottom: none !important; padding: 10px 16px !important; }}
    #swagger-ui .swagger-ui .opblock .opblock-summary-method {{
      border-radius: 6px !important; font-family: var(--mono) !important;
      font-size: 11px !important; font-weight: 700 !important;
      min-width: 70px !important; text-align: center !important; padding: 5px 0 !important;
    }}
    #swagger-ui .swagger-ui .opblock-summary-path {{ font-family: var(--mono) !important; font-size: 13px !important; color: var(--text) !important; }}
    #swagger-ui .swagger-ui .opblock-summary-description {{ color: var(--text2) !important; font-size: 13px !important; }}

    #swagger-ui .swagger-ui .opblock-get    {{ background: var(--blue-bg)  !important; border-color: rgba(56,189,248,0.2)  !important; }}
    #swagger-ui .swagger-ui .opblock-post   {{ background: var(--green-bg) !important; border-color: rgba(34,211,160,0.2)  !important; }}
    #swagger-ui .swagger-ui .opblock-put    {{ background: var(--amber-bg) !important; border-color: rgba(251,191,36,0.2)  !important; }}
    #swagger-ui .swagger-ui .opblock-patch  {{ background: var(--amber-bg) !important; border-color: rgba(251,191,36,0.2)  !important; }}
    #swagger-ui .swagger-ui .opblock-delete {{ background: var(--red-bg)   !important; border-color: rgba(248,113,113,0.2) !important; }}

    #swagger-ui .swagger-ui .opblock-get    .opblock-summary-method {{ background: var(--blue)  !important; }}
    #swagger-ui .swagger-ui .opblock-post   .opblock-summary-method {{ background: var(--green) !important; color: #0d1117 !important; }}
    #swagger-ui .swagger-ui .opblock-put    .opblock-summary-method {{ background: var(--amber) !important; color: #0d1117 !important; }}
    #swagger-ui .swagger-ui .opblock-patch  .opblock-summary-method {{ background: #f59e0b     !important; color: #0d1117 !important; }}
    #swagger-ui .swagger-ui .opblock-delete .opblock-summary-method {{ background: var(--red)  !important; }}

    #swagger-ui .swagger-ui .opblock-body {{ background: var(--bg2) !important; border-top: 1px solid var(--border) !important; }}
    #swagger-ui .swagger-ui .opblock-section-header {{ background: var(--bg3) !important; border-bottom: 1px solid var(--border) !important; padding: 10px 16px !important; }}
    #swagger-ui .swagger-ui .opblock-section-header h4 {{ color: var(--text2) !important; font-size: 12px !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; }}

    #swagger-ui .swagger-ui table.parameters th {{ color: var(--text3) !important; font-size: 11px !important; font-weight: 600 !important; padding: 8px 12px !important; border-bottom: 1px solid var(--border) !important; }}
    #swagger-ui .swagger-ui table.parameters td {{ color: var(--text) !important; padding: 8px 12px !important; border-bottom: 1px solid var(--border) !important; font-size: 13px !important; }}
    #swagger-ui .swagger-ui .parameter__name {{ font-family: var(--mono) !important; font-size: 13px !important; color: var(--accent) !important; }}
    #swagger-ui .swagger-ui .parameter__type {{ font-family: var(--mono) !important; font-size: 11px !important; color: var(--text3) !important; }}

    #swagger-ui .swagger-ui .opblock-tag {{ border-bottom: 1px solid var(--border) !important; padding: 14px 0 !important; margin-bottom: 16px !important; }}
    #swagger-ui .swagger-ui .opblock-tag-section {{ margin-bottom: 24px !important; }}
    #swagger-ui .swagger-ui .opblock-tag h3 {{ color: var(--text) !important; font-size: 18px !important; font-weight: 600 !important; }}
    #swagger-ui .swagger-ui .opblock-tag small {{ color: var(--text3) !important; font-size: 12px !important; }}

    #swagger-ui .swagger-ui .btn {{ font-family: var(--font) !important; font-size: 12px !important; font-weight: 600 !important; border-radius: 6px !important; transition: all 0.18s !important; }}
    #swagger-ui .swagger-ui .btn.try-out__btn {{ background: transparent !important; color: var(--accent) !important; border: 1px solid var(--accent) !important; padding: 6px 14px !important; }}
    #swagger-ui .swagger-ui .btn.try-out__btn:hover {{ background: var(--accent-glow) !important; }}
    #swagger-ui .swagger-ui .btn.execute {{ background: var(--accent) !important; border-color: var(--accent) !important; color: #fff !important; }}
    #swagger-ui .swagger-ui .btn.execute:hover {{ background: var(--accent2) !important; }}
    #swagger-ui .swagger-ui .btn.cancel {{ background: transparent !important; border: 1px solid var(--border2) !important; color: var(--text2) !important; }}

    #swagger-ui .swagger-ui .responses-inner {{ background: var(--bg3) !important; }}
    #swagger-ui .swagger-ui .response-col_status {{ font-family: var(--mono) !important; font-size: 13px !important; font-weight: 600 !important; color: var(--green) !important; }}
    #swagger-ui .swagger-ui .highlight-code pre {{ background: var(--bg) !important; border: 1px solid var(--border) !important; border-radius: var(--radius-sm) !important; font-family: var(--mono) !important; font-size: 12px !important; }}

    #swagger-ui .swagger-ui input[type=text],
    #swagger-ui .swagger-ui textarea {{
      background: var(--bg) !important; border: 1px solid var(--border2) !important;
      border-radius: 6px !important; color: var(--text) !important;
      font-family: var(--mono) !important; font-size: 13px !important;
    }}
    #swagger-ui .swagger-ui input[type=text]:focus,
    #swagger-ui .swagger-ui textarea:focus {{ border-color: var(--accent) !important; outline: none !important; box-shadow: 0 0 0 2px var(--accent-glow) !important; }}

    /* ── Authorize modal dark ── */
    #swagger-ui .swagger-ui .dialog-ux .modal-ux {{
      background: var(--bg2) !important; border: 1px solid var(--border2) !important;
      border-radius: var(--radius) !important;
    }}
    #swagger-ui .swagger-ui .dialog-ux .modal-ux-header {{
      background: var(--bg3) !important; border-bottom: 1px solid var(--border) !important;
    }}
    #swagger-ui .swagger-ui .dialog-ux .modal-ux-header h3 {{ color: var(--text) !important; }}
    #swagger-ui .swagger-ui .dialog-ux .modal-ux-content {{ color: var(--text2) !important; }}
    #swagger-ui .swagger-ui .dialog-ux .modal-ux-content p {{ color: var(--text2) !important; }}
    #swagger-ui .swagger-ui .dialog-ux .modal-ux-content label {{ color: var(--text) !important; font-size: 12px !important; font-weight: 600 !important; }}
    #swagger-ui .swagger-ui .auth-wrapper .authorize {{
      background: var(--accent) !important; border-color: var(--accent) !important;
      color: #fff !important; border-radius: 6px !important; font-weight: 600 !important;
    }}
    #swagger-ui .swagger-ui .auth-wrapper .authorize:hover {{
      background: var(--accent2) !important;
    }}
    /* Modal backdrop */
    #swagger-ui .swagger-ui .dialog-ux .backdrop-ux {{
      background: rgba(0,0,0,0.7) !important;
    }}

    /* ── FOOTER ── */
    .footer {{ background: var(--bg2); border-top: 1px solid var(--border); padding: 20px 40px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text3); }}
    .footer a {{ color: var(--text3); text-decoration: none; }}
    .footer a:hover {{ color: var(--accent); }}

    @media (max-width: 768px) {{
      :root {{ --sidebar-w: 0px; }}
      .sidebar {{ display: none; }}
      .hero {{ padding: 32px 24px 28px; }}
      .hero h1 {{ font-size: 24px; }}
      .swagger-wrap {{ padding: 24px 16px 48px; }}
      .footer {{ flex-direction: column; gap: 8px; text-align: center; }}
    }}
  </style>
</head>
<body>

  <header class="header">
    <div class="header-left">
      <div class="logo-mark">N</div>
      <span class="header-title">{t}</span>
    </div>
    <div class="header-right">
      <span class="badge badge-version">v{v}</span>
      <span class="badge badge-live">Live</span>
    </div>
  </header>

  <div class="layout">

    <aside class="sidebar" id="sidebar">
      <div class="search-wrap">
        <div class="search-box">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input class="search-input" type="text" placeholder="Buscar endpoints..." id="searchInput"/>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-label">Módulos</div>
        <div class="sidebar-item active" data-tag="all" onclick="filterTag('all')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Todos los endpoints
        </div>
        <div class="sidebar-item" data-tag="alertas"    onclick="filterTag('alertas')"><span class="method-dot" style="background:#f87171"></span>Alertas</div>
        <div class="sidebar-item" data-tag="auditoria"  onclick="filterTag('auditoria')"><span class="method-dot" style="background:#fbbf24"></span>Auditoría</div>
        <div class="sidebar-item" data-tag="auth"       onclick="filterTag('auth')"><span class="method-dot" style="background:#6c63ff"></span>Autenticación</div>
        <div class="sidebar-item" data-tag="camiones"   onclick="filterTag('camiones')"><span class="method-dot" style="background:#38bdf8"></span>Camiones</div>
        <div class="sidebar-item" data-tag="combustible" onclick="filterTag('combustible')"><span class="method-dot" style="background:#fb923c"></span>Combustible</div>
        <div class="sidebar-item" data-tag="conductores" onclick="filterTag('conductores')"><span class="method-dot" style="background:#22d3a0"></span>Conductores</div>
        <div class="sidebar-item" data-tag="contratos"  onclick="filterTag('contratos')"><span class="method-dot" style="background:#c084fc"></span>Contratos</div>
        <div class="sidebar-item" data-tag="dashboard"  onclick="filterTag('dashboard')"><span class="method-dot" style="background:#4ade80"></span>Dashboard</div>
        <div class="sidebar-item" data-tag="gps"        onclick="filterTag('gps')"><span class="method-dot" style="background:#f472b6"></span>GPS</div>
        <div class="sidebar-item" data-tag="jornadas"   onclick="filterTag('jornadas')"><span class="method-dot" style="background:#a78bfa"></span>Jornadas</div>
        <div class="sidebar-item" data-tag="unidades"   onclick="filterTag('unidades')"><span class="method-dot" style="background:#34d399"></span>Unidades</div>
      </div>

      <div class="sidebar-divider"></div>

      <div class="sidebar-section">
        <div class="sidebar-label">Info</div>
        <div class="sidebar-item" style="cursor:default;font-size:11px;color:var(--text3);padding-top:4px;padding-bottom:4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Host: {h}
        </div>
        <div class="sidebar-item" style="cursor:default;font-size:11px;color:var(--text3);padding-top:4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Base: {b}
        </div>
        <div class="sidebar-item" style="cursor:default;font-size:11px;color:var(--text3);padding-top:4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Build: {bd}
        </div>
      </div>
    </aside>

    <main class="main">

      <section class="hero">
        <div class="hero-tag">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          REST API
        </div>
        <h1>{t} <span>API</span></h1>
        <p class="hero-sub">Documentación interactiva. Explora endpoints, prueba peticiones en tiempo real y revisa esquemas de respuesta directamente desde el navegador.</p>
        <div class="hero-meta">
          <div class="meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>HTTPS · TLS 1.0+</span>
          </div>
          <div class="meta-sep"></div>
          <div class="meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>AWS API Gateway · Stage</span>
          </div>
          <div class="meta-sep"></div>
          <div class="meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <strong>Actualizado:</strong>&nbsp;{bd}
          </div>
        </div>
      </section>

      <div class="stats">
        <div class="stat-item"><span class="stat-value accent" id="totalEndpoints">—</span><span class="stat-label">Endpoints</span></div>
        <div class="stat-item"><span class="stat-value green"  id="totalGet">—</span><span class="stat-label">GET</span></div>
        <div class="stat-item"><span class="stat-value blue"   id="totalPost">—</span><span class="stat-label">POST</span></div>
        <div class="stat-item"><span class="stat-value amber"  id="totalPatch">—</span><span class="stat-label">PATCH / PUT</span></div>
        <div class="stat-item"><span class="stat-value" id="totalModules" style="color:var(--purple)">11</span><span class="stat-label">Módulos</span></div>
      </div>

      <div class="swagger-wrap">

        <!-- ── INSTRUCCIÓN DE TOKEN ── -->
        <div class="token-hint">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;color:var(--accent)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>
            Haz <strong>POST /auth/login</strong> para obtener tu token, luego haz clic en
            <strong>Authorize 🔒</strong> y pega <strong>solo el token</strong> sin prefijo.
            El interceptor agrega <code>Bearer</code> automáticamente.
          </span>
        </div>

        <div id="swagger-ui"></div>
      </div>

      <footer class="footer">
        <span>© {bd} · {t}</span>
        <span>Generado automáticamente · <a href="https://swagger.io" target="_blank">Swagger UI v5</a></span>
      </footer>

    </main>
  </div>

  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    // ── Estado del filtro activo ─────────────────────────────────────────────
    let _activeTag = 'all';

    // ── Esperar a que el DOM de Swagger tenga elementos antes de actuar ──────
    function waitForSwaggerDOM(selector, callback, maxWait) {{
      maxWait = maxWait || 10000;
      const start = Date.now();
      const interval = setInterval(function() {{
        const els = document.querySelectorAll(selector);
        if (els.length > 0) {{
          clearInterval(interval);
          callback(els);
        }} else if (Date.now() - start > maxWait) {{
          clearInterval(interval);
        }}
      }}, 200);
    }}

    // ── Contar endpoints cuando el DOM esté listo ────────────────────────────
    function countStats() {{
      waitForSwaggerDOM('#swagger-ui .opblock', function(ops) {{
        var get = 0, post = 0, pp = 0;
        ops.forEach(function(op) {{
          if (op.classList.contains('opblock-get'))   get++;
          if (op.classList.contains('opblock-post'))  post++;
          if (op.classList.contains('opblock-patch') || op.classList.contains('opblock-put')) pp++;
        }});
        document.getElementById('totalEndpoints').textContent = get + post + pp || ops.length;
        document.getElementById('totalGet').textContent   = get;
        document.getElementById('totalPost').textContent  = post;
        document.getElementById('totalPatch').textContent = pp;
      }});
    }}

    // ── Aplicar filtro por tag ────────────────────────────────────────────────
    function applyFilter(tag) {{
      var sections = document.querySelectorAll('#swagger-ui .opblock-tag-section');
      sections.forEach(function(section) {{
        if (tag === 'all') {{
          section.style.display = '';
          return;
        }}
        var heading = section.querySelector('.opblock-tag h3, .opblock-tag span, h3');
        var text = heading ? heading.textContent.toLowerCase().trim() : '';
        section.style.display = text.includes(tag.toLowerCase()) ? '' : 'none';
      }});
    }}

    // ── Filtrar tag (llamado desde el sidebar) ────────────────────────────────
    function filterTag(tag) {{
      _activeTag = tag;
      document.querySelectorAll('.sidebar-item').forEach(function(el) {{
        el.classList.toggle('active', el.dataset.tag === tag);
      }});
      var sections = document.querySelectorAll('#swagger-ui .opblock-tag-section');
      if (sections.length > 0) {{
        applyFilter(tag);
      }} else {{
        waitForSwaggerDOM('#swagger-ui .opblock-tag-section', function() {{
          applyFilter(tag);
        }});
      }}
    }}

    // ── Búsqueda por texto ────────────────────────────────────────────────────
    document.getElementById('searchInput').addEventListener('input', function() {{
      var q = this.value.toLowerCase().trim();
      if (!q) {{
        filterTag(_activeTag);
        return;
      }}
      document.querySelectorAll('.sidebar-item').forEach(function(el) {{
        el.classList.remove('active');
      }});
      var sections = document.querySelectorAll('#swagger-ui .opblock-tag-section');
      sections.forEach(function(section) {{
        section.style.display = '';
        var anyVisible = false;
        section.querySelectorAll('.opblock').forEach(function(op) {{
          var path = op.querySelector('.opblock-summary-path, .opblock-summary-path__deprecated');
          var desc = op.querySelector('.opblock-summary-description');
          var text = ((path ? path.textContent : '') + ' ' + (desc ? desc.textContent : '')).toLowerCase();
          var visible = text.includes(q);
          op.style.display = visible ? '' : 'none';
          if (visible) anyVisible = true;
        }});
        section.style.display = anyVisible ? '' : 'none';
      }});
    }});

    // ── Inicializar Swagger UI ────────────────────────────────────────────────
    const ui = SwaggerUIBundle({{
      url: "./{swagger_json_name}",
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      plugins: [SwaggerUIBundle.plugins.DownloadUrl],
      layout: 'StandaloneLayout',
      deepLinking: true,
      displayRequestDuration: true,
      defaultModelsExpandDepth: -1,
      docExpansion: 'none',
      filter: false,

      // ── FIX 1: Habilitar "Try it out" en todos los endpoints por defecto ──
      tryItOutEnabled: true,

      // ── FIX 2: Mantener el token aunque se recargue la página ──────────────
      persistAuthorization: true,

      // ── FIX 3: Interceptor de requests ─────────────────────────────────────
      // Tu backend local (authToken.mjs) usa verifyLocalAccessToken(token)
      // que espera el token SIN el prefijo "Bearer ".
      // Swagger UI con type:apiKey envía el valor tal cual lo pegaste.
      // Este interceptor garantiza que el header Authorization siempre sea:
      //   "Bearer <token_limpio>"
      // sin importar si el usuario pegó el token con o sin "Bearer ".
      requestInterceptor: function(request) {{
        var authHeader = request.headers['Authorization'] || request.headers['authorization'];
        if (authHeader) {{
          // Extraer el token puro (quitar cualquier prefijo Bearer/bearer)
          var rawToken = authHeader.replace(/^[Bb]earer\\s+/, '').trim();

          // Tu middleware de Express/Lambda debe recibir "Bearer <token>"
          // para hacer: token = header.split(' ')[1]
          // Si tu código ya hace eso, este formato es correcto.
          // Si tu código recibe el token directo sin Bearer, cambia a solo rawToken.
          request.headers['Authorization'] = 'Bearer ' + rawToken;
        }}
        return request;
      }},

      onComplete: function() {{
        countStats();
        if (_activeTag !== 'all') {{
          applyFilter(_activeTag);
        }}

        // ── Personalizar el placeholder del input de autorización ────────────
        // Esperar a que aparezca el modal de auth si está abierto
        var observer = new MutationObserver(function() {{
          var authInputs = document.querySelectorAll(
            '#swagger-ui input[type=text][placeholder*="api"], ' +
            '#swagger-ui .auth-container input[type=text]'
          );
          authInputs.forEach(function(input) {{
            input.placeholder = 'Pega solo el token (sin "Bearer ")';
          }});
        }});
        observer.observe(document.getElementById('swagger-ui'), {{
          childList: true,
          subtree: true
        }});
      }}
    }});
  </script>
</body>
</html>"""


# ── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 3:
        print("Uso: python3 generate_swagger_page.py <swagger.yaml> <output-dir>")
        sys.exit(1)

    yaml_path  = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])

    if not yaml_path.exists():
        print(f"❌ No se encontró el archivo: {yaml_path}")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    data = load_swagger(yaml_path)

    swagger_json_name = "swagger.json"
    json_path = output_dir / swagger_json_name
    print(f"🔄 Convirtiendo YAML → JSON...")
    json_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, cls=SafeJsonEncoder),
        encoding="utf-8"
    )
    print(f"✅ JSON guardado: {json_path}")

    meta = extract_meta(data)
    print(f"📋 Metadata: {meta['title']} v{meta['version']}")

    html = generate_html(meta, swagger_json_name)
    html_path = output_dir / "index.html"
    html_path.write_text(html, encoding="utf-8")
    print(f"✅ HTML guardado: {html_path}")

    print("🎉 Documentación generada correctamente.")


if __name__ == "__main__":
    main()
