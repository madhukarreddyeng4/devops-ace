#!/usr/bin/env bash
# Generate a fresh .env for the self-hosted MadhuOps stack.
#   bash generate-secrets.sh > .env
# Then edit the file to set DOMAIN / SITE_URL / RAZORPAY_* values.
set -euo pipefail

if ! command -v openssl >/dev/null; then
  echo "openssl is required" >&2; exit 1
fi
if ! command -v python3 >/dev/null; then
  echo "python3 is required" >&2; exit 1
fi

PG_PW=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)

# Sign the canonical anon and service_role JWTs with HS256 + JWT_SECRET.
gen_jwt() {
  local role="$1"
  python3 - "$JWT_SECRET" "$role" <<'PY'
import sys, json, hmac, hashlib, base64, time
secret, role = sys.argv[1], sys.argv[2]
def b64(x): return base64.urlsafe_b64encode(x).rstrip(b'=').decode()
header = b64(json.dumps({"alg":"HS256","typ":"JWT"},separators=(',',':')).encode())
now = int(time.time())
payload = b64(json.dumps({
  "role": role, "iss": "supabase", "iat": now,
  "exp": now + 60*60*24*365*10
},separators=(',',':')).encode())
msg = f"{header}.{payload}".encode()
sig = b64(hmac.new(secret.encode(), msg, hashlib.sha256).digest())
print(f"{header}.{payload}.{sig}")
PY
}

ANON_KEY=$(gen_jwt anon)
SERVICE_ROLE_KEY=$(gen_jwt service_role)

cat <<EOF
# ──────────────────────────────────────────────────────────────────────
#  MadhuOps — self-host environment
#  Generated $(date -u +"%Y-%m-%dT%H:%M:%SZ")
#  Treat this file as a secret. chmod 600 .env
# ──────────────────────────────────────────────────────────────────────

# Public URL the browser hits for the API (Kong via host nginx)
API_EXTERNAL_URL=https://api-course.madhukarreddy.com

# Public URL of the frontend
SITE_URL=https://course.madhukarreddy.com

# Postgres
POSTGRES_PASSWORD=${PG_PW}

# JWT — same secret used by auth, rest, kong, functions
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# Razorpay (paste your live or test keys)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Google OAuth (optional). Leave GOOGLE_ENABLED=false for email/password only.
# To enable: create an OAuth 2.0 Web client in Google Cloud Console, set
#   Authorized redirect URI = \${API_EXTERNAL_URL}/auth/v1/callback
GOOGLE_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# SMTP for auth confirmation emails (optional — leave blank to use auto-confirm)
SMTP_ADMIN_EMAIL=admin@course.madhukarreddy.com
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EOF
