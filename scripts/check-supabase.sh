#!/usr/bin/env bash
#
# Verifies Supabase wiring for the Legion backend AFTER `mvn spring-boot:run`
# (or the container) has booted with SPRING_PROFILES_ACTIVE=prod at least
# once. Checks:
#
#   1. JDBC URL reaches Supabase
#   2. Flyway ran and recorded V1 + V2 in flyway_schema_history
#   3. Required tables exist (wallets, wallet_transactions,
#      password_reset_audits, plus the V1 platform tables)
#   4. The CRITICAL constraints we rely on (wallet idempotency unique
#      key, balance non-negative check) are present
#
# Exits non-zero on any failure so CI can gate on it.
#
# Requires: psql, jq (optional, for nicer output).
set -euo pipefail

: "${SPRING_DATASOURCE_URL:?Set SPRING_DATASOURCE_URL to your Supabase JDBC URL}"
: "${SPRING_DATASOURCE_USERNAME:?Set SPRING_DATASOURCE_USERNAME}"
: "${SPRING_DATASOURCE_PASSWORD:?Set SPRING_DATASOURCE_PASSWORD}"

# Convert jdbc:postgresql://host:port/db?params to a libpq URL psql can use.
LIBPQ_URL="$(printf '%s' "$SPRING_DATASOURCE_URL" | sed 's#^jdbc:postgresql://#postgresql://#')"
export PGPASSWORD="$SPRING_DATASOURCE_PASSWORD"

run_query() {
    psql "$LIBPQ_URL" \
        --username "$SPRING_DATASOURCE_USERNAME" \
        --no-psqlrc \
        --tuples-only \
        --no-align \
        --command "$1"
}

fail() { echo "FAIL: $1" >&2; exit 1; }
ok()   { echo "ok:   $1"; }

echo "=== Supabase Spring Boot wiring check ==="
echo "URL: $LIBPQ_URL"

# 1. Connectivity.
if ! run_query "select 1" >/dev/null; then
    fail "could not connect"
fi
ok "connection established"

# 2. Flyway history.
FLYWAY_COUNT=$(run_query "select count(*) from flyway_schema_history where success = true and version in ('1','2')")
if [[ "$FLYWAY_COUNT" != "2" ]]; then
    fail "Flyway history shows $FLYWAY_COUNT/2 successful migrations (V1, V2). Run the backend with SPRING_PROFILES_ACTIVE=prod first."
fi
ok "Flyway recorded V1 and V2 as successful"

# 3. Required tables.
REQUIRED_TABLES=(
    app_users profiles refresh_tokens account_tokens
    notifications mail_outbox_messages
    products cart_items customer_orders order_items payments
    trainers membership_plans user_subscriptions
    gym_classes class_bookings
    wallets wallet_transactions password_reset_audits
)
MISSING=()
for t in "${REQUIRED_TABLES[@]}"; do
    EXISTS=$(run_query "select to_regclass('public.$t') is not null")
    if [[ "$EXISTS" != "t" ]]; then
        MISSING+=("$t")
    fi
done
if (( ${#MISSING[@]} > 0 )); then
    fail "missing tables: ${MISSING[*]}"
fi
ok "all 19 required tables exist"

# 4. Critical wallet constraints.
WALLET_IDEM=$(run_query "
    select count(*) from pg_constraint
     where conname = 'uk_wallet_tx_idempotency' and contype = 'u'
")
if [[ "$WALLET_IDEM" != "1" ]]; then
    fail "uk_wallet_tx_idempotency unique constraint missing — idempotency cannot be enforced at the DB layer"
fi
ok "wallet idempotency unique constraint present"

WALLET_BAL=$(run_query "
    select count(*) from pg_constraint
     where conname = 'ck_wallet_balance_nonneg' and contype = 'c'
")
if [[ "$WALLET_BAL" != "1" ]]; then
    fail "ck_wallet_balance_nonneg check missing — negative balance cannot be enforced at the DB layer"
fi
ok "wallet non-negative balance check present"

# 5. Audit table populated columns.
AUDIT_COLS=$(run_query "
    select string_agg(column_name, ',' order by column_name)
      from information_schema.columns
     where table_schema = 'public' and table_name = 'password_reset_audits'
")
EXPECTED="admin_user_id,created_at,id,reason,target_user_id"
if [[ "$AUDIT_COLS" != "$EXPECTED" ]]; then
    fail "password_reset_audits columns mismatch. expected=$EXPECTED actual=$AUDIT_COLS"
fi
ok "password_reset_audits columns match"

echo
echo "=== all checks passed ==="
