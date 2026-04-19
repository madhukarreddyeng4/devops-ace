# MadhuOps — AWS &amp; DevOps Interview Prep

Scenario-based interview prep platform with quizzes, free preview (3 questions per quiz), one-time ₹199 / year unlock via Razorpay, and an admin panel for content management.

## Stack
- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn/ui
- **Backend:** Supabase — Postgres, Auth, RLS, Edge Functions (managed via Lovable Cloud OR fully self-hosted on EC2)
- **Payments:** Razorpay (create-order → verify-payment → webhook)

## Local development

```bash
npm install
npm run dev
```

Requires a `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

## Deploying

Three options, in order of effort:

1. **Easiest** — click **Publish** in Lovable. Done.
2. **Frontend on EC2 + Lovable Cloud backend** — see [`DEPLOY.md`](./DEPLOY.md) Path 1.
3. **Full self-host on a single EC2 box** (Postgres + Auth + REST + Edge Functions + frontend, all in Docker with persistent volumes, host nginx in front) — see [`selfhost/README.md`](./selfhost/README.md).

## Razorpay
Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` as secrets in Lovable Cloud (or in `selfhost/.env` for self-host). Webhook URL: `https://<your-api-domain>/functions/v1/razorpay-webhook`, events: `payment.captured`, `payment.failed`.

## Make yourself admin
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'you@example.com';
```
