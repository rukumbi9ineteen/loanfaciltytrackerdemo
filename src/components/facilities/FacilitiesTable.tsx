'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, formatDate, STATUS_COLORS } from '@/lib/utils'
import { Search, RefreshCw, RotateCcw } from 'lucide-react'
import type { Facility, FacilityStatus } from '@/types'

const STATUSES: { value: string; label: string }[] = [
  { value: 'ALL',      label: 'All' },
  { value: 'ACTIVE',   label: 'Active' },
  { value: 'WARNING',  label: 'Warning' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'EXPIRED',  label: 'Expired' },
]

interface Props {
  facilities: Facility[]
  showOwner?: boolean
  currentStatus?: string
  currentSearch?: string
}

export default function FacilitiesTable({
  facilities,
  showOwner,
  currentStatus,
  currentSearch,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState(currentSearch ?? '')

  const applyFilter = (status: string, q?: string) => {
    const params = new URLSearchParams()
    if (status && status !== 'ALL') params.set('status', status)
    if (q ?? search) params.set('search', q ?? search)
    startTransition(() => router.push(`/facilities?${params.toString()}`))
  }

  return (
    <div className="space-y-4">
      {/* Search + status filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name or facility ref…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilter(currentStatus ?? 'ALL')}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => applyFilter(currentStatus ?? 'ALL')}
          className="px-4 py-2.5 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition"
        >
          Search
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => applyFilter(s.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              (currentStatus ?? 'ALL') === s.value
                ? 'bg-blue-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ref</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                {showOwner && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">R.O.</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Days Left</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Renewals</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facilities.map(f => (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{f.facility_ref}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{f.customer_name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{f.facility_type}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{f.description ?? '—'}</td>
                  {showOwner && (
                    <td className="px-4 py-3 text-gray-600">
                      {/* @ts-expect-error: joined */}
                      {f.owner?.full_name ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(f.expiry_date)}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'font-semibold text-sm',
                      f.days_remaining < 0 ? 'text-red-600' :
                      f.days_remaining <= 30 ? 'text-orange-600' :
                      f.days_remaining <= 90 ? 'text-yellow-600' : 'text-green-600'
                    )}>
                      {f.days_remaining < 0
                        ? `${Math.abs(f.days_remaining)}d overdue`
                        : `${f.days_remaining}d`
                      }
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                      STATUS_COLORS[f.status as FacilityStatus]
                    )}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{f.renewal_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/facilities/${f.id}/renew`}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                        title="Renew facility"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Renew
                      </Link>
                      <Link
                        href={`/facilities/${f.id}`}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {facilities.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No facilities found.</p>
              <Link href="/facilities/add" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                + Add your first facility
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
