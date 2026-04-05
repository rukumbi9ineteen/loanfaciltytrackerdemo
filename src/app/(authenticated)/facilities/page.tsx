import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import FacilitiesTable from '@/components/facilities/FacilitiesTable'
import { Plus } from 'lucide-react'
import type { Facility } from '@/types'

export const dynamic = 'force-dynamic'

export default async function FacilitiesPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  let query = supabase
    .from('facilities')
    .select('*, owner:profiles(full_name, email)')
    .order('days_remaining', { ascending: true })

  if (searchParams.status && searchParams.status !== 'ALL') {
    query = query.eq('status', searchParams.status)
  }

  if (searchParams.search) {
    query = query.or(
      `customer_name.ilike.%${searchParams.search}%,facility_ref.ilike.%${searchParams.search}%`
    )
  }

  const { data: facilities = [] } = await query

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facilities</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {facilities.length} facilit{facilities.length === 1 ? 'y' : 'ies'} in your portfolio
          </p>
        </div>
        <Link
          href="/facilities/add"
          className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Facility
        </Link>
      </div>

      {/* Filters */}
      <FacilitiesTable
        facilities={facilities as Facility[]}
        showOwner={profile?.role === 'admin'}
        currentStatus={searchParams.status}
        currentSearch={searchParams.search}
      />
    </div>
  )
}
