# Shared helpers for the Comet MCP scripts. Dot-source this file; do not run it directly.

function Import-DotEnv([string]$Path) {
    if (-not (Test-Path $Path)) { return $false }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { return }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { return }
        $name  = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim()
        if ($value.Length -ge 2 -and (($value[0] -eq '"' -and $value[-1] -eq '"') -or ($value[0] -eq "'" -and $value[-1] -eq "'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
    return $true
}

function Find-Comet {
    # Returns the first existing comet.exe, or $null. Honors COMET_PATH first.
    $candidates = @(
        $env:COMET_PATH,
        "$env:LOCALAPPDATA\Perplexity\Comet\Application\comet.exe",
        "$env:ProgramFiles\Perplexity\Comet\Application\comet.exe",
        "$env:ProgramFiles\Comet\Application\comet.exe",
        "$env:ProgramFiles\Comet\comet.exe",
        "${env:ProgramFiles(x86)}\Perplexity\Comet\Application\comet.exe"
    ) | Where-Object { $_ }
    $hit = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($hit) { return $hit }

    # Fall back to the Start Menu shortcut target.
    $shortcuts = @(
        "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Comet.lnk",
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Comet.lnk",
        "$env:USERPROFILE\Desktop\Comet.lnk"
    )
    foreach ($lnk in $shortcuts) {
        if (Test-Path $lnk) {
            try {
                $target = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk).TargetPath
                if ($target -and (Test-Path $target)) { return $target }
            } catch { }
        }
    }
    return $null
}
