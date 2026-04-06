import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime, STATUS_COLORS, cn } from '@/lib/utils'
import { RotateCcw, Trash2, ArrowLeftRight, AlertCircle } from 'lucide-react'
import DeleteFacilityButton from '@/components/facilities/DeleteFacilityButton'
import TransferFacilityButton from '@/components/admin/TransferFacilityButton'
import InsuranceSection from '@/components/insurance/InsuranceSection'
import type { FacilityStatus, FacilityInsurance, InsuranceRenewalHistory } from '@/types'

export const dynamic = 'force-dynamic'

// ─── Graceful "facility not accessible" banner ───────────────────────────────
function FacilityNotAvailable({
  type,
  body,
  facilityId,
}: {
  type?: string
  body?: string
  facilityId: string
}) {
  const isDeleted     = type === 'facility_deleted'
  const isTransferred = type === 'facility_transferred'

  const icon = isDeleted ? (
    <Trash2 className="w-8 h-8 text-red-400" />
  ) : isTransferred ? (
    <ArrowLeftRight className="w-8 h-8 text-purple-400" />
  ) : (
    <AlertCircle className="w-8 h-8 text-gray-400" />
  )

  const iconBg = isDeleted
    ? 'bg-red-50 ring-red-100'
    : isTransferred
    ? 'bg-purple-50 ring-purple-100'
    : 'bg-gray-50 ring-gray-100'

  const heading = isDeleted
    ? 'This facility has been deleted'
    : isTransferred
    ? 'This facility has been transferred'
    : 'Facility not accessible'

  const detail = body ?? (
    isDeleted
      ? 'This facility was permanently removed and is no longer available.'
      : isTransferred
      ? 'This facility was assigned to another Relationship Officer.'
      : 'You may not have permission to view this facility, or it no longer exists.'
  )

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/facilities" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to Facilities
      </Link>

      <div className={cn(
        'mt-6 rounded-2xl border p-8 sm:p-12 text-center',
        isDeleted
          ? 'bg-red-50/40 border-red-100'
          : isTransferred
          ? 'bg-purple-50/40 border-purple-100'
          : 'bg-gray-50 border-gray-200'
      )}>
        {/* Icon */}
        <div className={cn(
          'w-16 h-16 rounded-2xl ring-4 flex items-center justify-center mx-auto mb-5',
          iconBg
        )}>
          {icon}
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">{heading}</h2>

        {/* Detail from the original notification */}
        <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">{detail}</p>

        {/* Status chip */}
        <div className="flex justify-center mt-4">
          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full',
            isDeleted
              ? 'bg-red-100 text-red-700'
              : isTransferred
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-600'
          )}>
            {isDeleted ? '🗑️ Deleted' : isTransferred ? '🔀 Transferred' : '⚠️ Not found'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Link
            href="/notifications"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition"
          >
            View Notifications
          </Link>
          <Link
            href="/facilities"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition"
            style={{ background: '#034EA2' }}
          >
            Back to Facilities
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
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

  // ── Facility not found or not accessible ──
  if (!facility) {
    // Check the user's notifications to explain why
    const { data: relatedNotifs } = await supabase
      .from('notifications')
      .select('type, body')
      .eq('facility_id', params.id)
      .eq('user_id', user.id)
      .in('type', ['facility_deleted', 'facility_transferred'])
      .order('created_at', { ascending: false })
      .limit(1)

    const reason = relatedNotifs?.[0]
    return (
      <FacilityNotAvailable
        type={reason?.type}
        body={reason?.body}
        facilityId={params.id}
      />
    )
  }

  const [{ data: historyRaw }, { data: insuranceRaw }, { data: insHistoryRaw }] = await Promise.all([
    supabase.from('renewal_history')
      .select('*, renewer:profiles(full_name)')
      .eq('facility_id', params.id)
      .order('created_at', { ascending: false }),
    supabase.from('facility_insurance')
      .select('*')
      .eq('facility_id', params.id)
      .order('created_at', { ascending: false }),
    supabase.from('insurance_renewal_history')
      .select('*')
      .eq('facility_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  const history        = historyRaw    ?? []
  const insurance      = (insuranceRaw ?? []) as FacilityInsurance[]
  const insHistory     = (insHistoryRaw ?? []) as InsuranceRenewalHistory[]

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

      {/* Insurance policies */}
      <InsuranceSection
        facilityId={params.id}
        initialInsurance={insurance}
        initialHistory={insHistory}
      />

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
