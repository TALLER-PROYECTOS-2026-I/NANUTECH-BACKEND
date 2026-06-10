#!/usr/bin/env python3
"""
generate_swagger_page.py  —  v2 Light Edition
Convierte un swagger YAML a JSON y genera una página HTML profesional
con paleta clara inspirada en Lab2Next (blanco / índigo / slate).

Fixes incluidos:
  1. tryItOutEnabled: true
  2. requestInterceptor normaliza Bearer
  3. persistAuthorization: true
  4. Modal Authorize dark override eliminado (ahora es light)
"""

import sys
import re
import json
import datetime
from pathlib import Path

try:
    import yaml
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyyaml", "--quiet"])
    import yaml


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


def extract_meta(data: dict) -> dict:
    info    = data.get("info", {})
    title   = info.get("title", "API Documentation")
    version = str(info.get("version", "1.0"))
    host    = data.get("host", "")
    base    = data.get("basePath", "/")
    build   = datetime.datetime.utcnow().strftime("%d %b %Y %H:%M UTC")
    return dict(title=title, version=version, host=host, base=base, build=build)


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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

    :root {{
      /* ── Paleta Lab2Next-inspired ── */
      --bg:          #F0F4F9;
      --bg2:         #FFFFFF;
      --bg3:         #F8FAFC;
      --surface:     #FFFFFF;
      --surface2:    #F1F5F9;

      --border:      #E2E8F0;
      --border2:     #CBD5E1;

      --accent:      #2563EB;
      --accent-h:    #1D4ED8;
      --accent-light:#EFF6FF;
      --accent-mid:  #BFDBFE;

      --green:       #059669;
      --green-bg:    #ECFDF5;
      --green-border:#A7F3D0;

      --blue:        #0284C7;
      --blue-bg:     #F0F9FF;
      --blue-border: #BAE6FD;

      --amber:       #D97706;
      --amber-bg:    #FFFBEB;
      --amber-border:#FDE68A;

      --red:         #DC2626;
      --red-bg:      #FEF2F2;
      --red-border:  #FECACA;

      --purple:      #7C3AED;
      --purple-bg:   #F5F3FF;
      --purple-border:#DDD6FE;

      --slate:       #0F172A;
      --slate2:      #1E293B;
      --text:        #0F172A;
      --text2:       #475569;
      --text3:       #94A3B8;
      --text4:       #CBD5E1;

      --font:        'Inter', system-ui, sans-serif;
      --mono:        'JetBrains Mono', monospace;
      --radius:      10px;
      --radius-sm:   7px;
      --radius-lg:   14px;
      --shadow-sm:   0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06);
      --shadow:      0 4px 16px rgba(15,23,42,0.10);
      --shadow-lg:   0 10px 40px rgba(15,23,42,0.12);
      --sidebar-w:   256px;
      --header-h:    60px;
    }}

    html {{ scroll-behavior: smooth; }}
    body {{
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }}

    ::-webkit-scrollbar {{ width: 5px; height: 5px; }}
    ::-webkit-scrollbar-track {{ background: var(--bg3); }}
    ::-webkit-scrollbar-thumb {{ background: var(--border2); border-radius: 3px; }}
    ::-webkit-scrollbar-thumb:hover {{ background: var(--accent); }}

    /* ═══════════════════════════════════════════
       HEADER
    ═══════════════════════════════════════════ */
    .header {{
      position: fixed; top: 0; left: 0; right: 0; height: var(--header-h);
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; z-index: 1000;
      box-shadow: var(--shadow-sm);
    }}
    .header-left {{ display: flex; align-items: center; gap: 12px; }}
    .logo-mark {{
      width: 34px; height: 34px;
      background: var(--accent);
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 800; color: #fff;
      letter-spacing: -0.5px;
      box-shadow: 0 2px 8px rgba(37,99,235,0.35);
      flex-shrink: 0;
    }}
    .header-title {{
      font-size: 14px; font-weight: 700;
      color: var(--slate); letter-spacing: -0.2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;
    }}
    .header-divider {{ width: 1px; height: 18px; background: var(--border); }}
    .header-subtitle {{ font-size: 12px; color: var(--text3); font-weight: 400; }}
    .header-right {{ display: flex; align-items: center; gap: 8px; }}

    .badge {{
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 600; font-family: var(--mono);
      letter-spacing: 0.01em;
    }}
    .badge-version {{
      background: var(--purple-bg); color: var(--purple);
      border: 1px solid var(--purple-border);
    }}
    .badge-live {{
      background: var(--green-bg); color: var(--green);
      border: 1px solid var(--green-border);
    }}
    .badge-live::before {{
      content: ''; width: 6px; height: 6px; background: var(--green);
      border-radius: 50%; animation: pulse 2s infinite;
    }}
    @keyframes pulse {{
      0%, 100% {{ opacity: 1; transform: scale(1); }}
      50%       {{ opacity: 0.5; transform: scale(0.7); }}
    }}

    /* ═══════════════════════════════════════════
       LAYOUT
    ═══════════════════════════════════════════ */
    .layout {{ display: flex; padding-top: var(--header-h); min-height: 100vh; }}

    /* ═══════════════════════════════════════════
       SIDEBAR
    ═══════════════════════════════════════════ */
    .sidebar {{
      width: var(--sidebar-w); flex-shrink: 0;
      background: var(--bg2);
      border-right: 1px solid var(--border);
      position: fixed; top: var(--header-h); bottom: 0; left: 0;
      overflow-y: auto; padding: 16px 0;
      display: flex; flex-direction: column;
    }}
    .sidebar-section {{ padding: 0 0 8px; }}
    .sidebar-label {{
      padding: 0 16px 6px;
      font-size: 10px; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--text3);
    }}
    .sidebar-item {{
      display: flex; align-items: center; gap: 9px;
      padding: 7px 16px; cursor: pointer;
      font-size: 13px; font-weight: 500; color: var(--text2);
      border-left: 2px solid transparent;
      transition: all 0.14s; border-radius: 0;
      margin: 1px 0;
    }}
    .sidebar-item:hover {{
      color: var(--accent);
      background: var(--accent-light);
      border-left-color: var(--accent-mid);
    }}
    .sidebar-item.active {{
      color: var(--accent);
      background: var(--accent-light);
      border-left-color: var(--accent);
      font-weight: 600;
    }}
    .method-dot {{ width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }}
    .sidebar-divider {{ height: 1px; background: var(--border); margin: 8px 16px; }}

    /* ─── Search ─── */
    .search-wrap {{ padding: 12px 12px 8px; }}
    .search-box {{ position: relative; }}
    .search-icon {{
      position: absolute; left: 10px; top: 50%;
      transform: translateY(-50%); color: var(--text3); pointer-events: none;
    }}
    .search-input {{
      width: 100%;
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 8px 12px 8px 32px;
      font-size: 12px; color: var(--text); font-family: var(--font);
      outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    }}
    .search-input:focus {{
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
    }}
    .search-input::placeholder {{ color: var(--text3); }}

    /* ═══════════════════════════════════════════
       MAIN
    ═══════════════════════════════════════════ */
    .main {{ flex: 1; margin-left: var(--sidebar-w); min-height: calc(100vh - var(--header-h)); }}

    /* ═══════════════════════════════════════════
       HERO
    ═══════════════════════════════════════════ */
    .hero {{
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
      padding: 40px 48px 36px;
      position: relative; overflow: hidden;
    }}
    .hero::after {{
      content: '';
      position: absolute; top: 0; right: 0; bottom: 0;
      width: 340px;
      background: linear-gradient(135deg, var(--accent-light) 0%, transparent 70%);
      pointer-events: none;
    }}
    .hero-eyebrow {{
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 20px;
      background: var(--accent-light);
      border: 1px solid var(--accent-mid);
      font-size: 10px; font-weight: 700; color: var(--accent);
      letter-spacing: 0.07em; text-transform: uppercase;
      margin-bottom: 14px;
    }}
    .hero h1 {{
      font-size: 28px; font-weight: 800; color: var(--slate);
      line-height: 1.15; margin-bottom: 10px; letter-spacing: -0.5px;
    }}
    .hero h1 em {{ font-style: normal; color: var(--accent); }}
    .hero-sub {{
      font-size: 14px; color: var(--text2); line-height: 1.65;
      max-width: 520px; margin-bottom: 24px;
    }}
    .hero-pills {{ display: flex; flex-wrap: wrap; gap: 8px; }}
    .hero-pill {{
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 12px; border-radius: 6px;
      font-size: 11px; font-weight: 500; color: var(--text2);
      background: var(--bg3); border: 1px solid var(--border);
    }}
    .hero-pill svg {{ color: var(--text3); }}

    /* ═══════════════════════════════════════════
       STATS BAR
    ═══════════════════════════════════════════ */
    .stats {{
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      border-bottom: 1px solid var(--border);
      background: var(--bg2);
    }}
    .stat-item {{
      padding: 18px 24px;
      display: flex; flex-direction: column; gap: 3px;
      border-right: 1px solid var(--border);
    }}
    .stat-item:last-child {{ border-right: none; }}
    .stat-value {{
      font-size: 24px; font-weight: 800; color: var(--slate);
      font-family: var(--mono); line-height: 1; letter-spacing: -1px;
    }}
    .stat-value.c-accent  {{ color: var(--accent); }}
    .stat-value.c-green   {{ color: var(--green); }}
    .stat-value.c-blue    {{ color: var(--blue); }}
    .stat-value.c-amber   {{ color: var(--amber); }}
    .stat-value.c-purple  {{ color: var(--purple); }}
    .stat-label {{
      font-size: 10px; color: var(--text3); font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.06em;
    }}

    /* ═══════════════════════════════════════════
       TOKEN HINT
    ═══════════════════════════════════════════ */
    .token-hint {{
      display: flex; align-items: center; gap: 10px;
      background: var(--accent-light);
      border: 1px solid var(--accent-mid);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-size: 12px; color: var(--text2);
      margin-bottom: 24px;
    }}
    .token-hint svg {{ flex-shrink: 0; color: var(--accent); }}
    .token-hint strong {{ color: var(--accent); font-weight: 600; }}
    .token-hint code {{
      font-family: var(--mono); font-size: 11px;
      background: white; border: 1px solid var(--accent-mid);
      border-radius: 4px; padding: 1px 5px; color: var(--accent);
    }}

    /* ═══════════════════════════════════════════
       SWAGGER WRAP
    ═══════════════════════════════════════════ */
    .swagger-wrap {{ padding: 28px 40px 64px; }}

    /* ═══════════════════════════════════════════
       SWAGGER UI OVERRIDES — Light theme
    ═══════════════════════════════════════════ */
    #swagger-ui .swagger-ui {{ font-family: var(--font) !important; color: var(--text) !important; }}
    #swagger-ui .swagger-ui .topbar      {{ display: none !important; }}
    #swagger-ui .swagger-ui .info        {{ display: none !important; }}
    #swagger-ui .swagger-ui .filter-container {{ display: none !important; }}

    /* Scheme container — rediseñado */
    #swagger-ui .swagger-ui .scheme-container {{
      background: var(--bg2) !important;
      border: 1px solid var(--border) !important;
      border-radius: var(--radius-lg) !important;
      padding: 14px 20px !important;
      box-shadow: var(--shadow-sm) !important;
      margin-bottom: 20px !important;
      display: flex !important;
      align-items: center !important;
    }}
    #swagger-ui .swagger-ui select {{
      background: var(--bg3) !important; color: var(--text) !important;
      border: 1px solid var(--border) !important;
      border-radius: 6px !important;
      font-family: var(--mono) !important; font-size: 12px !important;
      padding: 6px 10px !important; box-shadow: none !important;
    }}

    /* Authorize button */
    #swagger-ui .swagger-ui .btn.authorize {{
      background: var(--accent) !important;
      border-color: var(--accent) !important;
      color: #fff !important;
      border-radius: 7px !important;
      font-weight: 600 !important;
      font-size: 13px !important;
      padding: 8px 16px !important;
      box-shadow: 0 2px 6px rgba(37,99,235,0.3) !important;
      transition: background 0.15s !important;
    }}
    #swagger-ui .swagger-ui .btn.authorize:hover {{
      background: var(--accent-h) !important;
    }}
    #swagger-ui .swagger-ui .btn.authorize svg {{ fill: #fff !important; }}

    /* Operation blocks — rediseñados con más personalidad */
    #swagger-ui .swagger-ui .opblock {{
      border-radius: var(--radius) !important;
      border: 1px solid var(--border) !important;
      background: var(--bg2) !important;
      box-shadow: none !important;
      margin-bottom: 6px !important;
      overflow: hidden !important;
      transition: box-shadow 0.15s, border-color 0.15s !important;
    }}
    #swagger-ui .swagger-ui .opblock:last-child {{ margin-bottom: 0 !important; }}
    #swagger-ui .swagger-ui .opblock:hover {{
      box-shadow: var(--shadow-sm) !important;
      border-color: var(--border2) !important;
    }}
    #swagger-ui .swagger-ui .opblock.is-open {{
      box-shadow: var(--shadow) !important;
      border-color: var(--border2) !important;
    }}
    #swagger-ui .swagger-ui .opblock .opblock-summary {{
      border-bottom: none !important; padding: 10px 14px !important;
      cursor: pointer;
    }}
    #swagger-ui .swagger-ui .opblock .opblock-summary-method {{
      border-radius: 6px !important; font-family: var(--mono) !important;
      font-size: 10px !important; font-weight: 700 !important;
      min-width: 64px !important; text-align: center !important;
      padding: 4px 0 !important; letter-spacing: 0.04em !important;
    }}
    #swagger-ui .swagger-ui .opblock-summary-path {{
      font-family: var(--mono) !important; font-size: 13px !important;
      color: var(--slate) !important; font-weight: 500 !important;
    }}
    #swagger-ui .swagger-ui .opblock-summary-description {{
      color: var(--text2) !important; font-size: 12px !important;
    }}
    #swagger-ui .swagger-ui .opblock-summary-path b {{ font-weight: 600 !important; }}

    /* Method colors */
    #swagger-ui .swagger-ui .opblock-get {{
      background: var(--blue-bg) !important;
      border-color: var(--blue-border) !important;
    }}
    #swagger-ui .swagger-ui .opblock-post {{
      background: var(--green-bg) !important;
      border-color: var(--green-border) !important;
    }}
    #swagger-ui .swagger-ui .opblock-put {{
      background: var(--amber-bg) !important;
      border-color: var(--amber-border) !important;
    }}
    #swagger-ui .swagger-ui .opblock-patch {{
      background: var(--amber-bg) !important;
      border-color: var(--amber-border) !important;
    }}
    #swagger-ui .swagger-ui .opblock-delete {{
      background: var(--red-bg) !important;
      border-color: var(--red-border) !important;
    }}

    #swagger-ui .swagger-ui .opblock-get    .opblock-summary-method {{ background: var(--blue)  !important; color:#fff !important; }}
    #swagger-ui .swagger-ui .opblock-post   .opblock-summary-method {{ background: var(--green) !important; color:#fff !important; }}
    #swagger-ui .swagger-ui .opblock-put    .opblock-summary-method {{ background: var(--amber) !important; color:#fff !important; }}
    #swagger-ui .swagger-ui .opblock-patch  .opblock-summary-method {{ background: #B45309     !important; color:#fff !important; }}
    #swagger-ui .swagger-ui .opblock-delete .opblock-summary-method {{ background: var(--red)  !important; color:#fff !important; }}

    /* Body — CAMBIADO: era negro nativo de Swagger, ahora usa paleta clara */
    #swagger-ui .swagger-ui .opblock-body {{
      background: var(--bg3) !important;
      border-top: 1px solid var(--border) !important;
    }}
    #swagger-ui .swagger-ui .opblock-section-header {{
      background: var(--bg2) !important;
      border-bottom: 1px solid var(--border) !important;
      padding: 10px 16px !important;
      box-shadow: none !important;
    }}
    #swagger-ui .swagger-ui .opblock-section-header h4 {{
      color: var(--text2) !important; font-size: 11px !important;
      font-weight: 700 !important; text-transform: uppercase !important;
      letter-spacing: 0.06em !important;
    }}

    /* Parameters table */
    #swagger-ui .swagger-ui table.parameters {{ border-collapse: collapse !important; }}
    #swagger-ui .swagger-ui table.parameters th {{
      color: var(--text3) !important; font-size: 10px !important;
      font-weight: 700 !important; padding: 8px 14px !important;
      border-bottom: 1px solid var(--border) !important;
      background: var(--bg3) !important; text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
    }}
    #swagger-ui .swagger-ui table.parameters td {{
      color: var(--text) !important; padding: 10px 14px !important;
      border-bottom: 1px solid var(--border) !important; font-size: 13px !important;
      background: var(--bg2) !important;
    }}
    #swagger-ui .swagger-ui .parameter__name {{
      font-family: var(--mono) !important; font-size: 13px !important;
      color: var(--accent) !important; font-weight: 500 !important;
    }}
    #swagger-ui .swagger-ui .parameter__type {{
      font-family: var(--mono) !important; font-size: 11px !important;
      color: var(--text3) !important;
    }}
    #swagger-ui .swagger-ui .parameter__in {{
      font-size: 10px !important; color: var(--text3) !important;
      font-style: italic !important;
    }}
    #swagger-ui .swagger-ui .parameter__deprecated {{
      color: var(--red) !important;
    }}

    /* ── Fondo raíz de Swagger — esto es lo que causa el negro ── */
    #swagger-ui                                 {{ background: transparent !important; }}
    #swagger-ui .swagger-ui                     {{ background: transparent !important; }}
    #swagger-ui .swagger-ui .wrapper            {{ background: transparent !important; padding: 0 !important; max-width: 100% !important; }}
    #swagger-ui .swagger-ui .block              {{ background: transparent !important; }}

    /* Tags / sections — rediseñadas con paleta clara */
    #swagger-ui .swagger-ui .opblock-tag-section {{
      background: var(--bg2) !important;
      border: 1px solid var(--border) !important;
      border-radius: var(--radius-lg) !important;
      margin-bottom: 12px !important;
      overflow: hidden !important;
      box-shadow: var(--shadow-sm) !important;
      transition: box-shadow 0.15s !important;
    }}
    #swagger-ui .swagger-ui .opblock-tag-section:hover {{
      box-shadow: var(--shadow) !important;
    }}
    #swagger-ui .swagger-ui .opblock-tag {{
      background: var(--bg2) !important;
      border-bottom: 1px solid var(--border) !important;
      padding: 14px 20px !important;
      margin-bottom: 0 !important;
      cursor: pointer !important;
      transition: background 0.13s !important;
    }}
    #swagger-ui .swagger-ui .opblock-tag:hover {{
      background: var(--accent-light) !important;
    }}
    #swagger-ui .swagger-ui .opblock-tag h3 {{
      color: var(--slate) !important; font-size: 15px !important;
      font-weight: 700 !important; letter-spacing: -0.2px !important;
      display: flex !important; align-items: center !important; gap: 10px !important;
    }}
    #swagger-ui .swagger-ui .opblock-tag h3::before {{
      content: '' !important;
      display: inline-block !important;
      width: 8px !important; height: 8px !important;
      border-radius: 50% !important;
      background: var(--accent) !important;
      flex-shrink: 0 !important;
    }}
    #swagger-ui .swagger-ui .opblock-tag small {{
      color: var(--text3) !important; font-size: 12px !important;
      font-weight: 400 !important; margin-left: 4px !important;
    }}
    #swagger-ui .swagger-ui .expand-operation svg {{ fill: var(--text3) !important; }}

    /* Contenedor de los opblocks dentro de cada sección */
    #swagger-ui .swagger-ui .opblock-tag-section > div:not(.opblock-tag) {{
      background: var(--bg3) !important;
      padding: 12px 16px !important;
    }}

    /* Buttons */
    #swagger-ui .swagger-ui .btn {{
      font-family: var(--font) !important; font-size: 12px !important;
      font-weight: 600 !important; border-radius: 7px !important;
      transition: all 0.15s !important; cursor: pointer !important;
    }}
    #swagger-ui .swagger-ui .btn.try-out__btn {{
      background: transparent !important; color: var(--accent) !important;
      border: 1px solid var(--accent) !important; padding: 6px 14px !important;
    }}
    #swagger-ui .swagger-ui .btn.try-out__btn:hover {{
      background: var(--accent-light) !important;
    }}
    #swagger-ui .swagger-ui .btn.execute {{
      background: var(--accent) !important;
      border-color: var(--accent) !important; color: #fff !important;
      box-shadow: 0 2px 6px rgba(37,99,235,0.25) !important;
    }}
    #swagger-ui .swagger-ui .btn.execute:hover {{
      background: var(--accent-h) !important;
    }}
    #swagger-ui .swagger-ui .btn.cancel {{
      background: transparent !important;
      border: 1px solid var(--border2) !important; color: var(--text2) !important;
    }}

    /* Response codes */
    #swagger-ui .swagger-ui .responses-inner {{
      background: var(--bg3) !important;
    }}
    #swagger-ui .swagger-ui .response-col_status {{
      font-family: var(--mono) !important; font-size: 13px !important;
      font-weight: 700 !important; color: var(--green) !important;
    }}
    #swagger-ui .swagger-ui .response-col_description {{
      color: var(--text2) !important;
    }}

    /* Code blocks — slate2 es el único negro permitido, solo para sintaxis */
    #swagger-ui .swagger-ui .highlight-code pre {{
      background: var(--slate2) !important; color: #e2e8f0 !important;
      border: none !important; border-radius: var(--radius-sm) !important;
      font-family: var(--mono) !important; font-size: 12px !important;
    }}
    #swagger-ui .swagger-ui .microlight {{ background: var(--slate2) !important; }}

    /* Inputs */
    #swagger-ui .swagger-ui input[type=text],
    #swagger-ui .swagger-ui input[type=password],
    #swagger-ui .swagger-ui textarea {{
      background: var(--bg2) !important;
      border: 1px solid var(--border2) !important;
      border-radius: 7px !important; color: var(--text) !important;
      font-family: var(--mono) !important; font-size: 13px !important;
    }}
    #swagger-ui .swagger-ui input[type=text]:focus,
    #swagger-ui .swagger-ui input[type=password]:focus,
    #swagger-ui .swagger-ui textarea:focus {{
      border-color: var(--accent) !important; outline: none !important;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important;
    }}

    /* Models */
    #swagger-ui .swagger-ui .models {{
      background: var(--bg2) !important;
      border: 1px solid var(--border) !important;
      border-radius: var(--radius) !important;
    }}
    #swagger-ui .swagger-ui .models h4 {{
      color: var(--slate) !important; font-size: 14px !important;
    }}
    #swagger-ui .swagger-ui section.models .model-container {{
      background: var(--bg3) !important;
      border-radius: var(--radius-sm) !important;
    }}

    /* Required asterisk */
    #swagger-ui .swagger-ui .parameter__name.required::after {{
      color: var(--red) !important;
    }}

    /* ── FIX negro nativo Swagger: model-box, ejemplo JSON, modal Authorize ── */
    #swagger-ui .swagger-ui .model-box          {{ background: var(--bg3) !important; }}
    #swagger-ui .swagger-ui .model              {{ color: var(--text) !important; }}
    #swagger-ui .swagger-ui .model-title        {{ color: var(--slate) !important; }}
    #swagger-ui .swagger-ui .prop-type          {{ color: var(--blue) !important; }}
    #swagger-ui .swagger-ui .prop-format        {{ color: var(--text3) !important; }}
    #swagger-ui .swagger-ui .example            {{ background: var(--bg3) !important; color: var(--text) !important; }}
    #swagger-ui .swagger-ui .example__section   {{ background: var(--bg3) !important; }}

    /* ── FIX negro en toda la zona de contenido de Swagger ── */
    #swagger-ui .swagger-ui .information-container {{ background: transparent !important; }}
    #swagger-ui .swagger-ui .no-margin             {{ background: transparent !important; }}
    #swagger-ui .swagger-ui section                {{ background: transparent !important; }}
    #swagger-ui .swagger-ui .errors-wrapper        {{ background: var(--red-bg) !important; border: 1px solid var(--red-border) !important; border-radius: var(--radius) !important; }}
    #swagger-ui .swagger-ui .loading-container     {{ background: transparent !important; }}

    /* Texto que queda blanco sobre negro cuando no se sobreescribe */
    #swagger-ui .swagger-ui .opblock-tag h3,
    #swagger-ui .swagger-ui .opblock-tag h3 a,
    #swagger-ui .swagger-ui .opblock-tag h3 span  {{ color: var(--slate) !important; }}
    #swagger-ui .swagger-ui .opblock-tag a         {{ color: var(--text2) !important; text-decoration: none !important; }}

    /* Línea separadora entre secciones — era blanca sobre negro, ahora invisible */
    #swagger-ui .swagger-ui .opblock-tag           {{ border-color: var(--border) !important; }}

    /* Modal Authorize — ahora totalmente claro */
    #swagger-ui .swagger-ui .dialog-ux          {{ background: rgba(15,23,42,0.45) !important; }}
    #swagger-ui .swagger-ui .dialog-ux .modal-ux {{
      background: var(--bg2) !important; color: var(--text) !important;
      border: 1px solid var(--border) !important;
      border-radius: var(--radius-lg) !important;
      box-shadow: var(--shadow-lg) !important;
    }}
    #swagger-ui .swagger-ui .dialog-ux .modal-ux-header {{
      background: var(--bg2) !important;
      border-bottom: 1px solid var(--border) !important;
      padding: 16px 20px !important;
    }}
    #swagger-ui .swagger-ui .dialog-ux .modal-ux-header h3 {{
      color: var(--slate) !important; font-size: 16px !important; font-weight: 700 !important;
    }}
    #swagger-ui .swagger-ui .dialog-ux .modal-ux-content {{ background: var(--bg2) !important; padding: 16px 20px !important; }}
    #swagger-ui .swagger-ui .auth-container {{
      background: var(--bg3) !important;
      border: 1px solid var(--border) !important;
      border-radius: var(--radius) !important;
      padding: 14px 16px !important;
      margin-bottom: 12px !important;
    }}
    #swagger-ui .swagger-ui .auth-container h4  {{ color: var(--slate) !important; font-size: 14px !important; font-weight: 700 !important; }}
    #swagger-ui .swagger-ui .auth-container p   {{ color: var(--text2) !important; font-size: 13px !important; }}
    #swagger-ui .swagger-ui .auth-container code {{
      background: var(--bg2) !important; color: var(--accent) !important;
      border: 1px solid var(--border) !important;
      border-radius: 4px !important; padding: 1px 5px !important;
      font-family: var(--mono) !important;
    }}
    #swagger-ui .swagger-ui .close-modal svg {{ fill: var(--text2) !important; }}
    #swagger-ui .swagger-ui .auth-btn-wrapper .btn-done {{
      background: var(--accent) !important; color: #fff !important;
      border-color: var(--accent) !important;
    }}

    /* ═══════════════════════════════════════════
       FOOTER
    ═══════════════════════════════════════════ */
    .footer {{
      background: var(--bg2);
      border-top: 1px solid var(--border);
      padding: 18px 40px;
      display: flex; align-items: center; justify-content: space-between;
      font-size: 11px; color: var(--text3);
    }}
    .footer a {{ color: var(--text3); text-decoration: none; }}
    .footer a:hover {{ color: var(--accent); }}

    /* ═══════════════════════════════════════════
       RESPONSIVE
    ═══════════════════════════════════════════ */
    @media (max-width: 768px) {{
      :root {{ --sidebar-w: 0px; }}
      .sidebar {{ display: none; }}
      .hero {{ padding: 28px 20px 24px; }}
      .hero h1 {{ font-size: 22px; }}
      .swagger-wrap {{ padding: 20px 16px 48px; }}
      .stats {{ grid-template-columns: repeat(3,1fr); }}
      .footer {{ flex-direction: column; gap: 6px; text-align: center; }}
    }}
  </style>
