import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime, STATUS_COLORS, cn } from '@/lib/utils'
import { RotateCcw } from 'lucide-react'
import DeleteFacilityButton from '@/components/facilities/DeleteFacilityButton'
import TransferFacilityButton from '@/components/admin/TransferFacilityButton'
import type { FacilityStatus } from '@/types'

export const dynamic = 'force-dynamic'

export default async function FacilityDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch current user's role
  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = myProfile?.role === 'admin'

  const { data: facility } = await supabase
    .from('facilities')
    .select('*, owner:profiles(full_name, email)')
    .eq('id', params.id)
    .single()

  if (!facility) notFound()

  const { data: historyRaw } = await supabase
    .from('renewal_history')
    .select('*, renewer:profiles(full_name)')
    .eq('facility_id', params.id)
    .order('created_at', { ascending: false })
  const history = historyRaw ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/facilities" className="text-sm text-gray-500 hover:text-gray-700">← Back to Facilities</Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mt-2 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{facility.customer_name}</h1>
            <p className="text-gray-500 text-sm font-mono mt-0.5">{facility.facility_ref}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Link
              href={`/facilities/${facility.id}/renew`}
              className="inline-flex items-center gap-1.5 px-3 md:px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Renew
            </Link>
            {isAdmin && (
              <TransferFacilityButton
                facilityId={facility.id}
                facilityRef={facility.facility_ref}
                customerName={facility.customer_name}
                currentOwnerId={facility.owner_id}
              />
            )}
            <DeleteFacilityButton facilityId={facility.id} />
          </div>
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Facility Type</p>
          <p className="text-sm font-medium text-gray-900">{facility.facility_type}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Status</p>
          <span className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
            STATUS_COLORS[facility.status as FacilityStatus]
          )}>
            {facility.status}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Expiry Date</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(facility.expiry_date)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Days Remaining</p>
          <p className={cn(
            'text-sm font-bold',
            facility.days_remaining < 0 ? 'text-red-600' :
            facility.days_remaining <= 30 ? 'text-orange-600' :
            facility.days_remaining <= 90 ? 'text-yellow-600' : 'text-green-600'
          )}>
            {facility.days_remaining < 0
              ? `${Math.abs(facility.days_remaining)} days overdue`
              : `${facility.days_remaining} days`
            }
          </p>
        </div>
        {facility.description && (
          <div className="col-span-2">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Description</p>
            <p className="text-sm text-gray-700">{facility.description}</p>
          </div>
        )}
        {facility.notes && (
          <div className="col-span-2">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Notes</p>
            <p className="text-sm text-gray-700">{facility.notes}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Renewal Count</p>
          <p className="text-sm text-gray-900">{facility.renewal_count}</p>
        </div>
        {facility.last_renewed_at && (
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Last Renewed</p>
            <p className="text-sm text-gray-900">{formatDateTime(facility.last_renewed_at)}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Added On</p>
          <p className="text-sm text-gray-500">{formatDateTime(facility.created_at)}</p>
        </div>
      </div>

      {/* Renewal history */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Renewal History ({history.length})</h2>
        {history.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No renewals recorded yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Old Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">New Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Extension</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((h: any) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{formatDate(h.created_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(h.old_expiry_date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatDate(h.new_expiry_date)}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium">+{h.extension_days}d</td>
                    <td className="px-4 py-3 text-gray-500">{h.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
