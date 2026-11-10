# Checks this Windows machine for everything the Comet browser + search MCP setup needs.
# Run from the repo root in PowerShell:  .\scripts\check-browser-setup.ps1

. (Join-Path $PSScriptRoot 'comet-common.ps1')

function Ok($m)   { Write-Host "  [ok]   $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  [warn] $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "  [FAIL] $m" -ForegroundColor Red }

$root = Split-Path -Parent $PSScriptRoot
if (-not (Import-DotEnv (Join-Path $root '.env'))) {
    Warn ".env not found. Copy .env.example to .env and fill it in."
}

Write-Host "Node / npx"
if (Get-Command npx -ErrorAction SilentlyContinue) {
    Ok "npx found: $(node --version)"
} else {
    Fail "npx not found. Install Node.js 18+ from https://nodejs.org (tick 'Add to PATH'), then reopen the terminal."
}

Write-Host "Claude Code"
if (Get-Command claude -ErrorAction SilentlyContinue) {
    Ok "claude found: $(claude --version 2>$null)"
} else {
    Fail "claude not on PATH. Install: npm install -g @anthropic-ai/claude-code"
}

Write-Host "Comet browser"
$comet = Find-Comet
if ($comet) {
    Ok "Comet at: $comet"
    if (-not $env:COMET_PATH) {
        Ok "COMET_PATH is empty, start-claude.ps1 will auto-detect this path."
    }
} else {
    Fail "Comet not found. Right-click your Comet shortcut > Properties > Target, and put that path in .env as COMET_PATH (forward slashes)."
}

Write-Host "Brave Search API key (search only, independent of the browser)"
if ($env:BRAVE_API_KEY) { Ok "BRAVE_API_KEY is set" }
else { Warn "BRAVE_API_KEY is empty. Get one at https://brave.com/search/api/ and put it in .env." }

Write-Host "Playwright MCP package"
if (Get-Command npx -ErrorAction SilentlyContinue) {
    $null = & cmd /c "npx -y @playwright/mcp@latest --version" 2>&1
    if ($LASTEXITCODE -eq 0) { Ok "@playwright/mcp runs" }
    else { Warn "Could not run @playwright/mcp via npx (network or Node problem). It is fetched on first use." }
}

Write-Host "Playwright Extension (needed only for the 'comet-browser' server)"
Write-Host "  Install in Comet: https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm"
Write-Host "  Comet must be running with that extension enabled when Claude Code starts."
Write-Host ""
Write-Host "Next:  Copy-Item .env.example .env ; edit .env ; .\scripts\start-claude.ps1"