</head>
<body>

  <header class="header">
    <div class="header-left">
      <div class="logo-mark">N</div>
      <span class="header-title">{t}</span>
      <div class="header-divider"></div>
      <span class="header-subtitle">REST API</span>
    </div>
    <div class="header-right">
      <span class="badge badge-version">v{v}</span>
      <span class="badge badge-live">Live</span>
    </div>
  </header>

  <div class="layout">

    <!-- ═══════ SIDEBAR ═══════ -->
    <aside class="sidebar" id="sidebar">
      <div class="search-wrap">
        <div class="search-box">
          <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input class="search-input" type="text" placeholder="Buscar endpoints..." id="searchInput"/>
        </div>
      </div>

      <div style="padding:4px 0 0;">
        <div class="sidebar-label" style="margin-top:8px;">Módulos</div>

        <div class="sidebar-item active" data-tag="all" onclick="filterTag('all')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Todos los endpoints
        </div>

        <div class="sidebar-item" data-tag="alertas"     onclick="filterTag('alertas')"><span class="method-dot" style="background:#EF4444"></span>Alertas</div>
        <div class="sidebar-item" data-tag="auditoria"   onclick="filterTag('auditoria')"><span class="method-dot" style="background:#F59E0B"></span>Auditoría</div>
        <div class="sidebar-item" data-tag="auth"        onclick="filterTag('auth')"><span class="method-dot" style="background:#2563EB"></span>Autenticación</div>
        <div class="sidebar-item" data-tag="camiones"    onclick="filterTag('camiones')"><span class="method-dot" style="background:#0284C7"></span>Camiones</div>
        <div class="sidebar-item" data-tag="combustible" onclick="filterTag('combustible')"><span class="method-dot" style="background:#EA580C"></span>Combustible</div>
        <div class="sidebar-item" data-tag="conductores" onclick="filterTag('conductores')"><span class="method-dot" style="background:#059669"></span>Conductores</div>
        <div class="sidebar-item" data-tag="contratos"   onclick="filterTag('contratos')"><span class="method-dot" style="background:#7C3AED"></span>Contratos</div>
        <div class="sidebar-item" data-tag="dashboard"   onclick="filterTag('dashboard')"><span class="method-dot" style="background:#16A34A"></span>Dashboard</div>
        <div class="sidebar-item" data-tag="gps"         onclick="filterTag('gps')"><span class="method-dot" style="background:#DB2777"></span>GPS</div>
        <div class="sidebar-item" data-tag="jornadas"    onclick="filterTag('jornadas')"><span class="method-dot" style="background:#6D28D9"></span>Jornadas</div>
        <div class="sidebar-item" data-tag="unidades"    onclick="filterTag('unidades')"><span class="method-dot" style="background:#10B981"></span>Unidades</div>
      </div>

      <div class="sidebar-divider"></div>

      <div style="padding:0 0 8px;">
        <div class="sidebar-label">Servidor</div>
        <div class="sidebar-item" style="cursor:default;font-size:11px;color:var(--text3);gap:7px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {h}
        </div>
        <div class="sidebar-item" style="cursor:default;font-size:11px;color:var(--text3);gap:7px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          Base: {b}
        </div>
        <div class="sidebar-item" style="cursor:default;font-size:11px;color:var(--text3);gap:7px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {bd}
        </div>
      </div>
    </aside>

    <!-- ═══════ MAIN ═══════ -->
    <main class="main">

      <!-- HERO -->
      <section class="hero">
        <div class="hero-eyebrow">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          REST API
        </div>
        <h1>{t} <em>API</em></h1>
        <p class="hero-sub">Documentación interactiva. Explora endpoints, prueba peticiones en tiempo real y revisa esquemas de respuesta directamente desde el navegador.</p>
        <div class="hero-pills">
          <span class="hero-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            HTTPS · TLS 1.0+
          </span>
          <span class="hero-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            AWS API Gateway
          </span>
          <span class="hero-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Bearer JWT
          </span>
          <span class="hero-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {bd}
          </span>
        </div>
      </section>

      <!-- STATS -->
      <div class="stats">
        <div class="stat-item">
          <span class="stat-value c-accent" id="totalEndpoints">—</span>
          <span class="stat-label">Endpoints</span>
        </div>
        <div class="stat-item">
          <span class="stat-value c-blue" id="totalGet">—</span>
          <span class="stat-label">GET</span>
        </div>
        <div class="stat-item">
          <span class="stat-value c-green" id="totalPost">—</span>
          <span class="stat-label">POST</span>
        </div>
        <div class="stat-item">
          <span class="stat-value c-amber" id="totalPatch">—</span>
          <span class="stat-label">PATCH / PUT</span>
        </div>
        <div class="stat-item">
          <span class="stat-value c-purple">11</span>
          <span class="stat-label">Módulos</span>
        </div>
      </div>

      <!-- SWAGGER -->
      <div class="swagger-wrap">

        <div class="token-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>
            Ejecuta <strong>POST /auth/login</strong>, copia el token y haz clic en
            <strong>Authorize 🔒</strong> — pega <strong>solo el token</strong> sin prefijo.
            El interceptor agrega <code>Bearer</code> automáticamente.
          </span>
        </div>

        <div id="swagger-ui"></div>
      </div>

      <footer class="footer">
        <span>{t} · {bd}</span>
        <span>Powered by <a href="https://swagger.io" target="_blank">Swagger UI v5</a></span>
      </footer>

    </main>
  </div><!-- /.layout -->

  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    let _activeTag = 'all';

    function waitForSwaggerDOM(selector, callback, maxWait) {{
      maxWait = maxWait || 10000;
      const start = Date.now();
      const iv = setInterval(function() {{
        const els = document.querySelectorAll(selector);
        if (els.length > 0) {{ clearInterval(iv); callback(els); }}
        else if (Date.now() - start > maxWait) {{ clearInterval(iv); }}
      }}, 150);
    }}

    /* ── FIX STATS: recalcula solo los endpoints visibles ── */
    function countStats() {{
      const ops = Array.from(document.querySelectorAll('#swagger-ui .opblock'))
                       .filter(function(op) {{ return op.style.display !== 'none'; }});
      let get = 0, post = 0, pp = 0;
      ops.forEach(function(op) {{
        if (op.classList.contains('opblock-get'))                                          get++;
        if (op.classList.contains('opblock-post'))                                         post++;
        if (op.classList.contains('opblock-patch') || op.classList.contains('opblock-put')) pp++;
      }});
      document.getElementById('totalEndpoints').textContent = ops.length || '—';
      document.getElementById('totalGet').textContent       = get || '—';
      document.getElementById('totalPost').textContent      = post || '—';
      document.getElementById('totalPatch').textContent     = pp || '—';
    }}

    /* Primer conteo: espera a que Swagger renderice */
    function countStatsWhenReady() {{
      waitForSwaggerDOM('#swagger-ui .opblock', function() {{ countStats(); }});
    }}

    function applyFilter(tag) {{
      document.querySelectorAll('#swagger-ui .opblock-tag-section').forEach(function(section) {{
        if (tag === 'all') {{ section.style.display = ''; return; }}
        const h = section.querySelector('.opblock-tag h3, .opblock-tag span, h3');
        const text = h ? h.textContent.toLowerCase().trim() : '';
        section.style.display = text.includes(tag.toLowerCase()) ? '' : 'none';
      }});
      /* ── FIX: recalcular tras filtrar ── */
      setTimeout(countStats, 60);
    }}

    function filterTag(tag) {{
      _activeTag = tag;
      document.querySelectorAll('.sidebar-item').forEach(function(el) {{
        el.classList.toggle('active', el.dataset.tag === tag);
      }});
      const sections = document.querySelectorAll('#swagger-ui .opblock-tag-section');
      if (sections.length > 0) {{ applyFilter(tag); }}
      else {{ waitForSwaggerDOM('#swagger-ui .opblock-tag-section', function() {{ applyFilter(tag); }}); }}
    }}

    document.getElementById('searchInput').addEventListener('input', function() {{
      const q = this.value.toLowerCase().trim();
      if (!q) {{ filterTag(_activeTag); return; }}
      document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('#swagger-ui .opblock-tag-section').forEach(function(section) {{
        let any = false;
        section.querySelectorAll('.opblock').forEach(function(op) {{
          const path = op.querySelector('.opblock-summary-path, .opblock-summary-path__deprecated');
          const desc = op.querySelector('.opblock-summary-description');
          const text = ((path ? path.textContent : '') + ' ' + (desc ? desc.textContent : '')).toLowerCase();
          const vis = text.includes(q);
          op.style.display = vis ? '' : 'none';
          if (vis) any = true;
        }});
        section.style.display = any ? '' : 'none';
      }});
      /* ── FIX: recalcular tras búsqueda ── */
      setTimeout(countStats, 60);
    }});

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
      tryItOutEnabled: true,
      persistAuthorization: true,

      requestInterceptor: function(request) {{
        const auth = request.headers['Authorization'] || request.headers['authorization'];
        if (auth) {{
          const raw = auth.replace(/^[Bb]earer\\s+/, '').trim();
          request.headers['Authorization'] = 'Bearer ' + raw;
        }}
        return request;
      }},

      onComplete: function() {{
        countStatsWhenReady();
        if (_activeTag !== 'all') applyFilter(_activeTag);

        /* ── FIX: re-contar cuando el usuario expande/colapsa una sección ── */
        document.getElementById('swagger-ui').addEventListener('click', function(e) {{
          if (e.target.closest('.opblock-tag')) {{
            setTimeout(countStats, 350);
          }}
        }});

        /* Personalizar placeholder del input de token en el modal Authorize */
        new MutationObserver(function() {{
          document.querySelectorAll(
            '#swagger-ui .auth-container input[type=text], ' +
            '#swagger-ui .auth-container input[type=password]'
          ).forEach(function(input) {{
            if (!input.dataset.hinted) {{
              input.placeholder = 'Solo el token, sin "Bearer "';
              input.dataset.hinted = '1';
            }}
          }});
        }}).observe(document.getElementById('swagger-ui'), {{ childList: true, subtree: true }});
      }}
    }});
  </script>
</body>
</html>"""


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
    print("🔄 Convirtiendo YAML → JSON...")
    json_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, cls=SafeJsonEncoder),
        encoding="utf-8"
    )
    print(f"✅ JSON guardado: {json_path}")

    meta = extract_meta(data)
    print(f"📋 {meta['title']} v{meta['version']}")

    html = generate_html(meta, swagger_json_name)
    html_path = output_dir / "index.html"
    html_path.write_text(html, encoding="utf-8")
    print(f"✅ HTML guardado: {html_path}")
    print("🎉 Documentación generada.")


if __name__ == "__main__":
    main()
