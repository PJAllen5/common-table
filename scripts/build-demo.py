#!/usr/bin/env python3
"""Bundle index.html, styles.css and app.js into one file: dist/common-table.html.

The single-file version is what gets published as the hosted demo (a Claude artifact),
which wants one self-contained page with no <html>/<head>/<body> wrapper.
Run from the repo root:  python3 scripts/build-demo.py
"""
import pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text()
css = (root / "styles.css").read_text()
js = (root / "app.js").read_text()

title = re.search(r"<title>.*?</title>", html).group(0)
fonts = "\n".join(l for l in re.findall(r"<link [^>]*>", html) if "styles.css" not in l)

out = f"""{title}
<meta name="claude:viewport-fit-sides" content="cover">
{fonts}
<style>
{css}</style>

<div id="app"></div>

<script>
{js}</script>
"""
dist = root / "dist"
dist.mkdir(exist_ok=True)
(dist / "common-table.html").write_text(out)
print(f"Wrote {dist / 'common-table.html'} ({len(out):,} bytes)")
