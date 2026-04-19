# MadhuOps — full EC2 self-host runbook

Everything runs on **one EC2 box**. No Lovable Cloud, no external services.

## What you get
- 6 Docker containers: Postgres • GoTrue (auth) • PostgREST • Kong (gateway) • Edge Runtime (functions) • React frontend (nginx)
- Host-level nginx terminates TLS for `course.madhukarreddy.com` (frontend) and `api-course.madhukarreddy.com` (API)
- Persistent data in named Docker volumes (`pg_data`, `storage_data`)
- Daily DB backup cron, automatic SSL renewal

---

## 0. Prerequisites
- AWS EC2 `t3.small` or larger, Ubuntu 22.04, 30 GB disk, Elastic IP attached
- DNS A records for both domains pointing to the Elastic IP
- (Optional) Google OAuth Web client with redirect URI `https://api-course.madhukarreddy.com/auth/v1/callback`
- (Optional) Razorpay key id + secret + webhook secret

## 1. Bootstrap the server (once)
```bash
ssh ubuntu@<elastic-ip>
git clone https://github.com/<you>/<repo>.git ~/madhuops
cd ~/madhuops
sudo bash selfhost/bootstrap-ec2.sh
exit                       # log out so docker group takes effect
ssh ubuntu@<elastic-ip>
cd ~/madhuops/selfhost
```

## 2. Generate secrets + edit .env
```bash
bash generate-secrets.sh > .env
chmod 600 .env
nano .env                  # fill RAZORPAY_*, optionally GOOGLE_*
```
`SITE_URL` and `API_EXTERNAL_URL` already point to your two domains.

## 3. Start the database, apply schema
```bash
docker compose up -d db
sleep 10
bash apply-schema.sh       # creates roles, runs all migrations, attaches signup trigger
```

## 4. (Optional) Migrate data from Lovable Cloud
Get the **Session Pooler** connection string from Cloud → Settings → Database, then:
```bash
SOURCE_DB_URL='postgresql://postgres.<ref>:<pw>@<host>:5432/postgres' \
  bash migrate-from-cloud.sh
```
Brings over `auth.users` + every `public.*` table.

## 5. Start the rest of the stack
```bash
docker compose up -d
docker compose ps          # all 6 should be Up within ~30s
```

## 6. Configure host nginx + SSL
```bash
sudo cp nginx.conf /etc/nginx/sites-available/madhuops
sudo ln -sf /etc/nginx/sites-available/madhuops /etc/nginx/sites-enabled/madhuops
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d course.madhukarreddy.com -d api-course.madhukarreddy.com
```
Certbot installs the cert and adds a cron timer for auto-renewal.

## 7. Smoke test
```bash
curl -I https://course.madhukarreddy.com
curl https://api-course.madhukarreddy.com/auth/v1/health
```
Open `https://course.madhukarreddy.com`, sign up, verify a row appears in `public.profiles`.

## 8. Daily backup cron
```bash
chmod +x ~/madhuops/selfhost/backup-db.sh
( crontab -l 2>/dev/null; echo "15 2 * * * /home/ubuntu/madhuops/selfhost/backup-db.sh >> /home/ubuntu/backup.log 2>&1" ) | crontab -
```
Backups land in `~/madhuops/selfhost/backups/` as gzipped SQL.

---

## Day-2 operations

| Task | Command |
|---|---|
| Deploy new code | `bash selfhost/deploy.sh` |
| View logs | `docker compose logs -f <service>` |
| Restart one service | `docker compose restart auth` |
| Stop everything | `docker compose down` (data persists) |
| WIPE everything | `docker compose down -v` ⚠ destroys DB |
| psql into DB | `docker compose exec db psql -U postgres` |
| Promote a user to admin | `docker compose exec db psql -U postgres -c "INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE email='you@example.com' ON CONFLICT DO NOTHING;"` |

## Cost estimate (Mumbai)
- t3.small on-demand: ~$15/mo (or ~$9/mo with 1-yr reserved)
- 30 GB gp3: ~$2.50/mo
- Elastic IP (attached): free
- Bandwidth: first 100 GB/mo free, then $0.09/GB
- **Total: ~$18/mo**

## Troubleshooting
- **Auth restart loop** → `docker compose logs auth`. Usually missing role; re-run `bash apply-schema.sh`.
- **Frontend blank page** → `__VITE_*` placeholders weren't substituted. Check `docker compose logs frontend`.
- **502 Bad Gateway** → Kong (`:8000`) down: `docker compose ps`, then `docker compose logs kong`.
- **Google login fails** → `GOOGLE_ENABLED=true` but creds wrong, or Google Console redirect URI doesn't exactly match `https://api-course.madhukarreddy.com/auth/v1/callback`.
