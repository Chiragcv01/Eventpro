import pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
head = (src / 'head.html').read_text()
css = (src / 'app.css').read_text()
js = '\n'.join((src / f).read_text() for f in ['i18n.js', 'core.js', 'alerts.js', 'help.js', 'auth.js', 'views-ops.js', 'views-money.js', 'views-admin.js', 'views-site.js', 'views-import.js', 'views-marketing.js', 'simple.js'])
js += "\nboot();\n"
body = f'<div id="app"></div>\n<div id="modalRoot" hidden></div>\n<script>\n{js}\n</script>\n'
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
