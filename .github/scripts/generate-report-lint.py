#!/usr/bin/env python3
"""
generate-report-lint.py
Genera gh-pages/lint/index.html con resultados de ESLint, Prettier y TypeScript.

Variables de entorno:
  ESLINT_STATUS / ESLINT_ERRORS / ESLINT_WARNINGS / ESLINT_FILES
  PRETTIER_STATUS / PRETTIER_ISSUES
  TS_STATUS / TS_ERRORS
  FECHA / RUN_URL / REPO / BRANCH / COMMIT
  OUT  (default: gh-pages/lint/index.html)
"""

import os, json

# ── Entorno ───────────────────────────────────────────────────────────────────
OUT              = os.environ.get("OUT",             "gh-pages/lint/index.html")
FECHA            = os.environ.get("FECHA",           "N/A")
RUN_URL          = os.environ.get("RUN_URL",         "#")
REPO             = os.environ.get("REPO",            "Nanutech")
BRANCH           = os.environ.get("BRANCH",          "—")
COMMIT           = os.environ.get("COMMIT",          "—")

ESLINT_STATUS    = os.environ.get("ESLINT_STATUS",   "skipped")
ESLINT_ERRORS    = int(os.environ.get("ESLINT_ERRORS",   "0") or 0)
ESLINT_WARNINGS  = int(os.environ.get("ESLINT_WARNINGS", "0") or 0)
ESLINT_FILES     = int(os.environ.get("ESLINT_FILES",    "0") or 0)

PRETTIER_STATUS  = os.environ.get("PRETTIER_STATUS", "skipped")
PRETTIER_ISSUES  = int(os.environ.get("PRETTIER_ISSUES", "0") or 0)

TS_STATUS        = os.environ.get("TS_STATUS",       "skipped")
TS_ERRORS        = int(os.environ.get("TS_ERRORS",   "0") or 0)

commit_short = COMMIT[:7] if len(COMMIT) > 7 else COMMIT

# ── Leer JSON de ESLint si existe ─────────────────────────────────────────────
eslint_data = []
for candidate in ["eslint-results.json", "source/eslint-results.json"]:
    if os.path.exists(candidate):
        try:
            with open(candidate) as f:
                eslint_data = json.load(f)
        except Exception:
            pass
        break

# ── Leer outputs de texto ─────────────────────────────────────────────────────
def read_file(path, fallback="—"):
    for p in [path, f"source/{path}"]:
        if os.path.exists(p):
            try:
                return open(p).read().strip() or fallback
            except Exception:
                pass
    return fallback

prettier_output  = read_file("prettier-output.txt")
typescript_output = read_file("typescript-output.txt")

# ── Badge de estado global ────────────────────────────────────────────────────
def tool_ok(status):
    return status in ("success", "skipped")

if not tool_ok(ESLINT_STATUS) or not tool_ok(TS_STATUS):
    BADGE_TEXT = "FAILED";   BADGE_COLOR = "#DC2626"; BADGE_BG = "#FEF2F2"; BADGE_BD = "#FECACA"
elif PRETTIER_ISSUES > 0 or ESLINT_WARNINGS > 0:
    BADGE_TEXT = "WARNINGS"; BADGE_COLOR = "#D97706"; BADGE_BG = "#FFFBEB"; BADGE_BD = "#FDE68A"
else:
    BADGE_TEXT = "PASSED";   BADGE_COLOR = "#059669"; BADGE_BG = "#ECFDF5"; BADGE_BD = "#A7F3D0"

# ── Helpers de estado ─────────────────────────────────────────────────────────
def status_badge(status):
    MAP = {
        "success":  ('<span class="st-pass">✓ Passed</span>',   "pass"),
        "failed":   ('<span class="st-fail">✗ Failed</span>',   "fail"),
        "warnings": ('<span class="st-warn">⚠ Warnings</span>', "warn"),
        "skipped":  ('<span class="st-skip">— Skipped</span>',  "skip"),
    }
    return MAP.get(status, MAP["skipped"])[0]

def tool_icon(status):
    return {"success":"✅","failed":"❌","warnings":"⚠️","skipped":"➖"}.get(status,"➖")

