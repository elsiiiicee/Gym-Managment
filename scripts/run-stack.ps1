# Launches the Spring Boot backend (against Supabase) + the Next.js dev server.
# Works on both Windows PowerShell 5.1 and PowerShell 7+.
# Usage from the repo root:
#
#   .\scripts\run-stack.ps1
#
# Reads .env / .env.local for DIRECT_URL (the Supabase session-mode pooler).
# Falls back to existing SPRING_DATASOURCE_* env vars if those are set.

$ErrorActionPreference = 'Stop'

# Pick whichever PowerShell host this script is running under for the
# child windows, so Windows PowerShell 5.1 users don't need pwsh installed.
$psHost = if ($PSVersionTable.PSVersion.Major -ge 7) { 'pwsh' } else { 'powershell' }

function Load-DotEnv([string]$path) {
    if (-not (Test-Path $path)) { return }
    Write-Host "Loading $path"
    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if ($line.Length -eq 0 -or $line.StartsWith('#')) { return }
        $eq = $line.IndexOf('=')
        if ($eq -lt 1) { return }
        $name = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim()
        if ($value.Length -ge 2 -and
            (($value.StartsWith('"') -and $value.EndsWith('"')) -or
             ($value.StartsWith("'") -and $value.EndsWith("'")))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if (-not (Test-Path "env:$name")) {
            Set-Item -Path "env:$name" -Value $value
        }
    }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Load-DotEnv (Join-Path $repoRoot '.env')
Load-DotEnv (Join-Path $repoRoot '.env.local')

# Parse a postgres URL into SPRING_DATASOURCE_* env vars.
function Parse-PostgresUrl([string]$url) {
    if ([string]::IsNullOrWhiteSpace($url)) { return $false }
    # Accept either "postgres://" or "postgresql://" prefix.
    $normalized = $url -replace '^postgres://', 'postgresql://'
    try {
        $u = [Uri]$normalized
    } catch {
        Write-Warning "Could not parse '$url' as a URI"
        return $false
    }
    if ([string]::IsNullOrEmpty($u.Host) -or [string]::IsNullOrEmpty($u.UserInfo)) {
        Write-Warning "URL is missing host or credentials: $url"
        return $false
    }
    $ui = $u.UserInfo.Split(':', 2)
    if ($ui.Length -ne 2) {
        Write-Warning "URL credentials must be user:password - got '$($u.UserInfo)'"
        return $false
    }
    $port = if ($u.Port -gt 0) { $u.Port } else { 5432 }
    $db = $u.AbsolutePath.TrimStart('/')
    if (-not $db) { $db = 'postgres' }
    $env:SPRING_DATASOURCE_URL = "jdbc:postgresql://$($u.Host):$port/$($db)?sslmode=require"
    $env:SPRING_DATASOURCE_USERNAME = [Uri]::UnescapeDataString($ui[0])
    $env:SPRING_DATASOURCE_PASSWORD = [Uri]::UnescapeDataString($ui[1])
    return $true
}

if (-not $env:SPRING_DATASOURCE_URL) {
    # Try DIRECT_URL first (session-mode pooler, port 5432 - correct for JDBC).
    # Fall back to DATABASE_URL only if it's not the transaction pooler (6543).
    $candidates = @($env:DIRECT_URL, $env:DATABASE_URL)
    $parsed = $false
    foreach ($candidate in $candidates) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        if ($candidate -match ':6543/') {
            Write-Host "Skipping transaction-mode pooler URL (port 6543 isn't compatible with JDBC prepared statements)."
            continue
        }
        if (Parse-PostgresUrl $candidate) {
            $parsed = $true
            break
        }
    }
    if (-not $parsed) {
        Write-Error @"
Could not derive SPRING_DATASOURCE_* from .env.local.

I looked for DIRECT_URL and DATABASE_URL but didn't get a usable
postgresql://user:password@host:port/db value.

To diagnose, run:
  (Get-Content .env.local | Select-String '^DIRECT_URL=').Line -replace '://[^@]+@','://<USER>:<PASS>@'

Then either uncomment DIRECT_URL in .env.local with the Supabase
session-pooler URL (port 5432), or set SPRING_DATASOURCE_URL,
SPRING_DATASOURCE_USERNAME, SPRING_DATASOURCE_PASSWORD manually
before running this script.
"@
        exit 1
    }
}

if (-not $env:APP_JWT_SECRET) {
    $secure = Read-Host 'Enter APP_JWT_SECRET (32+ chars)' -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $env:APP_JWT_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    if ($env:APP_JWT_SECRET.Length -lt 32) {
        Write-Error 'JWT secret must be at least 32 characters.'
        exit 1
    }
}

if (-not $env:SPRING_PROFILES_ACTIVE) {
    $env:SPRING_PROFILES_ACTIVE = 'prod'
}

if (-not $env:APP_CORS_ALLOWED_ORIGINS) {
    $env:APP_CORS_ALLOWED_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001'
}

if ($env:NEXT_PUBLIC_SUPABASE_URL -and -not $env:supabase_url) {
    $env:supabase_url = $env:NEXT_PUBLIC_SUPABASE_URL
}

# Mask the password for display only.
$displayUrl = $env:SPRING_DATASOURCE_URL
Write-Host ''
Write-Host '=== Launching stack ==='
Write-Host "DB URL    : $displayUrl"
Write-Host "DB user   : $($env:SPRING_DATASOURCE_USERNAME)"
Write-Host "Profile   : $($env:SPRING_PROFILES_ACTIVE)"
Write-Host "CORS      : $($env:APP_CORS_ALLOWED_ORIGINS)"
Write-Host ''

$backendCmd = "cd '$repoRoot'; .\mvnw.cmd spring-boot:run"
Start-Process -FilePath $psHost -ArgumentList '-NoExit', '-Command', $backendCmd | Out-Null
Write-Host 'Backend launching in a new PowerShell window. Wait for "Started LegionApplication" before signing in.'

$frontendCmd = "cd '$(Join-Path $repoRoot 'frontend')'; npm install --no-audit --no-fund; npm run dev"
Start-Process -FilePath $psHost -ArgumentList '-NoExit', '-Command', $frontendCmd | Out-Null
Write-Host 'Frontend launching in a new PowerShell window. Open http://localhost:3000 once both are up.'
