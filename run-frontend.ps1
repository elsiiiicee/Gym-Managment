# Runs the Legion Next.js frontend on http://localhost:3000
# Installs deps on first run, then starts the dev server. The dev server proxies
# /api/* to the backend at http://localhost:8080, so start the backend first
# (.\run-backend.ps1) in another terminal.
#
# Usage (from the repo root):
#   .\run-frontend.ps1

$ErrorActionPreference = 'Stop'

Set-Location (Join-Path $PSScriptRoot 'frontend')

if (-not (Test-Path 'node_modules')) {
    Write-Host 'Installing frontend dependencies...'
    npm install --no-audit --no-fund
}

Write-Host ''
Write-Host '=== Legion frontend ==='
Write-Host 'URL : http://localhost:3000  (proxies /api/* to http://localhost:8080)'
Write-Host ''

npm run dev
