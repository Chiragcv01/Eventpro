import pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
head = (src / 'head.html').read_text()
css = (src / 'app.css').read_text()
js = '\n'.join((src / f).read_text() for f in ['i18n.js', 'core.js', 'alerts.js', 'help.js', 'auth.js', 'views-ops.js', 'views-money.js', 'views-admin.js', 'views-site.js', 'views-import.js', 'views-marketing.js', 'simple.js', 'leads.js', 'venue.js', 'depts.js', 'fleet.js', 'clinic.js', 'clinic-spec.js', 'clinic-biz.js', 'clinic-case.js', 'demo.js', 'clinic-text.js', 'clinic-spec-text.js', 'venue-text.js', 'fleet-text.js', 'clinic-case-text.js'])
import hashlib, json as _json
build_id = hashlib.sha1(js.encode()).hexdigest()[:12]
js = f"window.SM_BUILD = '{build_id}';\n" + js + "\nboot();\n"
(root / 'version.json').write_text(_json.dumps({'build': build_id}) + '\n')
splash = ('<div class="boot-splash"><div class="boot-logo"><svg viewBox="0 0 24 24" width="42" height="42" aria-hidden="true"><g fill="#fff"><rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/></g><path d="M13.6 16.6l2 2 3.6-4.1" fill="none" stroke="#fff" stroke-width="2"/></svg></div>'
          '<b>SabManage</b><div class="boot-bar"><i></i></div><span id="bootTxt">Loading…</span></div>')
boot_lang = "<script>try{if(localStorage.getItem('ep_lang')==='hi')document.getElementById('bootTxt').textContent='\u0916\u0941\u0932 \u0930\u0939\u093e \u0939\u0948\u2026'}catch(e){}</script>"
body = f'<div id="app">{splash}</div>\n{boot_lang}\n<div id="modalRoot" hidden></div>\n<script>\n{js}\n</script>\n'
fragment = f'{head}<style>\n{css}\n</style>\n{body}'
(root / 'dist').mkdir(exist_ok=True)
full = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<link rel="manifest" href="/manifest.webmanifest">\n<link rel="icon" href="/icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="/img/icons/apple-touch-icon.png">\n'
        f'{head}<style>\n:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}\n[hidden]{{display:none!important}}\n{css}\n</style>\n</head>\n<body>\n{body}</body>\n</html>\n')
(root / 'dist' / 'index.html').write_text(full)
(root / 'app.html').write_text(full)  # Vercel serves this at /app
(root / 'artifact.html').write_text(fragment)
(root / 'app.js').write_text(js)
print('built', len(full) // 1024, 'KB -> app.html')
