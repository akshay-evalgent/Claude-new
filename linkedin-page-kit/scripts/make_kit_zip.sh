#!/usr/bin/env bash
# Build the downloadable, beginner-ready upload kit: dist/founder-signal-upload-kit.zip
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/build_posts.py >/dev/null
T=$(mktemp -d); K="$T/founder-signal-upload-kit"
mkdir -p "$K"/{01-page-setup,02-newsletter,05-logos,06-docs,07-photos}
cp upload-kit/START-HERE.md "$K/"
python3 - "$K" <<'PY'
import sys, markdown
k=sys.argv[1]; md=open(f"{k}/START-HERE.md").read()
body=markdown.markdown(md, extensions=["tables"])
css="body{font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;max-width:820px;margin:40px auto;padding:0 20px;line-height:1.55;color:#111} code{background:#f2f2ee;padding:2px 5px;border-radius:4px} h1{font-size:30px} h2{margin-top:36px;border-bottom:1px solid #ddd;padding-bottom:6px} table{border-collapse:collapse} td,th{border:1px solid #ddd;padding:6px 10px}"
open(f"{k}/START-HERE.html","w").write(f"<!doctype html><meta charset='utf-8'><title>Founder Signal · start here</title><style>{css}</style>{body}")
PY
cp -r upload-kit/POSTS "$K/POSTS"
cp assets/brand/logo-400.png assets/brand/logo-300.png assets/brand/banner-A-1128x191.png assets/brand/banner-A-4200x700.png assets/brand/banner-B-1128x191.png assets/brand/banner-B-4200x700.png content/page-copy.md content/SETUP-CHECKLIST.md "$K/01-page-setup/"
cp assets/brand/newsletter-logo-300.png assets/brand/newsletter-cover-1920x1080.png assets/brand/edition-01-cover-1920x1080.png content/newsletter-issue-01.md "$K/02-newsletter/"
cp assets/logos/*-white.png assets/logos/*-black.png assets/logos/n8n-logo.png "$K/05-logos/" 2>/dev/null || true
cp content/PAGE-CONCEPT.md content/VOICE-GUIDE.md content/ENGAGEMENT-PLAYBOOK.md content/NEWSDESK-PLAYBOOK.md content/STARTUPRO-FORMAT.md assets/photos/IMAGE-REQUESTS.md "$K/06-docs/"
cp assets/photos/*.jpg assets/photos/credits.txt "$K/07-photos/" 2>/dev/null || true
mkdir -p dist && rm -f dist/founder-signal-upload-kit.zip
( cd "$T" && zip -qr "$OLDPWD/dist/founder-signal-upload-kit.zip" founder-signal-upload-kit )
cp "$K/START-HERE.html" dist/START-HERE.html
ls -la dist/
