# MadhuOps — Full self-host on a single EC2 box

Everything (Postgres, Auth, REST API, Edge Functions, frontend) runs as Docker containers on **one EC2 instance**, with a host-level nginx reverse proxy in front. Data lives in named Docker volumes so it survives container restarts and image rebuilds.

## What you get

```
                     ┌─────────────────── EC2 (Ubuntu 22.04) ───────────────────┐
                     │                                                          │
   internet ──443──► │  host nginx ──► :3000 (frontend container)               │
                     │              ──► :8000 (kong → auth/rest/functions)      │
                     │                                                          │
                     │   docker network "madhuops"                              │
                     │   ┌───────┐ ┌───────┐ ┌──────────┐ ┌──────┐ ┌────────┐   │
                     │   │  db   │ │ auth  │ │ postgrest│ │ kong │ │  func  │   │
                     │   └───┬───┘ └───┬───┘ └────┬─────┘ └──┬───┘ └────┬───┘   │
                     │       │         │          │          │          │       │
                     │   ┌───▼─────────▼──────────▼──────────▼──────────▼───┐   │
                     │   │ named volume: pg_data (persistent)               │   │
                     │   └──────────────────────────────────────────────────┘   │
                     └──────────────────────────────────────────────────────────┘
```

## One-time setup on a fresh EC2

1. **Provision** Ubuntu 22.04, t3.medium minimum (4GB RAM), 30GB+ gp3 EBS, Elastic IP. Open ports **22** (your IP), **80**, **443** in the security group.

2. **Install Docker + nginx + jq:**
   ```bash
   sudo apt update
   sudo apt install -y docker.io docker-compose-plugin nginx jq postgresql-client-15 git
   sudo usermod -aG docker $USER && newgrp docker
   sudo systemctl enable --now docker nginx
   ```

3. **Clone this repo:**
   ```bash
   git clone https://github.com/YOUR_USER/YOUR_REPO.git madhuops
   cd madhuops/selfhost
   ```

4. **Generate secrets:**
   ```bash
   bash generate-secrets.sh > .env
   # Review .env — set DOMAIN, SITE_URL, RAZORPAY_* values
   nano .env
   ```

5. **Bring the stack up:**
   ```bash
   docker compose up -d
   docker compose logs -f db    # wait for "database system is ready to accept connections"
   ```

6. **Apply schema** (this repo's migrations are the source of truth):
   ```bash
   bash apply-schema.sh
   ```

7. **(Optional) Migrate data from Lovable Cloud:**
   ```bash
   # Get the SOURCE_DB_URL from Lovable: Cloud → Settings → Database → Connection string (Session pooler)
   SOURCE_DB_URL='postgresql://postgres.<ref>:<password>@<host>:5432/postgres' \
   bash migrate-from-cloud.sh
   ```

8. **Install host nginx config:**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/madhuops
   sudo ln -sf /etc/nginx/sites-available/madhuops /etc/nginx/sites-enabled/madhuops
   sudo rm -f /etc/nginx/sites-enabled/default
   # Edit the file: replace madhuops.example.com with your real domain
   sudo nano /etc/nginx/sites-available/madhuops
   sudo nginx -t && sudo systemctl reload nginx
   ```

9. **HTTPS with Let's Encrypt:**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d madhuops.example.com -d api.madhuops.example.com
   ```

10. **Point Razorpay webhook** at `https://api.madhuops.example.com/functions/v1/razorpay-webhook`. Set the signing secret to the value of `RAZORPAY_WEBHOOK_SECRET` in `.env`.

11. **Make yourself admin** (after signing up):
    ```bash
    docker compose exec db psql -U postgres -d postgres -c \
      "INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE email='you@example.com';"
    ```

## Day-to-day

| Task | Command |
|---|---|
| Status | `docker compose ps` |
| Logs (one service) | `docker compose logs -f auth` |
| Restart everything | `docker compose restart` |
| Update frontend after `git pull` | `docker compose up -d --build frontend` |
| psql shell | `docker compose exec db psql -U postgres` |
| Backup DB | `bash backup-db.sh` |
| Stop everything | `docker compose down` (data persists) |
| **Wipe everything (destructive)** | `docker compose down -v` |

## Files

- `docker-compose.yml` — full stack: db, auth, postgrest, kong, edge-functions, frontend
- `kong.yml` — Kong declarative config (routes /auth, /rest, /functions)
- `nginx.conf` — host nginx reverse proxy (frontend + api subdomain)
- `generate-secrets.sh` — produces a fresh `.env` with strong passwords + JWT keys
- `apply-schema.sh` — runs every migration in `../supabase/migrations/` against the local DB
- `migrate-from-cloud.sh` — `pg_dump` from Lovable Cloud → restore into local DB
- `backup-db.sh` — daily `pg_dump` to `./backups/` (wire to cron + S3 sync as you wish)
- `Dockerfile.frontend` — frontend image build (uses runtime env injection)
- `entrypoint-frontend.sh` — injects `VITE_*` env into the static build at container start

## Trade-offs vs Lovable Cloud

You now own: backups, OS patching, certificate renewal, scaling, monitoring, security incident response. **Budget at least 4 hours/month** of ops time even when nothing is broken. This is fine if you specifically want full data ownership; otherwise Lovable Cloud + EC2 frontend (Path 1 in `DEPLOY.md`) is dramatically less work for the same UX.
