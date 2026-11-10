#!/usr/bin/env bash
# Installs the free backend into a make-an-anime project created with `mv.rb init`.
#   ./setup.sh /path/to/project
set -euo pipefail
PROJECT="$(cd "${1:?usage: setup.sh PROJECT_DIR}" && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
test -f "$PROJECT/lib/fal_mv_gen.rb" || { echo "$PROJECT is not a make-an-anime project (run mv.rb init first)"; exit 2; }
mkdir -p "$PROJECT/lib/free"
cp "$HERE"/backend/lib/free/*.rb "$PROJECT/lib/free/"
cp "$HERE"/backend/tools/python/free_backend.py "$HERE"/backend/tools/python/kaggle_kernel.py "$PROJECT/tools/python/"
# One line in the toolkit loads the backend when MV_BACKEND=free; one line in the Rakefile adds its tasks.
grep -q 'free/client' "$PROJECT/lib/fal_mv_gen.rb" || \
  sed -i 's|^require "fal/client"$|require "fal/client"\nrequire "free/client" if ENV["MV_BACKEND"] == "free"|' "$PROJECT/lib/fal_mv_gen.rb"
grep -q 'free/tasks' "$PROJECT/Rakefile" || \
  printf '\nif ENV["MV_BACKEND"] == "free"\n  require_relative "lib/free/tasks"\n  Free::Tasks.install\nend\n' >> "$PROJECT/Rakefile"
# ImageMagick 6 installs have `convert` but no `magick` entry point. See free.env for the other Linux settings.
if ! command -v magick >/dev/null && command -v convert >/dev/null; then
  printf '#!/bin/sh\ncase "$1" in identify|montage|composite|mogrify|compare|convert) c="$1"; shift; exec "$c" "$@";; *) exec convert "$@";; esac\n' > /usr/local/bin/magick && chmod +x /usr/local/bin/magick
fi
# The p5 renderer starts Chromium without --no-sandbox, which fails as root in a container.
CHROME_BIN="${CHROME_BIN:-$(ls /opt/pw-browsers/chromium-*/chrome-linux64/chrome /usr/bin/chromium /usr/bin/google-chrome 2>/dev/null | head -1)}"
if [ -n "$CHROME_BIN" ] && [ ! -x /usr/local/bin/chrome-for-p5 ]; then
  printf '#!/bin/sh\nexec "%s" --no-sandbox --disable-dev-shm-usage "$@"\n' "$CHROME_BIN" > /usr/local/bin/chrome-for-p5 && chmod +x /usr/local/bin/chrome-for-p5
fi
# Local worker environment: Kaggle CLI and CPU speech recognition.
if [ ! -x "$PROJECT/.venv-free/bin/python" ]; then
  (command -v uv >/dev/null && uv venv -q -p 3.12 "$PROJECT/.venv-free") || python3 -m venv "$PROJECT/.venv-free"
fi
if command -v uv >/dev/null; then
  uv pip install -q -p "$PROJECT/.venv-free/bin/python" kaggle six faster-whisper
else
  "$PROJECT/.venv-free/bin/python" -m pip install -q kaggle six faster-whisper
fi
echo "Free backend installed in $PROJECT. Use: MV_BACKEND=free ruby mv.rb --project $PROJECT <task>"
