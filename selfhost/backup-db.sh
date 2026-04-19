#!/usr/bin/env bash
# Daily pg_dump → ./backups/. Wire to cron:
#   0 3 * * *  cd /home/ubuntu/madhuops/selfhost && bash backup-db.sh >> backup.log 2>&1
# To ship to S3, append:
#   aws s3 cp "$OUT" s3://your-bucket/madhuops/
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a
mkdir -p backups
STAMP=$(date -u +%Y%m%d-%H%M%S)
OUT="backups/madhuops-$STAMP.sql.gz"
docker compose exec -T -e PGPASSWORD=$POSTGRES_PASSWORD db \
  pg_dump -U postgres -d postgres --clean --if-exists | gzip > "$OUT"
echo "$(date -u) wrote $OUT ($(du -h "$OUT" | cut -f1))"
# Retain last 14 days
find backups -name 'madhuops-*.sql.gz' -mtime +14 -delete
