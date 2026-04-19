# CloudPrep — AWS &amp; DevOps Interview Prep

Scenario-based interview prep platform with quizzes, free preview (3 questions per quiz), one-time ₹199 / year unlock via Razorpay, and an admin panel for content management.

## Stack
- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn/ui
- **Backend:** Lovable Cloud (managed Supabase) — Postgres, Auth (email + Google), RLS, Edge Functions
- **Payments:** Razorpay (create-order → verify-payment → webhook)
- **Deploy:** Docker + nginx → EC2

## Local development
This project is built and edited inside [Lovable](https://lovable.dev). The preview updates as you chat. To run locally:

```bash
npm install
npm run dev
```

You'll need a `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` from your Lovable Cloud project.

## Deploying to EC2 with Docker
See **[DEPLOY.md](./DEPLOY.md)** for two deployment paths:
1. **Quick:** Frontend on EC2 + Lovable Cloud backend
2. **Full self-host:** Frontend + self-hosted Supabase on the same EC2

Quick start:
```bash
cp .env.example .env       # fill in your values
docker compose up -d --build
```

## Razorpay setup
- Set secrets `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` in Lovable Cloud (or self-hosted env).
- Add webhook in Razorpay dashboard: `https://<your-domain>/functions/v1/razorpay-webhook` for events `payment.captured`, `payment.failed`.

## Admin
After signing up, run in the SQL editor:
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'you@example.com';
```
