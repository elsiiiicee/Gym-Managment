# PowerShell equivalent of check-supabase.sh.
# Verifies Supabase wiring for the Legion backend AFTER the app has booted
# at least once with SPRING_PROFILES_ACTIVE=prod (so Flyway has run).
#
# Requires psql on PATH. Same env vars as the bash version.
$ErrorActionPreference = 'Stop'

foreach ($var in 'SPRING_DATASOURCE_URL', 'SPRING_DATASOURCE_USERNAME', 'SPRING_DATASOURCE_PASSWORD') {
    if (-not (Test-Path "env:$var")) {
        Write-Error "Set $var before running this script."
        exit 1
    }
}

$libpqUrl = (Get-Item env:SPRING_DATASOURCE_URL).Value -replace '^jdbc:postgresql://', 'postgresql://'
$env:PGPASSWORD = (Get-Item env:SPRING_DATASOURCE_PASSWORD).Value
$username = (Get-Item env:SPRING_DATASOURCE_USERNAME).Value

function Invoke-PsqlScalar([string]$sql) {
    $output = & psql $libpqUrl --username $username --no-psqlrc --tuples-only --no-align --command $sql 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "psql failed: $output"
        exit 1
    }
    return ($output | Select-Object -First 1).ToString().Trim()
}

function Pass($msg) { Write-Host "ok:   $msg" }
function Fail($msg) { Write-Error "FAIL: $msg"; exit 1 }

Write-Host "=== Supabase Spring Boot wiring check ==="
Write-Host "URL: $libpqUrl"

# 1. Connectivity.
$ping = Invoke-PsqlScalar "select 1"
if ($ping -ne '1') { Fail "could not connect" }
Pass "connection established"

# 2. Flyway history.
$flywayCount = Invoke-PsqlScalar "select count(*) from flyway_schema_history where success = true and version in ('1','2')"
if ($flywayCount -ne '2') {
    Fail "Flyway history shows $flywayCount/2 successful migrations. Run the backend with SPRING_PROFILES_ACTIVE=prod first."
}
Pass "Flyway recorded V1 and V2 as successful"

# 3. Required tables.
$required = @(
    'app_users','profiles','refresh_tokens','account_tokens',
    'notifications','mail_outbox_messages',
    'products','cart_items','customer_orders','order_items','payments',
    'trainers','membership_plans','user_subscriptions',
    'gym_classes','class_bookings',
    'wallets','wallet_transactions','password_reset_audits'
)
$missing = @()
foreach ($t in $required) {
    $exists = Invoke-PsqlScalar "select to_regclass('public.$t') is not null"
    if ($exists -ne 't') { $missing += $t }
}
if ($missing.Count -gt 0) { Fail ("missing tables: " + ($missing -join ', ')) }
Pass "all $($required.Count) required tables exist"

# 4. Critical wallet constraints.
$walletIdem = Invoke-PsqlScalar "select count(*) from pg_constraint where conname = 'uk_wallet_tx_idempotency' and contype = 'u'"
if ($walletIdem -ne '1') { Fail "uk_wallet_tx_idempotency unique constraint missing" }
Pass "wallet idempotency unique constraint present"

$walletBal = Invoke-PsqlScalar "select count(*) from pg_constraint where conname = 'ck_wallet_balance_nonneg' and contype = 'c'"
if ($walletBal -ne '1') { Fail "ck_wallet_balance_nonneg check missing" }
Pass "wallet non-negative balance check present"

# 5. Audit columns.
$auditCols = Invoke-PsqlScalar "select string_agg(column_name, ',' order by column_name) from information_schema.columns where table_schema='public' and table_name='password_reset_audits'"
$expected = 'admin_user_id,created_at,id,reason,target_user_id'
if ($auditCols -ne $expected) {
    Fail "password_reset_audits columns mismatch. expected=$expected actual=$auditCols"
}
Pass "password_reset_audits columns match"

Write-Host ""
Write-Host "=== all checks passed ==="
