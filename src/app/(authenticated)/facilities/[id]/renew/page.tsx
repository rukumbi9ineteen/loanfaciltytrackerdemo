import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import RenewFacilityForm from '@/components/facilities/RenewFacilityForm'
import { formatDate } from '@/lib/utils'

export default async function RenewFacilityPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: facility } = await supabase
    .from('facilities')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!facility) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <a href={`/facilities/${facility.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Facility
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Renew Facility</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {facility.customer_name} — {facility.facility_ref}
        </p>
      </div>

      {/* Current details */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
        <p className="text-sm font-semibold text-amber-800 mb-3">Current Details</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-amber-600 text-xs uppercase font-semibold">Current Expiry</p>
            <p className="font-medium text-amber-900 mt-0.5">{formatDate(facility.expiry_date)}</p>
          </div>
          <div>
            <p className="text-amber-600 text-xs uppercase font-semibold">Days Remaining</p>
            <p className="font-medium text-amber-900 mt-0.5">
              {facility.days_remaining < 0
                ? `${Math.abs(facility.days_remaining)} days overdue`
                : `${facility.days_remaining} days`
              }
            </p>
          </div>
          <div>
            <p className="text-amber-600 text-xs uppercase font-semibold">Facility Type</p>
            <p className="font-medium text-amber-900 mt-0.5">{facility.facility_type}</p>
          </div>
          <div>
            <p className="text-amber-600 text-xs uppercase font-semibold">Renewals so far</p>
            <p className="font-medium text-amber-900 mt-0.5">{facility.renewal_count}</p>
          </div>
        </div>
      </div>

      <RenewFacilityForm
        facilityId={facility.id}
        facilityRef={facility.facility_ref}
        customerName={facility.customer_name}
        currentExpiry={facility.expiry_date}
        userId={user.id}
      />
    </div>
  )
}
