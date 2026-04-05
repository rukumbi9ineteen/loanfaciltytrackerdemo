import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatsCards from '@/components/dashboard/StatsCards'
import ExpiryTable from '@/components/dashboard/ExpiryTable'
import ExpiryChart from '@/components/dashboard/ExpiryChart'
import AlertBanner from '@/components/dashboard/AlertBanner'
import type { DashboardStats, Facility } from '@/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch facilities (RLS ensures R.O. only sees their own)
  const { data: facilities = [] } = await supabase
    .from('facilities')
    .select('*, owner:profiles(full_name, email)')
    .order('days_remaining', { ascending: true })

  const facs = facilities as Facility[]

  // Compute stats
  const stats: DashboardStats = {
    total:    facs.length,
    active:   facs.filter(f => f.status === 'ACTIVE').length,
    warning:  facs.filter(f => f.status === 'WARNING').length,
    critical: facs.filter(f => f.status === 'CRITICAL').length,
    expired:  facs.filter(f => f.status === 'EXPIRED').length,
  }

  // Facilities expiring in next 90 days (for table)
  const expiring = facs.filter(f => f.days_remaining <= 90 && f.days_remaining >= 0)
  const expired  = facs.filter(f => f.status === 'EXPIRED')

  // Build chart data: count per month (next 12 months)
  const chartData = buildChartData(facs)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Welcome back, {profile?.full_name?.split(' ')[0]}.
            Here&apos;s your portfolio at a glance.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-gray-400">Today</p>
          <p className="text-sm font-medium text-gray-700">
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Alert banner */}
      {(stats.expired > 0 || stats.critical > 0) && (
        <AlertBanner expired={stats.expired} critical={stats.critical} />
      )}

      {/* Stats cards */}
      <StatsCards stats={stats} />

      {/* Chart + tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Expiry timeline chart */}
        <div className="xl:col-span-2">
          <ExpiryChart data={chartData} />
        </div>

        {/* Quick status breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
          <h3 className="font-semibold text-gray-900">Status Breakdown</h3>
          {[
            { label: 'Active',   count: stats.active,   color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50' },
            { label: 'Warning',  count: stats.warning,  color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' },
            { label: 'Critical', count: stats.critical, color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
            { label: 'Expired',  count: stats.expired,  color: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`flex items-center justify-between px-4 py-3 rounded-xl ${s.bg}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                <span className={`text-sm font-medium ${s.text}`}>{s.label}</span>
              </div>
              <span className={`text-lg font-bold ${s.text}`}>{s.count}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Facilities</span>
              <span className="text-lg font-bold text-gray-900">{stats.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expiring soon table */}
      {expiring.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">Expiring in the Next 90 Days</h2>
            <a href="/facilities" className="text-xs md:text-sm text-blue-600 hover:underline whitespace-nowrap">View all →</a>
          </div>
          <ExpiryTable facilities={expiring} showOwner={profile?.role === 'admin'} />
        </div>
      )}

      {/* Expired table */}
      {expired.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3 text-red-700">Expired Facilities</h2>
          <ExpiryTable facilities={expired} showOwner={profile?.role === 'admin'} highlight="expired" />
        </div>
      )}
    </div>
  )
}

function buildChartData(facilities: Facility[]) {
  const map: Record<string, number> = {}
  const today = new Date()

  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
    const key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    map[key] = 0
  }

  facilities.forEach(f => {
    const d = new Date(f.expiry_date)
    const key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    if (key in map) map[key]++
  })

  return Object.entries(map).map(([month, count]) => ({ month, count }))
}
