import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminUserCard from '@/components/admin/AdminUserCard'
import AdminStatsBar from '@/components/admin/AdminStatsBar'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (myProfile?.role !== 'admin') redirect('/dashboard')

  // All R.O. profiles
  const { data: profiles = [] } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // All facilities with owner
  const { data: allFacilities = [] } = await supabase
    .from('facilities')
    .select('owner_id, status, days_remaining')

  // Group facilities by owner
  const byOwner: Record<string, {
    total: number; expired: number; critical: number; warning: number
  }> = {}
  allFacilities.forEach((f: any) => {
    if (!byOwner[f.owner_id]) {
      byOwner[f.owner_id] = { total: 0, expired: 0, critical: 0, warning: 0 }
    }
    byOwner[f.owner_id].total++
    if (f.status === 'EXPIRED')  byOwner[f.owner_id].expired++
    if (f.status === 'CRITICAL') byOwner[f.owner_id].critical++
    if (f.status === 'WARNING')  byOwner[f.owner_id].warning++
  })

  const globalStats = {
    totalROs:      profiles.filter(p => p.role === 'ro').length,
    totalFacs:     allFacilities.length,
    expired:       allFacilities.filter((f: any) => f.status === 'EXPIRED').length,
    critical:      allFacilities.filter((f: any) => f.status === 'CRITICAL').length,
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage users and monitor the entire portfolio</p>
        </div>
        <Link
          href="/admin/users/create"
          className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create User
        </Link>
      </div>

      {/* Global stats bar */}
      <AdminStatsBar stats={globalStats} />

      {/* Users grid */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-4">All Users ({profiles.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map((p: any) => (
            <AdminUserCard
              key={p.id}
              profile={p}
              facilityStats={byOwner[p.id] ?? { total: 0, expired: 0, critical: 0, warning: 0 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
