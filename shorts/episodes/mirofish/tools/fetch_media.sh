#!/usr/bin/env bash
# Re-creates media_src/ for the MiroFish episode. Media is not committed: stock
# licences allow use in the video but not redistribution as a pack.
#   bash tools/fetch_media.sh && node tools/capture_demo.cjs ... && python3 prep_media.py
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p media_src/{stock,repo,ia,cap}

# Coverr (free licence, no attribution required): https://coverr.co/license
for s in coverr-coding-developer-7198 coverr-a-female-s-hands-typing-on-laptop-7520 \
         coverr-a-heap-of-old-money-illuminated-in-studio-lighting-9527 coverr-a-crowded-street-3991 \
         coverr-crowded-bridge-8424 coverr-a-man-typing-on-his-phone-while-sitting-on-the-curb-56 \
         coverr-cheering-crowd-1136 coverr-a-broker-working-with-a-candlestick-chart-7524; do
  [ -f "media_src/stock/$s.mp4" ] || curl -sfL -A "Mozilla/5.0" -o "media_src/stock/$s.mp4" "https://cdn.coverr.co/videos/$s/1080p.mp4"
done

# Wikimedia Commons, public domain: "Fish Zaitunay Bay 10.webm"
[ -f media_src/stock/Fish_Zaitunay_Bay_10.webm ] || curl -sfL -A "RepoShortsResearch/1.0 (https://github.com/akshay-evalgent/Claude-new)" \
  -o media_src/stock/Fish_Zaitunay_Bay_10.webm \
  "https://upload.wikimedia.org/wikipedia/commons/transcoded/4/44/Fish_Zaitunay_Bay_10.webm/Fish_Zaitunay_Bay_10.webm.1080p.vp9.webm"

# Internet Archive, Public Domain Mark: Dream of the Red Chamber, 1791 Cheng-Gao edition, vol. 1 (NLC scan)
[ -f media_src/ia/hlm_v1.pdf ] || curl -sfL -o media_src/ia/hlm_v1.pdf \
  "https://archive.org/download/nlc-892-411999026433-70907/NLC892-411999026433-70907_%E7%B4%85%E6%A8%93%E5%A4%A2_%E7%AC%AC1%E5%86%8A.pdf"

# MiroFish repo assets (AGPL-3.0 project; logo and screenshots shown for commentary)
if [ ! -f media_src/repo/logo.jpg ]; then
  tmp=$(mktemp -d); git clone -q --depth 1 https://github.com/666ghj/MiroFish.git "$tmp/m"
  cp "$tmp/m/static/image/MiroFish_logo_compressed.jpeg" media_src/repo/logo.jpg
  cp "$tmp/m/frontend/src/assets/logo/MiroFish_logo_left.jpeg" media_src/repo/logo_left.jpg
  cp "$tmp/m/static/image/Screenshot/运行截图1.png" media_src/repo/shot1_home.png
  cp "$tmp/m/static/image/Screenshot/运行截图5.png" media_src/repo/shot5_chat.png
  cp "$tmp/m/static/image/红楼梦模拟推演封面.jpg" media_src/repo/hlm_cover.jpg
  cp "$tmp/m/static/image/shanda_logo.png" media_src/repo/shanda.png
  rm -rf "$tmp"
fi
echo "media_src ready. Next: captures (tools/capture_demo.cjs, tools/capture_steps.cjs, tools/capture_github.cjs), then python3 prep_media.py"
