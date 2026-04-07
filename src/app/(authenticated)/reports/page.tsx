import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from '@/components/reports/ReportsClient'
import type { Facility, FacilityInsurance } from '@/types'

export const dynamic = 'force-dynamic'

export type FacilityWithInsurance = Facility & {
  insurance: Pick<FacilityInsurance, 'id' | 'provider' | 'policy_number' | 'insurance_type' | 'expiry_date' | 'days_remaining' | 'status'>[]
}

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { data: facilities = [] } = await supabase
    .from('facilities')
    .select('*, insurance:facility_insurance(id, provider, policy_number, insurance_type, expiry_date, days_remaining, status)')
    .order('days_remaining', { ascending: true })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm mt-0.5">Generate and export facility expiry reports</p>
      </div>
      <ReportsClient
        facilities={facilities as FacilityWithInsurance[]}
        officerName={profile?.full_name ?? ''}
        bankName={process.env.NEXT_PUBLIC_BANK_NAME ?? 'Your Bank'}
      />
    </div>
  )
}
