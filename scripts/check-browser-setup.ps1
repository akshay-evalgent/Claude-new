# Checks this Windows machine for everything the Brave browser + search MCP setup needs.
# Run from the repo root in PowerShell:  .\scripts\check-browser-setup.ps1

function Ok($m)   { Write-Host "  [ok]   $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  [warn] $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "  [FAIL] $m" -ForegroundColor Red }

# Load .env if present so BRAVE_PATH / BRAVE_API_KEY are visible to the checks.
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { return }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { return }
        [Environment]::SetEnvironmentVariable($line.Substring(0, $idx).Trim(), $line.Substring($idx + 1).Trim(), 'Process')
    }
} else {
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

Write-Host "Brave binary"
$candidates = @(
    $env:BRAVE_PATH,
    "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
    "${env:ProgramFiles(x86)}\BraveSoftware\Brave-Browser\Application\brave.exe",
    "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe"
) | Where-Object { $_ }
$found = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Ok "Brave at: $found"
    if (-not $env:BRAVE_PATH) {
        $fwd = $found -replace '\\', '/'
        Warn "BRAVE_PATH is not set. Put this in .env:  BRAVE_PATH=$fwd"
    }
} else {
    Fail "Brave not found in the usual places. Set BRAVE_PATH in .env to the full path of brave.exe (forward slashes)."
}

Write-Host "Brave Search API key"
if ($env:BRAVE_API_KEY) { Ok "BRAVE_API_KEY is set" }
else { Warn "BRAVE_API_KEY is empty. Get one at https://brave.com/search/api/ and put it in .env." }

Write-Host "Playwright MCP package"
if (Get-Command npx -ErrorAction SilentlyContinue) {
    $null = & cmd /c "npx -y @playwright/mcp@latest --version" 2>&1
    if ($LASTEXITCODE -eq 0) { Ok "@playwright/mcp runs" }
    else { Warn "Could not run @playwright/mcp via npx (network or Node problem). It is fetched on first use." }
}

Write-Host "Playwright Extension (needed only for the 'brave-browser' server)"
Write-Host "  Install in Brave: https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm"
Write-Host "  Brave must be running with that extension enabled when Claude Code starts."
Write-Host ""
Write-Host "Next:  Copy-Item .env.example .env ; edit .env ; .\scripts\start-claude.ps1"
