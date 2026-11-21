#!/bin/bash
# Sets up the free toolchain used in this repo on Linux (no accounts needed):
#   Blender 4.5 LTS, MPFB (MakeHuman for Blender) with the CC0 MakeHuman system assets,
#   a few CMU motion-capture clips and a Poly Haven street HDRI.
set -e
KIT="$(cd "$(dirname "$0")" && pwd)"
BL=/opt/blender/blender-4.5.16-linux-x64/blender
mkdir -p "$KIT/downloads"

if [ ! -x "$BL" ]; then
  mkdir -p /opt/blender && cd /opt/blender
  curl -fL -o blender.tar.xz https://download.blender.org/release/Blender4.5/blender-4.5.16-linux-x64.tar.xz
  tar -xf blender.tar.xz && rm blender.tar.xz
fi

cd "$KIT/downloads"
[ -s mpfb.zip ] || curl -fL -o mpfb.zip "https://extensions.blender.org/download/sha256:c075b3e9b94b8e5556a5f03f4653602d02ea306de08126e8f55ed6dee28a2dad/add-on-mpfb-v2.0.18.zip?repository=%2Fapi%2Fv1%2Fextensions%2F&blender_version_min=4.2.0"
[ -s mh_system_assets.zip ] || curl -fL -o mh_system_assets.zip "http://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip"
[ -s ual.zip ] || curl -fL -o ual.zip https://opengameart.org/sites/default/files/universal_animation_librarystandard.zip

"$BL" --command extension install-file -r user_default -e mpfb.zip
"$BL" -b --python-expr "import bpy, sys; bpy.ops.mpfb.load_pack(filepath='$KIT/downloads/mh_system_assets.zip')"

cd "$KIT"
for c in 02_01 07_05 08_01 16_15 35_01 39_02 69_01; do python3 fetch.py cmu $c; done
python3 fetch.py polyhaven-hdri wide_street_02 4k
echo "Ready. Try: $BL -b -P blender/walk_demo.py -- --shot S1 --still 48 --pct 40"
