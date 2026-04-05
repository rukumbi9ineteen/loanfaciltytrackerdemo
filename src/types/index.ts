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
  expiry_date: string          // ISO date string YYYY-MM-DD
  status: FacilityStatus       // computed by Postgres
  days_remaining: number       // computed by Postgres
  owner_id: string
  renewal_count: number
  last_renewed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  owner?: Profile
}

export interface RenewalHistory {
  id: string
  facility_id: string
  facility_ref: string
  customer_name: string
  old_expiry_date: string
  new_expiry_date: string
  extension_days: number       // computed by Postgres
  renewed_by: string
  notes: string | null
  created_at: string
  // joined
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
// Form types
// ─────────────────────────────────────────────

export interface AddFacilityForm {
  customer_name: string
  facility_type: string
  description?: string
  expiry_date: string
  notes?: string
}

export interface RenewFacilityForm {
  new_expiry_date: string
  notes?: string
}

export interface LoginForm {
  email: string
  password: string
}

export interface ProfileUpdateForm {
  full_name: string
  branch?: string
  phone?: string
  alert_email?: string
}

// ─────────────────────────────────────────────
// Dashboard summary types
// ─────────────────────────────────────────────

export interface DashboardStats {
  total: number
  active: number
  warning: number    // ≤ 90 days
  critical: number   // ≤ 30 days
  expired: number
}

export interface ExpiryChartPoint {
  month: string      // e.g. "Apr 2025"
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

export type FacilityType = typeof FACILITY_TYPES[number]
