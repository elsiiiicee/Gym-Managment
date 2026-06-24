#!/usr/bin/env bash
# Runs the Legion Next.js frontend on http://localhost:3000
# Installs deps on first run, then starts the dev server. The dev server proxies
# /api/* to the backend at http://localhost:8080, so start the backend first
# (./run-backend.sh) in another terminal.
#
# Usage (from the repo root):
#   ./run-frontend.sh
set -euo pipefail
cd "$(dirname "$0")/frontend"

if [ ! -d node_modules ]; then
  echo "Installing frontend dependencies..."
  npm install --no-audit --no-fund
fi

echo ""
echo "=== Legion frontend ==="
echo "URL : http://localhost:3000  (proxies /api/* to http://localhost:8080)"
echo ""

npm run dev