# ── Tabla de issues ESLint ────────────────────────────────────────────────────
def build_eslint_table(data):
    if not data:
        return ""
    rows = ""
    rule_counts = {}
    for file_result in data:
        for msg in file_result.get("messages", []):
            rule = msg.get("ruleId") or "no-rule"
            rule_counts[rule] = rule_counts.get(rule, {"errors": 0, "warnings": 0})
            if msg.get("severity") == 2:
                rule_counts[rule]["errors"] += 1
            else:
                rule_counts[rule]["warnings"] += 1

    if not rule_counts:
        return ""

    for rule, counts in sorted(rule_counts.items(), key=lambda x: -x[1]["errors"]):
        e = counts["errors"]; w = counts["warnings"]
        sev_class = "sev-high" if e > 0 else "sev-medium"
        sev_label = "ERROR" if e > 0 else "WARNING"
        rows += f"""<tr>
          <td><span class="{sev_class}">{sev_label}</span></td>
          <td><code class="rule-id">{rule}</code></td>
          <td style="text-align:center"><span class="count-badge-red">{e}</span></td>
          <td style="text-align:center"><span class="count-badge-amber">{w}</span></td>
        </tr>\n"""
    return rows

# ── Tabla de archivos con issues ──────────────────────────────────────────────
def build_file_table(data):
    if not data:
        return ""
    rows = ""
    for file_result in sorted(data, key=lambda x: -x.get("errorCount", 0)):
        if not file_result.get("messages"):
            continue
        fp = file_result.get("filePath", "").replace(os.getcwd(), "").lstrip("/")
        # Acortar ruta larga
        if "source/" in fp:
            fp = fp.split("source/")[-1]
        errs = file_result.get("errorCount", 0)
        warns = file_result.get("warningCount", 0)
        if errs == 0 and warns == 0:
            continue
        # Primeros 3 mensajes del archivo
        msgs_html = ""
        for msg in file_result["messages"][:3]:
            line  = msg.get("line", "?")
            col   = msg.get("column", "?")
            rule  = msg.get("ruleId") or "—"
            text  = msg.get("message", "")[:120]
            sev   = "sev-high" if msg.get("severity") == 2 else "sev-medium"
            msgs_html += f'<div class="msg-item"><span class="{sev} sev-mini">{"E" if msg.get("severity")==2 else "W"}</span> <code class="loc">L{line}:{col}</code> <span class="rule-ref">[{rule}]</span> {text}</div>'
        if len(file_result["messages"]) > 3:
            extra = len(file_result["messages"]) - 3
            msgs_html += f'<div class="msg-more">+{extra} mensaje(s) más...</div>'
        rows += f"""<tr>
          <td class="file-cell"><code class="file-tag">{fp}</code></td>
          <td style="text-align:center"><span class="count-badge-red">{errs}</span></td>
          <td style="text-align:center"><span class="count-badge-amber">{warns}</span></td>
          <td class="msgs-cell">{msgs_html}</td>
        </tr>\n"""
    return rows

eslint_rule_rows = build_eslint_table(eslint_data)
eslint_file_rows = build_file_table(eslint_data)

# ── Prettier issues ───────────────────────────────────────────────────────────
def build_prettier_rows(output):
    if not output or output == "—":
        return ""
    rows = ""
    for line in output.splitlines():
        if "[warn]" in line:
            fp = line.replace("[warn]", "").strip()
            if "source/" in fp:
                fp = fp.split("source/")[-1]
            rows += f'<tr><td><code class="file-tag">{fp}</code></td><td><span class="sev-medium">FORMAT</span></td><td>Archivo no formateado con Prettier</td></tr>\n'
    return rows

prettier_rows = build_prettier_rows(prettier_output)

# ── TypeScript errors ─────────────────────────────────────────────────────────
def build_ts_rows(output):
    if not output or output == "—" or "No tsconfig" in output:
        return ""
    rows = ""
    for line in output.splitlines():
        if "error TS" in line:
            parts = line.split(":", 1)
            location = parts[0].strip() if parts else "—"
            message  = parts[1].strip() if len(parts) > 1 else line
            if "source/" in location:
                location = location.split("source/")[-1]
            rows += f'<tr><td><code class="file-tag">{location}</code></td><td><span class="sev-high">ERROR</span></td><td>{message[:160]}</td></tr>\n'
    return rows

