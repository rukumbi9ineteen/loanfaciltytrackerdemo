# BK Loan Facility Expiration Tracker

A full-stack, production-grade web application built for **Bank of Kigali** Relationship Officers (R.O.s) and administrators to monitor, manage, and act on loan facility expiration dates — before they become a problem.

---

## What Problem Does This Solve?

Bank loan facilities — overdrafts, term loans, letters of guarantee, letters of credit, and others — have fixed expiry dates. When a facility expires without being renewed, it creates risk for both the bank and the client. Tracking dozens or hundreds of facilities manually (spreadsheets, sticky notes, calendar reminders) leads to missed renewals, compliance issues, and lost revenue.

This application centralises the entire lifecycle of a loan facility: creation, monitoring, renewal, transfer between officers, and eventual closure — with automated alerts, a real-time notification inbox, and exportable reports at every step.

---

## Live Demo

The application is deployed on Vercel and connected to a Supabase PostgreSQL database. Relationship Officers log in with bank-issued credentials to access only their own portfolio. Admins have a separate panel to oversee all R.O.s and all facilities system-wide.

---

## Feature Overview

### Dashboard
The dashboard is the first screen after login. It shows:
- **Four stat cards** — total facilities, active, warning (≤90 days), critical (≤30 days), and expired
- **Expiry timeline chart** — a bar chart showing how many facilities expire in each of the next 12 months, built with Recharts
- **Expiring soon table** — a live list of the most urgent facilities, colour-coded by status, with direct links to each facility
- **Alert banner** — an amber warning strip that appears if any facilities are already expired or critically close

The dashboard is personalised: R.O.s only see their own portfolio; admins see the full bank-wide picture.

### Facilities
The facilities module is the core of the application. Each facility record holds:
- Customer name and facility reference number
- Facility type (Overdraft, Term Loan, Letter of Guarantee, Letter of Credit, Invoice Discounting, Asset Finance, Mortgage, Working Capital, Trade Finance, Other)
- Expiry date, days remaining, and computed status (ACTIVE / WARNING / CRITICAL / EXPIRED)
- Amount and currency (USD, EUR, GBP, RWF)
- Notes and description
- Renewal count and last renewal date
- Owner (assigned R.O.)

Facilities can be **added**, **viewed** in detail, **renewed** (which logs the old expiry date, new expiry date, extension in days, and the officer who renewed it), and **deleted**. Every action triggers an in-app notification and an email to the relevant parties.

When a facility is deleted or transferred to another R.O., the original notification is preserved so that clicking "View Facility" from the notification inbox brings up a clear, colour-coded page explaining what happened — rather than a generic 404.

### Notifications Inbox
A dedicated notification inbox at `/notifications` provides a complete audit trail of every action that affected a user. Notifications are:
- Delivered in real time via Supabase Realtime (PostgreSQL change subscriptions) — no page refresh needed
- Categorised by type: Facility Added, Renewed, Deleted, Transferred, or Alert Sent — each with its own colour badge
- Filterable by tab: All, Unread, Facilities, Alerts
- Fully readable — the body text is never truncated, unlike the quick bell-dropdown preview
- Actionable — every notification has a "View Facility" button that links directly to the relevant facility (or a graceful status page if the facility was deleted or transferred)

The notification bell in the top bar shows a live unread count badge and opens a quick 5-item preview dropdown. A single "Open notification inbox" button at the bottom of the dropdown leads to the full inbox.

### Reports
The reports page allows users to filter all facilities by status and export the results as a formatted PDF, generated entirely in the browser with jsPDF and jspdf-autotable. Admins can generate reports across all R.O.s; R.O.s can only export their own data.

### Admin Panel
Admins have access to a separate panel that shows:
- A stats bar with system-wide counts
- A user directory with each R.O.'s profile, branch, active status, and facility count
- A detailed profile page per user showing their full portfolio with expiry dates and renewal history
- A **Transfer Facility** button on each facility — to reassign it to a different R.O. (for example when a staff member leaves)
- A **Transfer All Facilities** button on each user profile — to bulk-reassign an entire portfolio in one action
- A **Send Alerts** button to manually trigger the daily email alert job

When a transfer happens, the previous owner, the new owner, and all administrators receive both an in-app notification and an email.

### Settings
Each user has a settings page where they can:
- Update their display name, branch, phone number, and dedicated alert email address
- Change their password (which automatically signs out all other sessions for security)
- View a log of every alert email that was sent for their account, including timestamps and delivery status

### Daily Email Alerts
An automated cron job runs every weekday at 7:00 AM and sends a formatted HTML email to each R.O. who has facilities expiring within the next 90 days, or already expired. The email lists each affected facility with its reference, customer name, type, expiry date, and days remaining. Every send attempt is logged in the `alert_log` table regardless of success or failure.

---

## How the Application Was Built

### Architecture

The application is a monolith built on **Next.js 14 App Router** — a React framework that blurs the line between frontend and backend by allowing server-side data fetching, API routes, and client-side interactivity to coexist in the same codebase.

