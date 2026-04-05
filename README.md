# Loan Facility Expiration Tracker — Web App

A full-stack web application for bank Relationship Officers to track loan facility expiration dates, send automated daily alerts, and generate reports.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Email Alerts**: Resend API
- **PDF Export**: jsPDF + jspdf-autotable
- **Charts**: Recharts
- **Hosting**: Vercel (with built-in cron jobs)

---

## Features

| Feature | Description |
|---|---|
| **Login** | Email + password via Supabase Auth |
| **Dashboard** | Stats cards, expiry timeline chart, expiring facilities table |
| **Facilities** | Add, view, filter, renew, delete — fully CRUD |
| **Reports** | Filter by status, export to PDF |
| **Admin Panel** | Create users, view all R.O. portfolios, edit profiles |
| **Settings** | Update profile, change password, view alert log |
| **Daily Emails** | Auto-sent at 7am Mon–Fri via Vercel Cron + Resend |
| **Security** | Row Level Security — R.O. can only see their own data |

---

## Setup Guide

### Step 1 — Clone & Install

```bash
# Navigate to the project folder
cd loan-tracker-web

# Install dependencies
npm install
```

### Step 2 — Set up Supabase

1. Go to [https://app.supabase.com](https://app.supabase.com) and create a new project.
2. Wait for the project to be ready.
3. Go to **SQL Editor → New query** and paste the entire contents of `supabase/migrations/001_initial_schema.sql`.
4. Click **Run** to create all tables, policies, and triggers.

### Step 3 — Configure Environment Variables

```bash
# Copy the example file
cp .env.local.example .env.local
```

Then edit `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase → Project Settings → API → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase → Project Settings → API → anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Project Settings → API → service_role key (**keep secret**)
- `RESEND_API_KEY` — from [resend.com](https://resend.com) → API Keys
- `RESEND_FROM_EMAIL` — the email address alerts come from (must be a verified domain in Resend)
- `NEXT_PUBLIC_BANK_NAME` — your bank's name (appears in UI and emails)
- `CRON_SECRET` — any random string (e.g. generate with `openssl rand -hex 32`)

### Step 4 — Create the First Admin User

1. Go to Supabase → **Authentication → Users → Add user** (or Invite user).
2. Enter the admin email and password.
3. After creation, run this SQL in Supabase SQL Editor:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
   ```

### Step 5 — Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## Deployment (Vercel)

### One-command deploy:

```bash
npm install -g vercel
vercel
```

### Or connect via GitHub:
1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub.
3. Add all environment variables from `.env.local` in the Vercel dashboard.
4. Deploy.

### Cron job:
The `vercel.json` file already configures the daily alert cron to run at **7:00 AM Mon–Fri**. This requires a **Vercel Pro** plan. On the free plan, you can trigger alerts manually at `/api/cron/daily-alerts` with the Authorization header.

---

## User Roles

| Role | Permissions |
|---|---|
| **R.O.** | Can only see and manage their own facilities |
| **Admin** | Can see all facilities and all R.O. profiles, create users |

Role enforcement happens at the **database level** via Supabase Row Level Security — not just the UI.

---

## Email Alert Logic

- Runs daily at 7am (Mon–Fri) via Vercel Cron
- For each active R.O., fetches all facilities with `days_remaining <= 90` or already expired
- Sends a formatted HTML email to their `alert_email` (or login email if not set)
- Logs every send attempt in the `alert_log` table (viewable in Settings)

---

## Project Structure

```
src/
├── app/
│   ├── (authenticated)/     # All protected pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── facilities/      # List, add, view, renew
│   │   ├── reports/         # Report + PDF export
│   │   ├── admin/           # Admin panel + user management
│   │   └── settings/        # Profile + password + alert log
│   ├── api/
│   │   ├── admin/users/     # Create user endpoint
│   │   └── cron/daily-alerts/ # Email alert cron
│   ├── login/               # Login page
│   └── layout.tsx
├── components/
│   ├── dashboard/           # StatsCards, ExpiryChart, ExpiryTable, AlertBanner
│   ├── facilities/          # FacilitiesTable, AddFacilityForm, RenewForm, DeleteBtn
│   ├── reports/             # ReportsClient (with PDF export)
│   ├── admin/               # AdminUserCard, CreateUserForm, AdminStatsBar
│   ├── settings/            # SettingsForm, ChangePasswordForm
│   ├── layout/              # Sidebar, TopBar
│   └── ui/                  # Toaster
├── lib/
│   ├── supabase/            # client.ts, server.ts, middleware.ts
│   ├── email.ts             # Resend email builder + sender
│   └── utils.ts             # Helpers (dates, status colors, etc.)
├── types/
│   └── index.ts             # All TypeScript types
└── middleware.ts             # Auth guard
```

---

## Security Notes

- Never commit `.env.local` to Git — it contains your Supabase service role key
- The service role key bypasses all RLS — only used in server-side API routes
- R.O. users are isolated by RLS at the database level; they cannot see or modify other users' data even via direct API calls
- The cron endpoint is protected by `CRON_SECRET` to prevent unauthorized triggers

---

## Changing the Bank Name

Update `NEXT_PUBLIC_BANK_NAME` in `.env.local` (and in Vercel environment variables) — it appears in the sidebar, login page, email subject lines, and PDF headers.
