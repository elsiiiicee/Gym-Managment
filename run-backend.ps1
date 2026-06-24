# Runs the Legion Spring Boot backend on http://localhost:8080
# Zero-config: uses an in-memory H2 database (no Postgres needed) and seeds a
# bootstrap admin so you can log in immediately. Data resets on restart.
#
# Usage (from the repo root):
#   .\run-backend.ps1
#
# To use a real Postgres/Supabase database instead, set SPRING_DATASOURCE_URL,
# SPRING_DATASOURCE_USERNAME, SPRING_DATASOURCE_PASSWORD and
# SPRING_PROFILES_ACTIVE=prod before running (or use scripts\run-stack.ps1).

$ErrorActionPreference = 'Stop'

if (-not $env:APP_JWT_SECRET) {
    $env:APP_JWT_SECRET = 'local-dev-jwt-secret-at-least-32-bytes-long'
}
# Seed an admin account on first boot (in-memory DB, so every run reseeds).
if (-not $env:APP_BOOTSTRAP_ADMIN_EMAIL) {
    $env:APP_BOOTSTRAP_ADMIN_EMAIL = 'admin@legion.test'
}
if (-not $env:APP_BOOTSTRAP_ADMIN_PASSWORD) {
    $env:APP_BOOTSTRAP_ADMIN_PASSWORD = 'AdminTest123!'
}

Write-Host ''
Write-Host '=== Legion backend (H2 in-memory) ==='
Write-Host 'URL          : http://localhost:8080'
Write-Host "Admin login  : $($env:APP_BOOTSTRAP_ADMIN_EMAIL) / $($env:APP_BOOTSTRAP_ADMIN_PASSWORD)"
Write-Host 'Health       : http://localhost:8080/actuator/health'
Write-Host ''

& .\mvnw spring-boot:run
