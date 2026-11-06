#!/usr/bin/env bash
# Build the beginner-ready kit: dist/remote-ledger-upload-kit.zip
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/rl_build_posts.py >/dev/null
T=$(mktemp -d); K="$T/remote-ledger-upload-kit"
mkdir -p "$K"/{01-page-setup,02-forms,03-tracker,04-templates,05-sources,06-docs}
cp upload-kit/START-HERE.md "$K/"
python3 - "$K" <<'PY'
import sys, markdown
k=sys.argv[1]; md=open(f"{k}/START-HERE.md").read()
body=markdown.markdown(md, extensions=["tables"])
css="body{font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;max-width:820px;margin:40px auto;padding:0 20px;line-height:1.55;color:#111} code{background:#f2f2ee;padding:2px 5px;border-radius:4px} h1{font-size:30px} h2{margin-top:36px;border-bottom:1px solid #ddd;padding-bottom:6px} table{border-collapse:collapse} td,th{border:1px solid #ddd;padding:6px 10px}"
open(f"{k}/START-HERE.html","w").write(f"<!doctype html><meta charset='utf-8'><title>Remote Ledger · start here</title><style>{css}</style>{body}")
PY
cp -r upload-kit/POSTS "$K/POSTS"
cp assets/brand/logo-400.png assets/brand/logo-300.png assets/brand/banner-A-1128x191.png assets/brand/banner-A-4200x700.png assets/brand/banner-B-1128x191.png assets/brand/banner-B-4200x700.png content/page-copy.md content/SETUP-CHECKLIST.md "$K/01-page-setup/"
cp upload-kit/02-forms.md "$K/02-forms/"
cp data/tracker-2026-11-09.csv data/tracker-2026-11-09.md data/tracker-2026-11-09.json "$K/03-tracker/"
cp templates/contract-one-page.md "$K/04-templates/"
cp assets/sources/*.png assets/sources/SOURCES.md "$K/05-sources/"
cp content/PLAYBOOK.md ../content/curation-page/REMOTE-WORK-CURATION-BRIEF.md "$K/06-docs/"
mkdir -p dist && rm -f dist/remote-ledger-upload-kit.zip
( cd "$T" && zip -qr "$OLDPWD/dist/remote-ledger-upload-kit.zip" remote-ledger-upload-kit )
cp "$K/START-HERE.html" dist/START-HERE.html
ls -la dist/