ts_rows = build_ts_rows(typescript_output)

# ── Pre-calcular bloques condicionales ────────────────────────────────────────
EMPTY_TABLE = '<tr><td colspan="4" class="empty-row">Sin issues detectados ✅</td></tr>'
EMPTY_3     = '<tr><td colspan="3" class="empty-row">Sin issues detectados ✅</td></tr>'

block_eslint_rules = f"""<table id="table-eslint-rules">
      <thead><tr>
        <th style="width:90px">Tipo</th>
        <th>Regla ESLint</th>
        <th style="width:80px;text-align:center">Errores</th>
        <th style="width:80px;text-align:center">Avisos</th>
      </tr></thead>
      <tbody>{eslint_rule_rows if eslint_rule_rows else EMPTY_TABLE}</tbody>
    </table>""" if ESLINT_STATUS != "skipped" else '<div class="empty-state"><span class="empty-icon">➖</span><p>ESLint no ejecutado</p></div>'

block_eslint_files = f"""<table id="table-eslint-files">
      <thead><tr>
        <th>Archivo</th>
        <th style="width:80px;text-align:center">Errores</th>
        <th style="width:80px;text-align:center">Avisos</th>
        <th>Mensajes</th>
      </tr></thead>
      <tbody>{eslint_file_rows if eslint_file_rows else EMPTY_TABLE}</tbody>
    </table>""" if ESLINT_STATUS != "skipped" else '<div class="empty-state"><span class="empty-icon">➖</span><p>ESLint no ejecutado</p></div>'

block_prettier = f"""<table>
      <thead><tr>
        <th>Archivo</th><th style="width:90px">Tipo</th><th>Descripción</th>
      </tr></thead>
      <tbody>{prettier_rows if prettier_rows else EMPTY_3}</tbody>
    </table>""" if PRETTIER_STATUS != "skipped" else '<div class="empty-state"><span class="empty-icon">➖</span><p>Prettier no ejecutado</p></div>'

block_ts = f"""<table>
      <thead><tr>
        <th>Ubicación</th><th style="width:90px">Tipo</th><th>Error TypeScript</th>
      </tr></thead>
      <tbody>{ts_rows if ts_rows else EMPTY_3}</tbody>
    </table>""" if TS_STATUS != "skipped" else '<div class="empty-state"><span class="empty-icon">➖</span><p>TypeScript check no ejecutado (sin tsconfig.json)</p></div>'

