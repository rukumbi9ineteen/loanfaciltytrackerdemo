-- ============================================================
-- MIGRATION 002: Enhancements
-- Run in Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. Profile avatar
-- ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists avatar_url text;

-- ─────────────────────────────────────────────
-- 2. Facility amount
-- ─────────────────────────────────────────────
alter table public.facilities
  add column if not exists amount        numeric(18,2),
  add column if not exists currency      text default 'KES',
  add column if not exists amount_notes  text;

-- ─────────────────────────────────────────────
-- 3. Notifications table
-- ─────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  body        text not null,
  type        text not null check (type in ('facility_added','facility_renewed','facility_deleted','alert_sent')),
  facility_id uuid references public.facilities(id) on delete set null,
  is_read     boolean default false,
  created_at  timestamptz default now()
);

create index if not exists idx_notifications_user
  on public.notifications(user_id, is_read, created_at desc);

-- RLS for notifications
alter table public.notifications enable row level security;

create policy "Users see own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users mark own notifications read"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "Service role inserts notifications"
  on public.notifications for insert
  with check (true);

-- ─────────────────────────────────────────────
-- 4. Supabase Storage bucket for avatars
--    (run separately if this errors — Storage UI
--     is easier: Storage → New bucket → "avatars" → Public)
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatar
create policy "Users upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
