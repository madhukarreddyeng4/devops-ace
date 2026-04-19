#!/bin/sh
# Replace placeholder tokens in the built JS with real env values at container start.
set -e
ROOT=/usr/share/nginx/html
echo "▶ injecting runtime env into $ROOT…"
find "$ROOT" -type f \( -name '*.js' -o -name '*.html' \) -print0 | while IFS= read -r -d '' f; do
  sed -i \
    -e "s|__VITE_SUPABASE_URL__|${VITE_SUPABASE_URL:-}|g" \
    -e "s|__VITE_SUPABASE_PUBLISHABLE_KEY__|${VITE_SUPABASE_PUBLISHABLE_KEY:-}|g" \
    -e "s|__VITE_SUPABASE_PROJECT_ID__|${VITE_SUPABASE_PROJECT_ID:-}|g" \
    "$f"
done
echo "✅ env injection done"
