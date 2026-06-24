# Load testing

Scenarios live in `k6-platform.js`. They target the unauthenticated read
surface (health, catalog, membership-plans, classes) because authenticated
flows would either need a seeded user fixture per VU or would exercise the
rate limiter rather than the application.

## Install k6

- Windows: `winget install k6.k6` or `choco install k6`
- macOS: `brew install k6`
- Linux: see https://k6.io/docs/get-started/installation/

## Running

```
# Local laptop smoke (default). 5 VUs for 20s, safe against any backend.
k6 run load-tests/k6-platform.js

# 100 VUs for 1 min. Acceptable against a single dev process on modern hardware.
k6 run --env SCENARIO=smoke_100_users --env BASE_URL=http://localhost:8080 \
  load-tests/k6-platform.js

# 1,000 VUs ramping over 6 min. STAGING ONLY.
k6 run --env SCENARIO=ramp_1000_users --env BASE_URL=https://staging.example \
  load-tests/k6-platform.js

# 10,000 VUs spike over 6 min. STAGING ONLY with a tuned HikariCP pool
# (DB_POOL_MAX_SIZE) and full observability (Prometheus/Grafana, APM).
k6 run --env SCENARIO=spike_10000_users --env BASE_URL=https://staging.example \
  load-tests/k6-platform.js
```

## What to capture

For each non-smoke run, collect alongside the k6 summary:

1. **API response times** — k6 reports `http_req_duration` p50/p95/p99 per scenario.
2. **CPU + memory** — `top`, `htop`, or `docker stats` for the backend container; cloud-provider metrics for managed deployments.
3. **HikariCP pool** — Spring exposes `hikaricp_connections_active`,
   `_idle`, `_pending`, `_acquire` via `/actuator/prometheus`. Watch
   `pending > 0` and `acquire` p99: those indicate pool exhaustion.
4. **Postgres** — `pg_stat_activity` for active sessions, `pg_locks` for
   contention, `pg_stat_statements` for slow queries.
5. **JVM** — `jvm_memory_used_bytes{area="heap"}` and GC pause time via
   actuator/prometheus.

## Tuning guidance

- If `hikaricp_connections_pending` is non-zero at steady state, raise
  `DB_POOL_MAX_SIZE`. Don't exceed Postgres `max_connections / N_replicas`.
- If `http_req_duration p95 > 500ms` while CPU is low, check pool exhaustion
  and slow queries before scaling instances.
- The 10k spike is a tail-latency test, not a capacity test. Failing the
  p95 threshold at 10k VUs is acceptable if the pool/CPU saturates
  gracefully (429s, no 5xx).

## Note on this environment

A live run is not included in this branch's CI because:
- k6 isn't installed on the developer workstation that ran the build.
- The 1k/10k VU scenarios are not meaningful against a single dev process
  with in-memory H2; they need staging-grade hardware + Postgres.

Add a separate `load-test` GitHub workflow that runs on a `workflow_dispatch`
against your staging URL once that environment exists.
