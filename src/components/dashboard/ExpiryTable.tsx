import Link from 'next/link'
import { cn, formatDate, STATUS_COLORS } from '@/lib/utils'
import type { Facility } from '@/types'

interface Props {
  facilities: Facility[]
  showOwner?: boolean
  highlight?: 'expired'
}

export default function ExpiryTable({ facilities, showOwner, highlight }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ref</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              {showOwner && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">R.O.</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Days Left</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {facilities.map(f => (
              <tr
                key={f.id}
                className={cn(
                  'hover:bg-gray-50 transition-colors',
                  highlight === 'expired' && 'bg-red-50/30'
                )}
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{f.facility_ref}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{f.customer_name}</td>
                <td className="px-4 py-3 text-gray-600">{f.facility_type}</td>
                {showOwner && (
                  <td className="px-4 py-3 text-gray-600">
                    {(f as any).owner?.full_name ?? '—'}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-600">{formatDate(f.expiry_date)}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'font-semibold',
                    f.days_remaining < 0 ? 'text-red-600' :
                    f.days_remaining <= 30 ? 'text-orange-600' :
                    'text-yellow-600'
                  )}>
                    {f.days_remaining < 0 ? `${Math.abs(f.days_remaining)}d overdue` : `${f.days_remaining}d`}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                    STATUS_COLORS[f.status]
                  )}>
                    {f.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/facilities/${f.id}`}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {facilities.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No facilities to display.
          </div>
        )}
      </div>
    </div>
  )
}
