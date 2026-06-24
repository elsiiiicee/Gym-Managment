#!/usr/bin/env bash
# Runs the Legion Spring Boot backend on http://localhost:8080
# Zero-config: uses an in-memory H2 database (no Postgres needed) and seeds a
# bootstrap admin so you can log in immediately. Data resets on restart.
#
# Usage (from the repo root):
#   ./run-backend.sh
#
# To use a real Postgres/Supabase database instead, set SPRING_DATASOURCE_URL,
# SPRING_DATASOURCE_USERNAME, SPRING_DATASOURCE_PASSWORD and
# SPRING_PROFILES_ACTIVE=prod before running.
set -euo pipefail
cd "$(dirname "$0")"

export APP_JWT_SECRET="${APP_JWT_SECRET:-local-dev-jwt-secret-at-least-32-bytes-long}"
export APP_BOOTSTRAP_ADMIN_EMAIL="${APP_BOOTSTRAP_ADMIN_EMAIL:-admin@legion.test}"
export APP_BOOTSTRAP_ADMIN_PASSWORD="${APP_BOOTSTRAP_ADMIN_PASSWORD:-AdminTest123!}"

echo ""
echo "=== Legion backend (H2 in-memory) ==="
echo "URL          : http://localhost:8080"
echo "Admin login  : ${APP_BOOTSTRAP_ADMIN_EMAIL} / ${APP_BOOTSTRAP_ADMIN_PASSWORD}"
echo "Health       : http://localhost:8080/actuator/health"
echo ""

./mvnw spring-boot:run
