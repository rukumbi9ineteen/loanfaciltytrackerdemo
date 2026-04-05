-- ============================================================
-- LOAN FACILITY TRACKER — Supabase Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  email        text not null unique,
  role         text not null default 'ro' check (role in ('admin', 'ro')),
  branch       text,
  phone        text,
  alert_email  text,
  is_active    boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─────────────────────────────────────────────
-- FACILITIES
-- (status + days_remaining are kept current via trigger)
-- ─────────────────────────────────────────────
create table public.facilities (
  id              uuid primary key default gen_random_uuid(),
  facility_ref    text not null unique,
  customer_name   text not null,
  facility_type   text not null,
  description     text,
  expiry_date     date not null,
  status          text not null default 'ACTIVE'
                    check (status in ('ACTIVE', 'WARNING', 'CRITICAL', 'EXPIRED')),
  days_remaining  int not null default 0,
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  renewal_count   int default 0,
  last_renewed_at timestamptz,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─────────────────────────────────────────────
-- RENEWAL HISTORY
-- ─────────────────────────────────────────────
create table public.renewal_history (
  id              uuid primary key default gen_random_uuid(),
  facility_id     uuid not null references public.facilities(id) on delete cascade,
  facility_ref    text not null,
  customer_name   text not null,
  old_expiry_date date not null,
  new_expiry_date date not null,
  extension_days  int,
  renewed_by      uuid not null references public.profiles(id),
  notes           text,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────
-- ALERT LOG
-- ─────────────────────────────────────────────
create table public.alert_log (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  sent_at        timestamptz default now(),
  recipient      text not null,
  facility_count int default 0,
  status         text default 'sent' check (status in ('sent', 'failed')),
  error_msg      text
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index idx_facilities_owner   on public.facilities(owner_id);
create index idx_facilities_expiry  on public.facilities(expiry_date);
create index idx_facilities_status  on public.facilities(status);
create index idx_renewal_facility   on public.renewal_history(facility_id);
create index idx_alert_log_owner    on public.alert_log(owner_id);

-- ─────────────────────────────────────────────
-- TRIGGER: compute status + days_remaining
-- Fires on every INSERT or UPDATE of expiry_date
-- ─────────────────────────────────────────────
create or replace function public.compute_facility_fields()
returns trigger language plpgsql as $$
begin
  new.days_remaining := (new.expiry_date - current_date)::int;
  new.status := case
    when new.expiry_date < current_date                          then 'EXPIRED'
    when new.expiry_date <= current_date + interval '30 days'   then 'CRITICAL'
    when new.expiry_date <= current_date + interval '90 days'   then 'WARNING'
    else 'ACTIVE'
  end;
  return new;
end;
$$;

create trigger trg_compute_facility_fields
  before insert or update of expiry_date
  on public.facilities
  for each row execute function public.compute_facility_fields();

-- ─────────────────────────────────────────────
-- FUNCTION: refresh all facility statuses
-- Call this once a day (or manually when needed)
-- In Supabase: Database → Functions → call it,
-- or via the cron API route
-- ─────────────────────────────────────────────
create or replace function public.refresh_facility_statuses()
returns void language plpgsql security definer as $$
begin
  update public.facilities
  set
    days_remaining = (expiry_date - current_date)::int,
    status = case
      when expiry_date < current_date                        then 'EXPIRED'
      when expiry_date <= current_date + interval '30 days'  then 'CRITICAL'
      when expiry_date <= current_date + interval '90 days'  then 'WARNING'
      else 'ACTIVE'
    end;
end;
$$;

-- ─────────────────────────────────────────────
-- TRIGGER: extension_days on renewal_history
-- ─────────────────────────────────────────────
create or replace function public.compute_renewal_fields()
returns trigger language plpgsql as $$
begin
  new.extension_days := (new.new_expiry_date - new.old_expiry_date)::int;
  return new;
end;
$$;

create trigger trg_compute_renewal_fields
  before insert on public.renewal_history
  for each row execute function public.compute_renewal_fields();

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger trg_facilities_updated_at
  before update on public.facilities
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGN-UP
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'ro')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.facilities       enable row level security;
alter table public.renewal_history  enable row level security;
alter table public.alert_log        enable row level security;

create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid() or public.get_my_role() = 'admin');

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "Admin can update any profile"
  on public.profiles for update
  using (public.get_my_role() = 'admin');

create policy "Admin can insert profiles"
  on public.profiles for insert
  with check (public.get_my_role() = 'admin');

-- Facilities
create policy "R.O. can view own facilities"
  on public.facilities for select
  using (owner_id = auth.uid() or public.get_my_role() = 'admin');

create policy "R.O. can insert own facilities"
  on public.facilities for insert
  with check (owner_id = auth.uid());

create policy "R.O. can update own facilities"
  on public.facilities for update
  using (owner_id = auth.uid() or public.get_my_role() = 'admin');

create policy "R.O. can delete own facilities"
  on public.facilities for delete
  using (owner_id = auth.uid() or public.get_my_role() = 'admin');

-- Renewal History
create policy "R.O. can view own renewal history"
  on public.renewal_history for select
  using (
    renewed_by = auth.uid()
    or public.get_my_role() = 'admin'
    or facility_id in (select id from public.facilities where owner_id = auth.uid())
  );

create policy "R.O. can insert renewal history"
  on public.renewal_history for insert
  with check (renewed_by = auth.uid());

-- Alert Log
create policy "R.O. can view own alert log"
  on public.alert_log for select
  using (owner_id = auth.uid() or public.get_my_role() = 'admin');

create policy "Service role can insert alert log"
  on public.alert_log for insert
  with check (true);

-- ─────────────────────────────────────────────
-- After running, promote your first admin:
--   UPDATE public.profiles SET role = 'admin'
--   WHERE email = 'your-email@example.com';
-- ─────────────────────────────────────────────