**Rendering strategy:**
- Pages that display user data use server components — they fetch from the database at request time, send rendered HTML to the browser, and never expose raw database credentials to the client
- Interactive components (forms, modals, notification bell, inactivity guard) are client components that run in the browser
- Authentication state is validated in `middleware.ts` on every request before the page even begins to render — unauthenticated requests are redirected to the login page at the edge

**Data layer:**
Supabase is used as the backend. It provides:
- A hosted PostgreSQL database with structured schemas, triggers, and computed columns
- A built-in authentication system (email + password) with JWT tokens managed via HTTP-only cookies
- Row Level Security (RLS) policies written in SQL that enforce data isolation at the database level
- A Realtime service that streams PostgreSQL change events to connected browser clients via WebSocket

All database operations from server components and API routes use the **service role client** (which bypasses RLS and is never sent to the browser) or the **user-scoped client** (which is bound to the current user's JWT and automatically respects RLS policies).

**API routes:**
All mutating operations (add facility, renew, delete, transfer, create user, reset password) go through Next.js API routes — not direct client-to-database calls. This ensures that side effects like sending notifications and emails happen atomically with the primary database operation.

### Database Schema

The PostgreSQL schema consists of five core tables:

`profiles` — one row per user, linked to Supabase Auth. Holds the user's name, email, role (admin or ro), branch, phone, alert email, and active status. A trigger automatically creates a profile row when a new auth user is registered.

`facilities` — one row per loan facility. Holds all facility data plus a computed `status` column (ACTIVE / WARNING / CRITICAL / EXPIRED) and `days_remaining` that are recalculated automatically on every update via a PostgreSQL trigger. The `owner_id` foreign key links each facility to the R.O. responsible for it.

`renewal_history` — one row per renewal action. Preserves the full audit trail: old expiry date, new expiry date, extension in days, who renewed it, and when.

`notifications` — one row per notification per recipient. Holds the title, body, type, a reference to the related facility (if any), and whether the notification has been read.

`alert_log` — one row per email sent. Records who it was sent to, how many facilities were included, the delivery status, and any error message.

### Email Delivery

Transactional email is sent via the **Resend API**. Emails are built as HTML strings server-side and sent from a configured sender address on a verified domain. The application sends three types of email:
- Daily expiry alerts (via cron)
- Facility transfer notifications (to the previous owner, new owner, and all admins)
- Password reset links (via Supabase's built-in reset flow)

### Real-Time Notifications

Supabase Realtime is used to push new notifications to the browser without polling. When a notification row is inserted into the database, PostgreSQL emits a change event that Supabase forwards over a WebSocket connection to any subscribed client. The notification bell component and the inbox component both subscribe to changes filtered by `user_id = current user`, so each user only receives their own events.

### Session Security

Several security layers protect active sessions:

**Inactivity timeout** — a client-side guard monitors user activity (mouse movement, keyboard, scroll, touch). After 28 minutes of inactivity a warning modal appears with a countdown. At 30 minutes the session is signed out automatically.

**Server-side session expiry** — the middleware stores a `bk_last_active` timestamp in an HTTP-only cookie on every authenticated request. If the gap since the last activity exceeds 8 hours, the middleware forces a sign-out and redirects to the login page — even if the browser tab was simply left open.

**Password change sign-out** — when a user changes their password, all other active sessions for that account are invalidated globally via Supabase Admin API. The current session is also ended and the user is redirected to login with a confirmation message.

**Admin password reset** — when an admin resets another user's password, that user's existing sessions are revoked, forcing them to log in again with the new credentials.

**HTTP security headers** — the Next.js configuration adds standard security headers to every response: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-XSS-Protection`, `Strict-Transport-Security`, and `Content-Security-Policy`.

### Mobile Responsiveness

The layout is fully responsive. On small screens the sidebar is hidden and slides in as a drawer from the left when the hamburger menu in the top bar is tapped. An overlay behind the drawer dismisses it. Data tables hide lower-priority columns on small screens using Tailwind responsive prefixes. All modals and forms stack vertically on narrow viewports.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT, HTTP-only cookies) |
| Realtime | Supabase Realtime (WebSocket) |
| Email | Resend API |
| Charts | Recharts |
| PDF Export | jsPDF + jspdf-autotable |
| Forms | React Hook Form + Zod |
| Hosting | Vercel |
| Cron | Vercel Cron Jobs |

---

## Project Structure

```
src/
├── app/
│   ├── (authenticated)/          # All protected pages (layout enforces auth)
│   │   ├── dashboard/            # Stats, chart, expiry table, alert banner
│   │   ├── facilities/           # List, add, view detail, renew
│   │   ├── notifications/        # Full notification inbox
│   │   ├── reports/              # Filter + PDF export
│   │   ├── admin/                # Admin overview + user management
│   │   └── settings/             # Profile, password, alert log
│   ├── api/
│   │   ├── admin/
│   │   │   ├── users/            # Create user
│   │   │   ├── reset-password/   # Admin password reset + session revocation
│   │   │   ├── send-alerts/      # Manual alert trigger
│   │   │   └── transfer-facility/# Single and bulk facility transfer
│   │   ├── facilities/           # Add + delete (with notifications)
│   │   │   └── renew/            # Renew (with notifications)
│   │   ├── notifications/        # Read, create, mark read, delete
│   │   └── cron/daily-alerts/    # Automated email cron
│   ├── auth/callback/            # Supabase OAuth/magic link callback
│   ├── login/                    # Login page
│   └── layout.tsx
├── components/
│   ├── dashboard/                # StatsCards, ExpiryChart, ExpiryTable, AlertBanner
│   ├── facilities/               # FacilitiesTable, AddFacilityForm, RenewForm, DeleteBtn
│   ├── notifications/            # NotificationsInbox (full inbox UI)
│   ├── reports/                  # ReportsClient
│   ├── admin/                    # AdminUserCard, CreateUserForm, TransferFacilityButton, TransferAllFacilitiesButton
│   ├── settings/                 # SettingsForm, ChangePasswordForm
│   └── layout/                   # AppShell, Sidebar, TopBar, NotificationBell, InactivityGuard
├── lib/
│   ├── supabase/                 # client.ts, server.ts, middleware.ts
│   ├── email.ts                  # HTML email builders + Resend sender
│   ├── notifications.ts          # createNotifications() helper
│   └── utils.ts                  # Date formatting, status colours, cn()
├── types/
│   └── index.ts                  # All shared TypeScript interfaces
└── middleware.ts                  # Edge auth guard + session expiry
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Resend](https://resend.com) account (free tier works for development)

### Step 1 — Clone and install

```bash
git clone <repository-url>
cd loan-tracker-web
npm install
```

### Step 2 — Set up the database

1. Create a new project at [app.supabase.com](https://app.supabase.com)
2. Go to **SQL Editor → New query**
3. Paste and run `supabase/migrations/001_initial_schema.sql` — this creates all tables, RLS policies, and triggers
4. Then run `supabase/migrations/002_enhancements.sql` for additional indexes and constraints

### Step 3 — Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in the following values in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=          # Project URL from Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Anon/public key from Supabase → Settings → API
SUPABASE_SERVICE_ROLE_KEY=         # Service role key (server-side only — never exposed to browser)
RESEND_API_KEY=                    # API key from resend.com
RESEND_FROM_EMAIL=                 # Verified sender address (e.g. alerts@yourdomain.com)
NEXT_PUBLIC_BANK_NAME=             # Your institution name (shown in UI, emails, and PDFs)
CRON_SECRET=                       # Random secret string to protect the cron endpoint
```

> **Important:** Never commit `.env.local` to version control. Add it to `.gitignore`.

### Step 4 — Create the first admin user

1. In Supabase → **Authentication → Users**, click **Add user** and enter the admin's email and a temporary password
2. In **SQL Editor**, run:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@yourbank.com';
   ```
3. The admin can now log in and create R.O. accounts from the Admin Panel

### Step 5 — Run locally

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000). You will be redirected to the login page.

---

## Deployment

### Vercel (recommended)

1. Push the project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → import from GitHub
3. Add all environment variables from `.env.local` in the Vercel dashboard under **Settings → Environment Variables**
4. Deploy

The `vercel.json` file configures the daily alert cron to run at **7:00 AM UTC, Monday–Friday**. Cron jobs require a Vercel Pro plan. On the free plan you can trigger alerts manually by calling `/api/cron/daily-alerts` with the `Authorization: Bearer <CRON_SECRET>` header.

---

## User Roles

| Role | What they can access |
|---|---|
| **Relationship Officer (R.O.)** | Their own facilities only — add, view, renew, delete. Their own notifications. Reports for their own portfolio. Settings for their own account. |
| **Admin** | Everything an R.O. can do, plus: view all R.O. portfolios, create and manage users, transfer facilities between R.O.s, send manual alert emails, reset any user's password. |

Role enforcement happens at two layers: the UI hides admin-only controls, and Supabase Row Level Security policies at the database level ensure that even a direct API call cannot return another user's data to an R.O.

---

## Security Design

**Row Level Security (RLS)** is enabled on all tables. Every SELECT, INSERT, UPDATE, and DELETE operation is evaluated against a policy that checks the authenticated user's ID and role. An R.O. who somehow constructs a direct database query cannot retrieve another R.O.'s facilities.

**Service role key isolation** — the Supabase service role key (which bypasses RLS) is used only in server-side Next.js API routes. It is never referenced in any client component, never sent to the browser, and is stored only in server-side environment variables.

**JWT-based sessions** — authentication tokens are stored in HTTP-only cookies, which are inaccessible to JavaScript running in the browser, protecting against XSS-based session theft.

**Session revocation** — changing a password or an admin resetting a user's password immediately invalidates all active sessions for that account across all devices.

**Cron endpoint protection** — the `/api/cron/daily-alerts` endpoint requires a secret bearer token. Without the correct `CRON_SECRET` value, the endpoint returns 401 and does not process any alerts.

**HTTP security headers** — all responses include `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, and a `Content-Security-Policy` to protect against clickjacking, MIME sniffing, and cross-site scripting.

---

## License

This project was built for internal use at Bank of Kigali. The source code is shared for reference and educational purposes.
