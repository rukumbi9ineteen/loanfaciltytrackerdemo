import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddFacilityForm from '@/components/facilities/AddFacilityForm'

export default async function AddFacilityPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Count existing facilities to suggest next ref
  const { count } = await supabase
    .from('facilities')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <a href="/facilities" className="text-sm text-gray-500 hover:text-gray-700">← Back to Facilities</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Add New Facility</h1>
        <p className="text-gray-500 text-sm mt-0.5">Enter the facility details below.</p>
      </div>

      <AddFacilityForm userId={user.id} facilityCount={count ?? 0} />
    </div>
  )
}
