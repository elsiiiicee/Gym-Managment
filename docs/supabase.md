# Supabase as production Postgres

The Legion backend treats Supabase as a standard managed PostgreSQL. Schema
is owned by Flyway; Hibernate runs in `validate` mode and never mutates
production DDL.

## Required environment variables

| Var | Example | Notes |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` | Enables Flyway and `ddl-auto=validate`. |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require` | **Session pooler** (port 5432) or direct connection. Do NOT use the transaction pooler (6543). |
| `SPRING_DATASOURCE_USERNAME` | `postgres.<project-ref>` | Format Supabase shows in the dashboard. |
| `SPRING_DATASOURCE_PASSWORD` | `<your-db-password>` | From Supabase project settings. Treat as secret. |
| `APP_JWT_SECRET` | 32+ random chars | Validated at startup by `ProductionSafetyRunner`. |
| `APP_CORS_ALLOWED_ORIGINS` | `https://app.example.com` | Comma-separated. |
| `APP_BOOTSTRAP_ADMIN_EMAIL` / `APP_BOOTSTRAP_ADMIN_PASSWORD` | — | Only for first-boot seeding; remove after. |

Optional HikariCP tuning (env-overridable, all set in `application-prod.properties`):

| Var | Default |
| --- | --- |
| `DB_POOL_MAX_SIZE` | 20 |
| `DB_POOL_MIN_IDLE` | 5 |
| `DB_POOL_CONN_TIMEOUT_MS` | 30000 |
| `DB_POOL_IDLE_TIMEOUT_MS` | 600000 |
| `DB_POOL_MAX_LIFETIME_MS` | 1800000 |

## Why session pooler, not transaction pooler

Supabase exposes two PgBouncer endpoints:

- **Session pooler (5432)** — full session semantics. Prepared statements
  work. Use this OR a direct connection.
- **Transaction pooler (6543)** — connection-per-transaction. Breaks
  Hibernate's named prepared statements and pessimistic locks the wallet
  service relies on (`SELECT ... FOR UPDATE`).

If you must use the transaction pooler for some reason, set
`PGOPTIONS="-c statement_cache_mode=describe"` on the JDBC URL and accept
performance loss; the safer choice is the session pooler.

## First-boot checklist

1. Create the database (Supabase does this for you — the default `postgres` DB is fine).
2. Set the env vars above on your runtime (your shell, a PaaS like Render/Fly, etc.).
3. Boot the backend. On startup:
   - HikariCP opens connections.
   - Flyway runs `V1__platform_schema.sql` then `V2__wallet_and_admin_reset.sql`.
   - Hibernate validates the live schema against the entity model and fails
     fast on any drift.
   - `ProductionSafetyRunner` validates that `APP_JWT_SECRET` is set.
4. Hit `GET /actuator/health` — should return `UP` with `db` component `UP`.
5. (Optional) `GET /actuator/health/db` for the connection check details.

### If startup fails

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `SSLException` | Supabase requires SSL | Add `?sslmode=require` to JDBC URL |
| `password authentication failed` | Wrong user format | Use `postgres.<project-ref>` from Supabase, not bare `postgres` |
| `Schema validation: missing table [wallets]` | Flyway didn't run | Confirm `SPRING_PROFILES_ACTIVE=prod` and check Flyway logs at boot |
| `Schema validation: missing column [...]` on a pre-existing DB | DB was Hibernate-created before Flyway, schema drifted | See "Baselining an existing database" below |
| Hangs on `SELECT 1` then 30s timeout | Using transaction pooler (6543) | Switch to session pooler (5432) or direct connection |

## Baselining an existing database

If you've been running this app with `ddl-auto=update` against Supabase and
now want to flip to Flyway + `validate`, the existing schema needs to be
adopted as the Flyway baseline so V1/V2 do not try to re-create tables:

```bash
# Option A: let Flyway baseline automatically on first run (already set).
# spring.flyway.baseline-on-migrate=true means Flyway treats the live DB as
# baseline version 1 and applies only newer migrations.

# Option B: explicitly mark version 2 as the baseline so neither V1 nor V2
# attempts to re-create existing tables.
SPRING_FLYWAY_BASELINE_VERSION=2 \
SPRING_FLYWAY_BASELINE_ON_MIGRATE=true \
java -jar app.jar
```

After the first successful boot, the `flyway_schema_history` table records
state. Subsequent boots apply only new migrations.

## Verifying the validation steps

Use the bundled `scripts/check-supabase.sh` (or the Windows equivalent below)
with your Supabase URL. It:

1. Opens a JDBC connection.
2. Lists the `flyway_schema_history` rows.
3. Asserts the wallet + audit tables exist.
4. Exits non-zero on any failure so CI can gate on it.

```bash
SPRING_DATASOURCE_URL='jdbc:postgresql://aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require' \
SPRING_DATASOURCE_USERNAME='postgres.xxxxxxxxxxxxxxxxxxxx' \
SPRING_DATASOURCE_PASSWORD='your-password' \
./scripts/check-supabase.sh
```

```powershell
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'
$env:SPRING_DATASOURCE_USERNAME = 'postgres.xxxxxxxxxxxxxxxxxxxx'
$env:SPRING_DATASOURCE_PASSWORD = 'your-password'
./scripts/check-supabase.ps1
```
