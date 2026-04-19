#!/usr/bin/env bash
# Pull latest code and rebuild only the frontend container (zero-downtime DB).
#   bash selfhost/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ git pull"
git pull --ff-only

echo "▶ Rebuilding frontend container only"
cd selfhost
docker compose up -d --build frontend

echo "▶ Pruning old images"
docker image prune -f

echo "✅ Deploy complete."
