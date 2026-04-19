#!/usr/bin/env bash
# Apply Supabase auth/storage roles, then every project migration in order.
# Run AFTER `docker compose up -d db` and the db is healthy.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then echo ".env not found — run generate-secrets.sh first" >&2; exit 1; fi
set -a; . ./.env; set +a

PSQL="docker compose exec -T -e PGPASSWORD=$POSTGRES_PASSWORD db psql -U postgres -d postgres -v ON_ERROR_STOP=1"

echo "▶ Bootstrapping roles & schemas required by GoTrue/PostgREST…"
$PSQL <<SQL
-- Roles expected by Supabase services
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticator') THEN
    EXECUTE format('CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD %L', '${POSTGRES_PASSWORD}');
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='supabase_auth_admin') THEN
    EXECUTE format('CREATE ROLE supabase_auth_admin LOGIN CREATEROLE PASSWORD %L', '${POSTGRES_PASSWORD}');
  END IF;
END \$\$;

GRANT anon, authenticated, service_role TO authenticator;

CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- auth.uid() / auth.role() helpers used by RLS
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS \$\$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
\$\$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS \$\$
  SELECT NULLIF(current_setting('request.jwt.claim.role', true), '');
\$\$;
SQL

echo "▶ Applying project migrations from ../supabase/migrations/…"
shopt -s nullglob
for f in ../supabase/migrations/*.sql; do
  echo "  • $(basename "$f")"
  docker compose exec -T -e PGPASSWORD=$POSTGRES_PASSWORD db \
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f"
done

echo "▶ Attaching auth.users → public.handle_new_user trigger…"
$PSQL <<'SQL'
-- Fires on every new auth signup (email + OAuth) so profiles + user_roles get a row.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
SQL

echo "▶ Reloading PostgREST schema cache"
$PSQL -c "NOTIFY pgrst, 'reload schema';" || true

echo "✅ Schema applied. You can now run migrate-from-cloud.sh to import data, or start using the app."
