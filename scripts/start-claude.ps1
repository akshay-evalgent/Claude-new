# Loads .env from the repo root into this process, then starts Claude Code.
# Usage (from the repo root, in PowerShell or Windows Terminal):
#   .\scripts\start-claude.ps1
#   .\scripts\start-claude.ps1 --chrome        # any extra args are passed to claude
#
# If PowerShell refuses to run scripts, run once:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) {
    Write-Host "No .env found. Run:  Copy-Item .env.example .env   and fill it in." -ForegroundColor Yellow
    exit 1
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $name  = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    # strip optional surrounding quotes
    if ($value.Length -ge 2 -and (($value[0] -eq '"' -and $value[-1] -eq '"') -or ($value[0] -eq "'" -and $value[-1] -eq "'"))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

if (-not $env:BRAVE_API_KEY) {
    Write-Host "BRAVE_API_KEY is empty: the brave-search server will not start. Browser servers are unaffected." -ForegroundColor Yellow
}

& claude @args
