#!/usr/bin/env bash
# Checks the local machine for everything the Brave browser + search MCP setup needs.
# Run from the repo root on YOUR machine (not in a cloud session):  bash scripts/check-browser-setup.sh
set -u

ok()   { printf '  [ok]   %s\n' "$*"; }
warn() { printf '  [warn] %s\n' "$*"; }
fail() { printf '  [FAIL] %s\n' "$*"; }

echo "Node / npx"
if command -v npx >/dev/null 2>&1; then
  ok "npx found: $(node --version 2>/dev/null)"
else
  fail "npx not found. Install Node.js 18+ from https://nodejs.org"
fi

echo "Brave binary"
candidates=(
  "${BRAVE_PATH:-}"
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  "/usr/bin/brave-browser"
  "/usr/bin/brave"
  "/snap/bin/brave"
  "/opt/brave.com/brave/brave-browser"
  "/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe"
  "$HOME/AppData/Local/BraveSoftware/Brave-Browser/Application/brave.exe"
)
found=""
for c in "${candidates[@]}"; do
  [ -n "$c" ] && [ -x "$c" ] && { found="$c"; break; }
done
if [ -n "$found" ]; then
  ok "Brave at: $found"
  [ -z "${BRAVE_PATH:-}" ] && warn "BRAVE_PATH is not set. Put this in .env:  BRAVE_PATH=$found"
else
  fail "Brave not found in the usual places. Set BRAVE_PATH in .env to the full path of the Brave binary."
fi

echo "Brave Search API key"
if [ -n "${BRAVE_API_KEY:-}" ]; then
  ok "BRAVE_API_KEY is set"
else
  warn "BRAVE_API_KEY is empty. Get one at https://brave.com/search/api/ and put it in .env (search server will not start without it)."
fi

echo "Playwright MCP package"
if command -v npx >/dev/null 2>&1 && npx -y @playwright/mcp@latest --version >/dev/null 2>&1; then
  ok "@playwright/mcp runs"
else
  warn "Could not run @playwright/mcp via npx (network or Node problem). It will be fetched on first use."
fi

echo "Playwright Extension (needed only for the 'brave-browser' server)"
echo "  Install in Brave from: https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm"
echo "  Brave must be running with that extension enabled when Claude Code starts."

echo
echo "Next: cp .env.example .env, fill it in, then:  set -a; source .env; set +a; claude"
