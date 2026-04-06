// ─────────────────────────────────────────────
// Core domain types
// ─────────────────────────────────────────────

export type UserRole = 'admin' | 'ro'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  branch: string | null
  phone: string | null
  alert_email: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type FacilityStatus = 'ACTIVE' | 'WARNING' | 'CRITICAL' | 'EXPIRED'

export interface Facility {
  id: string
  facility_ref: string
  customer_name: string
  facility_type: string
  description: string | null
  expiry_date: string
  status: FacilityStatus
  days_remaining: number
  amount: number | null
  currency: string
  amount_notes: string | null
  owner_id: string
  renewal_count: number
  last_renewed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  owner?: Profile
  insurance?: { id: string }[]   // joined count for "missing insurance" flag
}

export interface RenewalHistory {
  id: string
  facility_id: string
  facility_ref: string
  customer_name: string
  old_expiry_date: string
  new_expiry_date: string
  extension_days: number
  renewed_by: string
  notes: string | null
  created_at: string
  renewer?: Profile
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: 'facility_added' | 'facility_renewed' | 'facility_deleted' | 'alert_sent' | 'facility_transferred'
      | 'insurance_added' | 'insurance_renewed' | 'insurance_deleted'
  facility_id: string | null
  is_read: boolean
  created_at: string
}

// ─────────────────────────────────────────────
// Insurance types
// ─────────────────────────────────────────────

export const INSURANCE_TYPES = [
  'Life',
  'Property',
  'Fire',
  'Credit',
  'Comprehensive',
  'Motor Vehicle',
  'Marine',
  'Professional Indemnity',
  'Other',
] as const

export type InsuranceType = typeof INSURANCE_TYPES[number]

export interface FacilityInsurance {
  id: string
  facility_id: string
  provider: string
  policy_number: string
  insurance_type: string
  start_date: string
  expiry_date: string
  premium_amount: number | null
  premium_currency: string
  coverage_amount: number | null
  coverage_currency: string
  status: FacilityStatus
  days_remaining: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InsuranceRenewalHistory {
  id: string
  insurance_id: string
  facility_id: string
  old_expiry_date: string
  new_expiry_date: string
  extension_days: number
  renewed_by: string
  notes: string | null
  created_at: string
  renewer?: Profile
}

export interface AlertLog {
  id: string
  owner_id: string
  sent_at: string
  recipient: string
  facility_count: number
  status: 'sent' | 'failed'
  error_msg: string | null
}

// ─────────────────────────────────────────────
// Dashboard summary types
// ─────────────────────────────────────────────

export interface DashboardStats {
  total: number
  active: number
  warning: number
  critical: number
  expired: number
}

export interface InsuranceStats {
  total: number
  active: number
  warning: number
  critical: number
  expired: number
  missing: number   // facilities with no insurance at all
}

export interface ExpiryChartPoint {
  month: string
  count: number
}

// ─────────────────────────────────────────────
// Facility type options
// ─────────────────────────────────────────────

export const FACILITY_TYPES = [
  'Overdraft',
  'Term Loan',
  'Letter of Guarantee',
  'Letter of Credit',
  'Invoice Discounting',
  'Asset Finance',
  'Mortgage',
  'Working Capital',
  'Trade Finance',
  'Other',
] as const

export const CURRENCIES = ['USD', 'EUR', 'GBP',  'RWF'] as const

export type FacilityType = typeof FACILITY_TYPES[number]
