import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, parseISO } from 'date-fns'
import type { FacilityStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, HH:mm')
  } catch {
    return dateStr
  }
}

export function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date())
}

// ─────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────

export function getStatusFromDays(days: number): FacilityStatus {
  if (days < 0)  return 'EXPIRED'
  if (days <= 30) return 'CRITICAL'
  if (days <= 90) return 'WARNING'
  return 'ACTIVE'
}

export const STATUS_COLORS: Record<FacilityStatus, string> = {
  ACTIVE:   'bg-green-100 text-green-800 border-green-200',
  WARNING:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  CRITICAL: 'bg-orange-100 text-orange-800 border-orange-200',
  EXPIRED:  'bg-red-100 text-red-800 border-red-200',
}

export const STATUS_DOT: Record<FacilityStatus, string> = {
  ACTIVE:   'bg-green-500',
  WARNING:  'bg-yellow-500',
  CRITICAL: 'bg-orange-500',
  EXPIRED:  'bg-red-500',
}

// ─────────────────────────────────────────────
// Facility ref generator (client-side preview only;
// actual unique ID is generated server-side)
// ─────────────────────────────────────────────

export function generateFacilityRef(count: number): string {
  return `FAC-${String(count + 1).padStart(3, '0')}`
}

// ─────────────────────────────────────────────
// Number formatter
// ─────────────────────────────────────────────

export function pluralize(count: number, word: string): string {
  return `${count} ${count === 1 ? word : word + 's'}`
}
