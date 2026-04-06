-- ─────────────────────────────────────────────────────────────────────────────
-- 003_insurance.sql
-- Insurance tracking for BK Loan Facility Tracker
-- Run this in Supabase SQL Editor AFTER 002_enhancements.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Insurance policies table
CREATE TABLE IF NOT EXISTS public.facility_insurance (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id       uuid        NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  provider          text        NOT NULL,
  policy_number     text        NOT NULL,
  insurance_type    text        NOT NULL,
  start_date        date        NOT NULL,
  expiry_date       date        NOT NULL,
  premium_amount    numeric(15,2),
  premium_currency  text        NOT NULL DEFAULT 'RWF',
  coverage_amount   numeric(15,2),
  coverage_currency text        NOT NULL DEFAULT 'RWF',
  status            text        NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE','WARNING','CRITICAL','EXPIRED')),
  days_remaining    integer     NOT NULL DEFAULT 0,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 2. Insurance renewal history table
CREATE TABLE IF NOT EXISTS public.insurance_renewal_history (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  insurance_id    uuid        NOT NULL REFERENCES public.facility_insurance(id) ON DELETE CASCADE,
  facility_id     uuid        NOT NULL,
  old_expiry_date date        NOT NULL,
  new_expiry_date date        NOT NULL,
  extension_days  integer     NOT NULL,
  renewed_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. Auto-compute status + days_remaining on every insert/update
CREATE OR REPLACE FUNCTION public.compute_insurance_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.days_remaining := (NEW.expiry_date - CURRENT_DATE)::integer;
  NEW.status := CASE
    WHEN NEW.days_remaining <= 0  THEN 'EXPIRED'
    WHEN NEW.days_remaining <= 30 THEN 'CRITICAL'
    WHEN NEW.days_remaining <= 90 THEN 'WARNING'
    ELSE 'ACTIVE'
  END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS insurance_status_trigger ON public.facility_insurance;
CREATE TRIGGER insurance_status_trigger
  BEFORE INSERT OR UPDATE ON public.facility_insurance
  FOR EACH ROW EXECUTE FUNCTION public.compute_insurance_status();

-- 4. Row Level Security
ALTER TABLE public.facility_insurance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_renewal_history  ENABLE ROW LEVEL SECURITY;

-- R.O. can manage insurance for their own facilities; admins can manage all
CREATE POLICY "ins_select" ON public.facility_insurance FOR SELECT
  USING (
    facility_id IN (SELECT id FROM public.facilities WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "ins_insert" ON public.facility_insurance FOR INSERT
  WITH CHECK (
    facility_id IN (SELECT id FROM public.facilities WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "ins_update" ON public.facility_insurance FOR UPDATE
  USING (
    facility_id IN (SELECT id FROM public.facilities WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "ins_delete" ON public.facility_insurance FOR DELETE
  USING (
    facility_id IN (SELECT id FROM public.facilities WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "ins_history_select" ON public.insurance_renewal_history FOR SELECT
  USING (
    facility_id IN (SELECT id FROM public.facilities WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "ins_history_insert" ON public.insurance_renewal_history FOR INSERT
  WITH CHECK (
    facility_id IN (SELECT id FROM public.facilities WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Update notifications CHECK constraint to include insurance event types
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'facility_added',
    'facility_renewed',
    'facility_deleted',
    'alert_sent',
    'facility_transferred',
    'insurance_added',
    'insurance_renewed',
    'insurance_deleted'
  ));
