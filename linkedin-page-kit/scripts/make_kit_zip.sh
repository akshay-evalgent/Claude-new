#!/usr/bin/env bash
# Build a downloadable, LinkedIn-ready upload kit: dist/founder-signal-upload-kit.zip
set -euo pipefail
cd "$(dirname "$0")/.."
K=$(mktemp -d)/founder-signal-upload-kit
mkdir -p "$K"/{01-page-setup,02-newsletter,03-posts-today,04-week1-posts,05-logos,06-docs,07-photos}
cp assets/brand/logo-400.png assets/brand/logo-300.png assets/brand/banner-A-1128x191.png assets/brand/banner-A-4200x700.png assets/brand/banner-B-1128x191.png assets/brand/banner-B-4200x700.png "$K/01-page-setup/"
cp content/page-copy.md content/SETUP-CHECKLIST.md "$K/01-page-setup/"
cp assets/brand/newsletter-logo-300.png assets/brand/newsletter-cover-1920x1080.png assets/brand/edition-01-cover-1920x1080.png assets/brand/swap-01-cover-1920x1080.png content/newsletter-issue-01.md "$K/02-newsletter/"
cp assets/posts/2026-11-03/signal-*.png assets/posts/2026-11-03/CAPTIONS-5.md assets/posts/2026-11-03/POST.md "$K/03-posts-today/"
cp assets/test-post/gdpx-benchmark.png assets/test-post/gdpx-benchmark-square.png assets/test-post/POST.md "$K/03-posts-today/" 2>/dev/null || true
mv "$K/03-posts-today/POST.md" "$K/03-posts-today/POST-anthropic-895b.md" 2>/dev/null || true
cp assets/week1-v3/*.png "$K/04-week1-posts/"; rm -f "$K/04-week1-posts/_preview.png"
cp assets/week1/carousel-launch-startup-stack/carousel.pdf "$K/04-week1-posts/carousel-open-source-startup-stack.pdf"
cp assets/week1/carousel-automations/carousel.pdf "$K/04-week1-posts/carousel-five-automations.pdf"
cp assets/carousels/v3-swap/carousel.pdf "$K/04-week1-posts/carousel-the-swap-no1.pdf"
cp assets/week1/*.png "$K/04-week1-posts/" 2>/dev/null || true; rm -f "$K/04-week1-posts/_preview.png"
cp content/week1/WEEK-1-PLAN-V3.md "$K/04-week1-posts/"
cp assets/logos/*-white.png assets/logos/*-black.png assets/logos/n8n-logo.png "$K/05-logos/" 2>/dev/null || true
cp content/PAGE-CONCEPT.md content/VOICE-GUIDE.md content/ENGAGEMENT-PLAYBOOK.md content/NEWSDESK-PLAYBOOK.md content/STARTUPRO-FORMAT.md content/ROADMAP-WARMUP-TO-TEARDOWN.md assets/photos/IMAGE-REQUESTS.md "$K/06-docs/"
cp assets/photos/*.jpg assets/photos/credits.txt "$K/07-photos/" 2>/dev/null || true
cat > "$K/README.txt" <<'TXT'
FOUNDER SIGNAL · LinkedIn upload kit
Handle: linkedin.com/company/thefoundersignal

01-page-setup   logo (upload logo-400.png), banner (banner-A-1128x191.png; use the 4200x700 file if LinkedIn asks for the wide format), page copy, setup checklist
02-newsletter   newsletter logo + cover, issue 1 text and cover
03-posts-today  today's Signal cards (portrait = *.png, square = *-square.png) with CAPTIONS-5.md: caption, hashtags, pinned first comment per card
04-week1-posts  swap cards, thought-experiment cards, tool cards, three carousel PDFs (upload PDFs as document posts), and the week plan with every post's text
05-logos        brand marks in white and black for future cards
06-docs         concept, voice guide, engagement playbook, newsdesk routine, image requests
07-photos       people photos used, with credits.txt

Posting rules in one line: image or PDF attached, no links in the body, first comment with sources pinned within a minute, reply to every comment within 15 minutes for the first 90 minutes.
TXT
mkdir -p dist && rm -f dist/founder-signal-upload-kit.zip
( cd "$(dirname "$K")" && zip -qr "$OLDPWD/dist/founder-signal-upload-kit.zip" founder-signal-upload-kit )
ls -la dist/founder-signal-upload-kit.zip
