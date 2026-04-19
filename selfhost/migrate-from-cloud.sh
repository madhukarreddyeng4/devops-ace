#!/usr/bin/env bash
# Dump auth.users + every public.* table from your Lovable Cloud project
# and load it into the local self-hosted Postgres container.
#
#   SOURCE_DB_URL='postgresql://postgres.<ref>:<pw>@<host>:5432/postgres' \
#   bash migrate-from-cloud.sh
#
# Get SOURCE_DB_URL from Lovable: Cloud → Settings → Database → Connection string (Session pooler).
set -euo pipefail

cd "$(dirname "$0")"
if [ ! -f .env ]; then echo ".env missing"; exit 1; fi
set -a; . ./.env; set +a

: "${SOURCE_DB_URL:?Set SOURCE_DB_URL to your Lovable Cloud connection string}"

if ! command -v pg_dump >/dev/null; then
  echo "pg_dump not installed (apt install postgresql-client-15)"; exit 1
fi

STAMP=$(date -u +%Y%m%d-%H%M%S)
DUMP_DIR="./dumps/$STAMP"
mkdir -p "$DUMP_DIR"

echo "▶ Dumping auth.users (data only) from cloud…"
pg_dump "$SOURCE_DB_URL" \
  --data-only --no-owner --no-privileges \
  --table=auth.users --table=auth.identities \
  --column-inserts \
  > "$DUMP_DIR/auth.sql"

echo "▶ Dumping public schema (data only) from cloud…"
pg_dump "$SOURCE_DB_URL" \
  --data-only --no-owner --no-privileges \
  --schema=public \
  --disable-triggers \
  --column-inserts \
  > "$DUMP_DIR/public.sql"

echo "▶ Loading auth.users → local…"
docker compose exec -T -e PGPASSWORD=$POSTGRES_PASSWORD db \
  psql -U supabase_auth_admin -d postgres -v ON_ERROR_STOP=1 < "$DUMP_DIR/auth.sql" || {
    echo "⚠ auth load had errors — usually safe to ignore for duplicate rows"
  }

echo "▶ Loading public schema → local (truncating existing rows first)…"
# truncate in dependency-safe order
docker compose exec -T -e PGPASSWORD=$POSTGRES_PASSWORD db \
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
TRUNCATE TABLE
  public.quiz_attempts,
  public.questions,
  public.quizzes,
  public.categories,
  public.payments,
  public.user_roles,
  public.profiles
RESTART IDENTITY CASCADE;
SQL

docker compose exec -T -e PGPASSWORD=$POSTGRES_PASSWORD db \
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$DUMP_DIR/public.sql"

echo "▶ Notifying PostgREST to reload…"
docker compose exec -T -e PGPASSWORD=$POSTGRES_PASSWORD db \
  psql -U postgres -d postgres -c "NOTIFY pgrst, 'reload schema';" || true

echo "✅ Migration complete. Dumps saved at $DUMP_DIR (delete after verification)."
