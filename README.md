# Scop — Restaurant Operations SaaS

Bilingual (Arabic/English) SaaS for restaurant checklists, food-safety logs, and scheduling.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (auth, Postgres, realtime, storage)
- **next-intl** for i18n + RTL
- **Moyasar** for billing (Phase 2)

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase (recommended: cloud project)

1. Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** and run the migration file:
   `supabase/migrations/20250711000000_initial_schema.sql`
3. Copy your project URL and keys from **Settings → API**
4. Copy `.env.example` to `.env.local` and fill in the values

### 3. Create a super admin

After signing up your first owner account, promote yourself in the SQL Editor:

```sql
UPDATE profiles SET role = 'super_admin' WHERE email = 'your@email.com';
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Roles

| Role | Panel | Route prefix |
|------|-------|--------------|
| Super admin | Platform admin | `/admin` |
| Restaurant owner | Business dashboard | `/owner` |
| Branch manager | Daily operations | `/manager` |

## Business rules

- **50 SAR/branch/month** — billing wired in Phase 2 (Moyasar)
- **14-day free trial** — no card required
- **Max 2 managers per branch** — enforced at DB level
- **Task windows** — rolling: daily = 24h, weekly = 7d, monthly = 30d from last completion
- **All-branch items** — new branches automatically inherit tasks/standards/events with `branch_id = null`

## Project structure

```
src/
  app/[locale]/          # Locale-aware routes
    (auth)/              # Login / signup
    (owner)/owner/       # Owner panel
    (manager)/manager/   # Manager panel
    (admin)/admin/       # Super admin panel
  components/            # Shared UI
  lib/                   # Supabase, auth, task logic
  messages/              # en.json, ar.json
  i18n/                  # next-intl config
supabase/migrations/     # Database schema + RLS
```

## Phase 2 — Billing (Moyasar)

1. Create a Moyasar account at [moyasar.com](https://moyasar.com)
2. Enable **tokenization** in your Moyasar dashboard
3. Add keys to `.env.local`:
   - `MOYASAR_SECRET_KEY` — secret key (server only)
   - `NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY` — publishable key
   - `CRON_SECRET` — random string for monthly renewal cron
4. Run the Phase 2 migration in Supabase SQL Editor:
   `supabase/migrations/20250711100000_billing_phase2.sql`
5. Set webhook URL in Moyasar dashboard:
   `https://your-domain.com/api/webhooks/moyasar`
6. Schedule monthly renewals (Vercel Cron example):
   `GET /api/cron/billing-renewal` with header `Authorization: Bearer {CRON_SECRET}`

### Billing rules

- **50 SAR/branch/month** — charged via Moyasar hosted form
- **14-day trial** — no card required; expired trials block write actions
- **Paid branch limit** — adding branches beyond paid limit requires plan update
- **10+ branches** — auto-flagged as enterprise, contact sales@scopsa.com
- **Monthly renewal** — saved card token charged automatically via cron

## Phase 3 — Reports & analytics

- **Owner reports** (`/owner/reports`) — completion rates, food safety pass rates, branch breakdown, 7/30/90-day filters
- **Export CSV / PDF** — download from reports page (respects current filters)
- **Weekly email digest** — owners opt in/out on reports page; sent Mondays via cron
- **Admin analytics** (`/admin/analytics`) — signups, MRR, subscription breakdown, platform activity volume

Run migrations:
- `supabase/migrations/20250711120000_analytics_indexes.sql`
- `supabase/migrations/20250713100000_report_digests.sql`

### Email digests (Resend)

1. Create account at [resend.com](https://resend.com)
2. Verify your sending domain (or use Resend sandbox for testing)
3. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_xxx
   EMAIL_FROM=Scop <reports@yourdomain.com>
   ```
4. Cron sends digests every **Monday 07:00 UTC**: `GET /api/cron/report-digest` with `Authorization: Bearer {CRON_SECRET}`

## Addendum UX (design + product logic)

Run this migration after Phase 2/3 migrations:
`supabase/migrations/20260714000000_addendum_ux.sql`

Includes: task categories, food-safety range types + acknowledge flow, notifications table, org settings fields. No staff/roster tables.

## Deploy

- **Frontend**: Vercel — connect repo, set env vars
- **Backend**: Supabase cloud (already hosted)

Domain: `scopsa.com`