# ─────────────────────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lint Report — {REPO}</title>
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
      --slate:        #0F172A;
      --text2:        #475569;
      --text3:        #94A3B8;
      --text4:        #CBD5E1;
      --font:         'Inter', system-ui, sans-serif;
      --mono:         'JetBrains Mono', monospace;
      --radius:       10px;
      --shadow-sm:    0 1px 3px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.05);
      --shadow:       0 4px 16px rgba(15,23,42,.09);
      --header-h:     64px;
    }}

    html {{ scroll-behavior:smooth; scroll-padding-top:calc(var(--header-h) + 52px); }}
    body {{ font-family:var(--font); background:var(--bg); color:var(--slate); min-height:100vh; font-size:13px; line-height:1.6; -webkit-font-smoothing:antialiased; }}

    ::-webkit-scrollbar {{ width:5px; height:5px; }}
    ::-webkit-scrollbar-thumb {{ background:var(--border2); border-radius:3px; }}
    ::-webkit-scrollbar-thumb:hover {{ background:var(--accent); }}

    /* ── HEADER ── */
    header {{
      position:sticky; top:0; z-index:200;
      background:rgba(255,255,255,.94); backdrop-filter:blur(12px);
      border-bottom:1px solid var(--border); box-shadow:var(--shadow-sm);
      height:var(--header-h); display:flex; align-items:center; padding:0 32px; gap:16px;
    }}
    .header-icon {{
      width:38px; height:38px;
      background:linear-gradient(135deg,#2563EB,#7C3AED);
      border-radius:10px; display:flex; align-items:center; justify-content:center;
      font-size:18px; box-shadow:0 2px 10px rgba(37,99,235,.28); flex-shrink:0;
    }}
    .header-title-wrap {{ display:flex; flex-direction:column; gap:2px; }}
    .header-title {{ font-size:14px; font-weight:800; color:var(--slate); letter-spacing:-.2px; }}
    .header-sub {{
      font-size:11px; color:var(--text3);
      display:flex; gap:10px; align-items:center; font-family:var(--mono);
    }}
    .header-sub strong {{ color:var(--text2); }}
    .header-divider {{ width:1px; height:20px; background:var(--border); }}
    .status-badge {{
      display:inline-flex; align-items:center; gap:6px;
      padding:5px 14px; border-radius:20px;
      font-size:11px; font-weight:800; letter-spacing:1.5px; font-family:var(--mono);
      background:{BADGE_BG}; color:{BADGE_COLOR}; border:1px solid {BADGE_BD};
      margin-left:auto;
    }}
    .status-badge::before {{
      content:''; width:7px; height:7px; background:{BADGE_COLOR};
      border-radius:50%; animation:pulse-dot 2s infinite;
    }}
    @keyframes pulse-dot {{ 0%,100%{{opacity:1;transform:scale(1)}} 50%{{opacity:.5;transform:scale(.7)}} }}

    /* ── NAV ── */
    .nav-bar {{
      position:sticky; top:var(--header-h); z-index:150;
      background:var(--bg2); border-bottom:1px solid var(--border);
      padding:0 32px; display:flex; overflow-x:auto;
      box-shadow:0 1px 3px rgba(15,23,42,.05);
    }}
    .nav-bar a {{
      display:inline-flex; align-items:center; gap:7px;
      padding:13px 18px; font-size:12px; font-weight:600;
      color:var(--text2); border-bottom:2px solid transparent;
      text-decoration:none; white-space:nowrap; transition:all .14s;
    }}
    .nav-bar a:hover {{ color:var(--accent); border-bottom-color:var(--accent-mid); }}

    /* ── LAYOUT ── */
    .container {{ max-width:1380px; margin:0 auto; padding:32px 28px 64px; }}

    /* ── COMMIT STRIP ── */
    .commit-strip {{
      background:var(--bg2); border:1px solid var(--border);
      border-radius:var(--radius); padding:14px 20px;
      display:flex; gap:8px; flex-wrap:wrap; align-items:center;
      margin-bottom:28px; font-size:11px; box-shadow:var(--shadow-sm);
    }}
    .commit-item {{ display:flex; align-items:center; gap:5px; color:var(--text3); font-family:var(--mono); }}
    .commit-item strong {{ color:var(--text2); font-weight:600; }}
    .commit-sep {{ color:var(--border2); }}
    .commit-strip a {{ color:var(--accent); text-decoration:none; font-weight:600; font-family:var(--mono); font-size:11px; margin-left:auto; }}
    .commit-strip a:hover {{ text-decoration:underline; }}

    /* ── TOOL CARDS ── */
    .tools-grid {{
      display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
      gap:12px; margin-bottom:28px;
    }}
    .tool-card {{
      background:var(--bg2); border:1px solid var(--border);
      border-radius:var(--radius); padding:20px 18px;
      box-shadow:var(--shadow-sm); position:relative; overflow:hidden;
      display:flex; flex-direction:column; gap:8px;
    }}
    .tool-card::after {{
      content:''; position:absolute; top:0; left:0; right:0; height:3px;
      border-radius:var(--radius) var(--radius) 0 0;
      background:var(--tool-color, var(--accent));
    }}
    .tool-name {{ font-size:12px; font-weight:700; color:var(--slate); display:flex; align-items:center; gap:7px; }}
    .tool-stats {{ display:flex; gap:10px; flex-wrap:wrap; }}
    .tool-stat {{
      display:flex; flex-direction:column;
      background:var(--bg3); border:1px solid var(--border);
      border-radius:7px; padding:8px 12px; min-width:60px;
    }}
    .tool-stat-num {{ font-size:1.6rem; font-weight:800; line-height:1; font-family:var(--mono); letter-spacing:-1px; }}
    .tool-stat-lbl {{ font-size:9px; color:var(--text3); font-weight:700; text-transform:uppercase; letter-spacing:.6px; margin-top:3px; }}

    /* ── SECTIONS ── */
    .section {{ margin-bottom:40px; }}
    .section-header {{ display:flex; align-items:center; gap:10px; margin-bottom:6px; }}
    .section-header h2 {{ font-size:16px; font-weight:800; color:var(--slate); letter-spacing:-.3px; }}
    .section-desc {{ color:var(--text2); font-size:12px; margin-bottom:18px; line-height:1.7; max-width:680px; }}
    .section-divider {{ height:1px; background:var(--border); margin:0 0 18px; }}

    /* ── CARD CONTAINER ── */
    .card {{ background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm); }}
    .card-header {{
      padding:13px 20px; border-bottom:1px solid var(--border);
      background:var(--bg3); display:flex; align-items:center; justify-content:space-between;
    }}
    .card-title {{ font-size:13px; font-weight:700; color:var(--slate); display:flex; align-items:center; gap:8px; }}
    .card-subtitle {{ font-size:11px; color:var(--text3); }}

    /* ── TABLES ── */
    .table-wrap {{ overflow-x:auto; }}
    table {{ width:100%; border-collapse:collapse; font-size:12px; }}
    th {{
      background:var(--bg3); color:var(--text3);
      padding:9px 14px; text-align:left;
      font-weight:700; font-size:10px;
      text-transform:uppercase; letter-spacing:.6px;
      border-bottom:1px solid var(--border); white-space:nowrap;
    }}
    td {{ padding:11px 14px; border-bottom:1px solid var(--border); vertical-align:top; background:var(--bg2); }}
    tr:last-child td {{ border-bottom:none; }}
    tr:hover td {{ background:var(--bg3); }}
    .empty-row {{ text-align:center; color:var(--text3); padding:36px 20px !important; font-size:13px; background:var(--bg2) !important; }}

    /* ── SEVERITY BADGES ── */
    .sev-high    {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--red-bg);   color:var(--red);   border:1px solid var(--red-border); }}
    .sev-medium  {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); white-space:nowrap; background:var(--amber-bg); color:var(--amber); border:1px solid var(--amber-border); }}
    .sev-mini    {{ padding:1px 5px !important; font-size:9px !important; border-radius:3px !important; }}
    .sev-high::before  {{ content:''; width:5px; height:5px; border-radius:50%; background:var(--red);   flex-shrink:0; }}
    .sev-medium::before{{ content:''; width:5px; height:5px; border-radius:50%; background:var(--amber); flex-shrink:0; }}

    /* ── STATUS BADGES ── */
    .st-pass {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); background:var(--green-bg);  color:var(--green);  border:1px solid var(--green-border); }}
    .st-fail {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); background:var(--red-bg);    color:var(--red);    border:1px solid var(--red-border); }}
    .st-warn {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); background:var(--amber-bg);  color:var(--amber);  border:1px solid var(--amber-border); }}
    .st-skip {{ display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:5px; font-size:10px; font-weight:700; font-family:var(--mono); background:var(--bg3);       color:var(--text3);  border:1px solid var(--border); }}

    /* ── INLINE CODE ── */
    code {{ font-family:var(--mono); font-size:11px; }}
    .rule-id  {{ background:var(--accent-light); color:var(--accent); border:1px solid var(--accent-mid); padding:2px 7px; border-radius:5px; font-size:10px; font-weight:600; }}
    .file-tag {{ background:var(--bg3); color:var(--text2); border:1px solid var(--border); padding:2px 7px; border-radius:5px; }}
    .loc      {{ background:var(--purple-bg); color:var(--purple); border:1px solid var(--purple-border); padding:1px 5px; border-radius:4px; font-size:10px; }}
    .rule-ref {{ color:var(--text3); font-size:11px; }}
    .count-badge-red   {{ background:var(--red-bg);   color:var(--red);   border:1px solid var(--red-border);   padding:2px 9px; border-radius:10px; font-size:11px; font-weight:700; font-family:var(--mono); }}
    .count-badge-amber {{ background:var(--amber-bg); color:var(--amber); border:1px solid var(--amber-border); padding:2px 9px; border-radius:10px; font-size:11px; font-weight:700; font-family:var(--mono); }}

    /* ── FILE & MSG CELLS ── */
    .file-cell {{ min-width:200px; }}
    .msgs-cell {{ min-width:300px; }}
    .msg-item  {{ margin-bottom:5px; font-size:11px; color:var(--text2); display:flex; align-items:flex-start; gap:6px; flex-wrap:wrap; }}
    .msg-more  {{ font-size:11px; color:var(--text3); font-style:italic; margin-top:4px; }}

    /* ── EMPTY STATE ── */
    .empty-state {{ text-align:center; padding:48px 32px; color:var(--text3); background:var(--bg2); }}
    .empty-icon  {{ font-size:2.5rem; display:block; margin-bottom:10px; }}
    .empty-state p {{ font-size:14px; color:var(--text2); font-weight:500; }}

    /* ── FOOTER ── */
    footer {{
      background:var(--bg2); border-top:1px solid var(--border);
      padding:18px 32px; display:flex; align-items:center;
      justify-content:space-between; flex-wrap:wrap; gap:8px;
      font-size:11px; color:var(--text3);
    }}
    footer a {{ color:var(--accent); text-decoration:none; font-weight:600; }}
    .footer-brand {{ display:flex; align-items:center; gap:8px; font-weight:600; color:var(--text2); }}
    .footer-logo  {{ width:24px; height:24px; background:linear-gradient(135deg,#2563EB,#7C3AED); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px; }}

    @media (max-width:768px) {{
      .container {{ padding:20px 16px 48px; }}
      header, .nav-bar {{ padding-left:16px; padding-right:16px; }}
      .tools-grid {{ grid-template-columns:1fr 1fr; }}
    }}
  </style>
</head>
<body>

<!-- HEADER -->
<header>
  <div class="header-icon">✨</div>
  <div class="header-title-wrap">
    <div class="header-title">Linting &amp; Formatting Report</div>
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
  <div class="header-divider"></div>
  <span class="status-badge">{BADGE_TEXT}</span>
</header>

<!-- NAV -->
<nav class="nav-bar">
  <a href="#resumen">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
    Resumen
  </a>
  <a href="#eslint">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    ESLint
  </a>
  <a href="#prettier">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
    Prettier
  </a>
  <a href="#typescript">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>
    TypeScript
  </a>
</nav>

<!-- CONTENIDO -->
<div class="container">

  <!-- Commit strip -->
  <div class="commit-strip">
    <div class="commit-item">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      Scan: <strong>{FECHA}</strong>
    </div>
    <span class="commit-sep">·</span>
    <div class="commit-item">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      Node.js: <strong>v20 · npm</strong>
    </div>
    <span class="commit-sep">·</span>
    <div class="commit-item">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      Herramientas: <strong>ESLint · Prettier · TypeScript</strong>
    </div>
    <a href="{RUN_URL}" target="_blank">Ver ejecución en GitHub Actions →</a>
  </div>

  <!-- ═══ RESUMEN ═══════════════════════════════════════════════════ -->
  <section class="section" id="resumen">
    <div class="section-header"><h2>Resumen de herramientas</h2></div>
    <p class="section-desc">Estado general de cada herramienta de análisis estático ejecutada en este pipeline.</p>
    <div class="section-divider"></div>

    <div class="tools-grid">

      <!-- ESLint -->
      <div class="tool-card" style="--tool-color:#DC2626">
        <div class="tool-name">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          ESLint
          &nbsp;{status_badge(ESLINT_STATUS)}
        </div>
        <div class="tool-stats">
          <div class="tool-stat">
            <span class="tool-stat-num" style="color:var(--red)">{ESLINT_ERRORS}</span>
            <span class="tool-stat-lbl">Errores</span>
          </div>
          <div class="tool-stat">
            <span class="tool-stat-num" style="color:var(--amber)">{ESLINT_WARNINGS}</span>
            <span class="tool-stat-lbl">Avisos</span>
          </div>
          <div class="tool-stat">
            <span class="tool-stat-num" style="color:var(--text2)">{ESLINT_FILES}</span>
            <span class="tool-stat-lbl">Archivos</span>
          </div>
        </div>
      </div>

      <!-- Prettier -->
      <div class="tool-card" style="--tool-color:#D97706">
        <div class="tool-name">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          Prettier
          &nbsp;{status_badge(PRETTIER_STATUS)}
        </div>
        <div class="tool-stats">
          <div class="tool-stat">
            <span class="tool-stat-num" style="color:var(--amber)">{PRETTIER_ISSUES}</span>
            <span class="tool-stat-lbl">Sin formato</span>
          </div>
        </div>
      </div>

      <!-- TypeScript -->
      <div class="tool-card" style="--tool-color:#2563EB">
        <div class="tool-name">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>
          TypeScript
          &nbsp;{status_badge(TS_STATUS)}
        </div>
        <div class="tool-stats">
          <div class="tool-stat">
            <span class="tool-stat-num" style="color:var(--red)">{TS_ERRORS}</span>
            <span class="tool-stat-lbl">Errores TS</span>
          </div>
        </div>
      </div>

    </div>
  </section>

  <!-- ═══ ESLINT ════════════════════════════════════════════════════ -->
  <section class="section" id="eslint">
    <div class="section-header">
      <h2>ESLint — Análisis de reglas</h2>
      <span style="font-size:12px;color:var(--text3);font-weight:600;">({ESLINT_ERRORS} errores · {ESLINT_WARNINGS} avisos)</span>
    </div>
    <p class="section-desc">Reglas violadas agrupadas por ID, ordenadas por severidad. Los errores bloquean el pipeline; los avisos son informativos.</p>
    <div class="section-divider"></div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <div class="card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
          Resumen por regla
        </div>
      </div>
      <div class="table-wrap">{block_eslint_rules}</div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Detalle por archivo
        </div>
        <span class="card-subtitle">{ESLINT_FILES} archivo(s) con issues</span>
      </div>
      <div class="table-wrap">{block_eslint_files}</div>
    </div>
  </section>

  <!-- ═══ PRETTIER ══════════════════════════════════════════════════ -->
  <section class="section" id="prettier">
    <div class="section-header">
      <h2>Prettier — Formato de código</h2>
      <span style="font-size:12px;color:var(--text3);font-weight:600;">({PRETTIER_ISSUES} archivo(s) sin formato)</span>
    </div>
    <p class="section-desc">Archivos que no cumplen con el formato definido en la configuración de Prettier. Ejecuta <code style="font-family:var(--mono);background:var(--bg3);padding:1px 5px;border-radius:4px;border:1px solid var(--border)">npx prettier . --write</code> para corregirlos automáticamente.</p>
    <div class="section-divider"></div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          Archivos sin formatear
        </div>
      </div>
      <div class="table-wrap">{block_prettier}</div>
    </div>
  </section>

  <!-- ═══ TYPESCRIPT ════════════════════════════════════════════════ -->
  <section class="section" id="typescript">
    <div class="section-header">
      <h2>TypeScript — Verificación de tipos</h2>
      <span style="font-size:12px;color:var(--text3);font-weight:600;">({TS_ERRORS} error(es))</span>
    </div>
    <p class="section-desc">Errores de tipado detectados por el compilador TypeScript (<code style="font-family:var(--mono);background:var(--bg3);padding:1px 5px;border-radius:4px;border:1px solid var(--border)">tsc --noEmit</code>) sin generar archivos de salida.</p>
    <div class="section-divider"></div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>
          Errores de tipos
        </div>
      </div>
      <div class="table-wrap">{block_ts}</div>
    </div>
  </section>

</div>

<!-- FOOTER -->
<footer>
  <div class="footer-brand">
    <div class="footer-logo">✨</div>
    Linting &amp; Formatting Report · {REPO}
  </div>
  <span>
    <a href="https://eslint.org" target="_blank">ESLint</a> ·
    <a href="https://prettier.io" target="_blank">Prettier</a> ·
    <a href="https://www.typescriptlang.org" target="_blank">TypeScript</a> ·
    <a href="{RUN_URL}" target="_blank">GitHub Actions</a> ·
    {FECHA}
  </span>
</footer>

</body>
</html>"""

os.makedirs(os.path.dirname(OUT) if os.path.dirname(OUT) else ".", exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

print(f"✅  {OUT} generado ({len(html):,} chars)")
print(f"    ESLint   → {ESLINT_STATUS} | errors={ESLINT_ERRORS} warnings={ESLINT_WARNINGS} files={ESLINT_FILES}")
print(f"    Prettier → {PRETTIER_STATUS} | issues={PRETTIER_ISSUES}")
print(f"    TypeScript → {TS_STATUS} | errors={TS_ERRORS}")
