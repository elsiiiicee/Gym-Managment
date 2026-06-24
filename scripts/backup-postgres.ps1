param(
    [string]$Container = "legion-db-1",
    [string]$Database = "legion",
    [string]$User = "legion",
    [string]$OutputDir = "backups"
)

$resolvedOutput = Join-Path (Resolve-Path .).Path $OutputDir
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $resolvedOutput "$Database-$timestamp.sql"

docker exec $Container pg_dump -U $User $Database | Out-File -Encoding utf8 $target
Write-Host "Backup written to $target"
