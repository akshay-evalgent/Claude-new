# Loads .env from the repo root, auto-detects Comet, then starts Claude Code.
# Usage (from the repo root, in PowerShell or Windows Terminal):
#   .\scripts\start-claude.ps1
#   .\scripts\start-claude.ps1 --chrome        # any extra args are passed to claude
#
# If PowerShell refuses to run scripts, run once:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'comet-common.ps1')

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Import-DotEnv (Join-Path $root '.env'))) {
    Write-Host "No .env found. Run:  Copy-Item .env.example .env   and fill it in." -ForegroundColor Yellow
    exit 1
}

$comet = Find-Comet
if ($comet) {
    # Forward slashes keep the path safe inside .mcp.json argument expansion.
    $env:COMET_PATH = $comet -replace '\\', '/'
} else {
    Write-Host "Comet not found. The comet-direct server will fail to start; set COMET_PATH in .env." -ForegroundColor Yellow
    Write-Host "comet-browser (extension mode) and brave-search are unaffected." -ForegroundColor Yellow
    $env:COMET_PATH = 'comet.exe'
}

if (-not $env:BRAVE_API_KEY) {
    Write-Host "BRAVE_API_KEY is empty: the brave-search server will not start. Browser servers are unaffected." -ForegroundColor Yellow
}

& claude @args
