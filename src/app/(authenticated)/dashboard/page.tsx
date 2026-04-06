import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatsCards from '@/components/dashboard/StatsCards'
import ExpiryTable from '@/components/dashboard/ExpiryTable'
import ExpiryChart from '@/components/dashboard/ExpiryChart'
import AlertBanner from '@/components/dashboard/AlertBanner'
import { ShieldX, ShieldCheck, ShieldAlert } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { DashboardStats, Facility, InsuranceStats, FacilityInsurance } from '@/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Run all queries in parallel
  const [profileRes, facilitiesRes, insuranceRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('facilities')
      .select('*, owner:profiles(full_name, email), insurance:facility_insurance(id)')
      .order('days_remaining', { ascending: true }),
    supabase
      .from('facility_insurance')
      .select('*, facility:facilities(facility_ref, customer_name, facility_type, owner_id)')
      .order('days_remaining', { ascending: true }),
  ])

  const profile   = profileRes.data
  const facs      = (facilitiesRes.data ?? []) as (Facility & { insurance: { id: string }[] })[]
  const allIns    = (insuranceRes.data ?? []) as (FacilityInsurance & { facility: { facility_ref: string; customer_name: string; facility_type: string; owner_id: string } | null })[]

  // Compute facility stats
  const stats: DashboardStats = {
    total:    facs.length,
    active:   facs.filter(f => f.status === 'ACTIVE').length,
    warning:  facs.filter(f => f.status === 'WARNING').length,
    critical: facs.filter(f => f.status === 'CRITICAL').length,
    expired:  facs.filter(f => f.status === 'EXPIRED').length,
  }

  // Compute insurance stats
  const insStats: InsuranceStats = {
    total:    allIns.length,
    active:   allIns.filter(i => i.status === 'ACTIVE').length,
    warning:  allIns.filter(i => i.status === 'WARNING').length,
    critical: allIns.filter(i => i.status === 'CRITICAL').length,
    expired:  allIns.filter(i => i.status === 'EXPIRED').length,
    missing:  facs.filter(f => (f.insurance?.length ?? 0) === 0).length,
  }

  // Facilities expiring in next 90 days (for table)
  const expiring = facs.filter(f => f.days_remaining <= 90 && f.days_remaining >= 0)
  const expired  = facs.filter(f => f.status === 'EXPIRED')

  // Insurance expiring in next 90 days
  const expiringIns = allIns.filter(i => (i.days_remaining ?? 0) <= 90 && (i.days_remaining ?? 0) >= 0)

  // Facilities with no insurance
  const missingInsFacs = facs.filter(f => (f.insurance?.length ?? 0) === 0)

  // Build chart data: count per month (next 12 months)
  const chartData = buildChartData(facs)

  const showInsuranceAlert = insStats.missing > 0 || insStats.critical > 0

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

      {/* Alert banners */}
      {(stats.expired > 0 || stats.critical > 0 || showInsuranceAlert) && (
        <AlertBanner
          expired={stats.expired}
          critical={stats.critical}
          missingInsurance={insStats.missing}
          criticalInsurance={insStats.critical}
        />
      )}

      {/* Stats cards */}
      <StatsCards stats={stats} />

      {/* Insurance summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Policies',  value: insStats.total,    icon: ShieldCheck, color: 'text-gray-700',   bg: 'bg-gray-50',    border: 'border-gray-200' },
          { label: 'Active',          value: insStats.active,   icon: ShieldCheck, color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200' },
          { label: 'Warning (≤90d)',  value: insStats.warning,  icon: ShieldAlert, color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
          { label: 'Critical (≤30d)', value: insStats.critical, icon: ShieldAlert, color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200' },
          { label: 'Expired',         value: insStats.expired,  icon: ShieldX,     color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200' },
          { label: 'Missing',         value: insStats.missing,  icon: ShieldX,     color: 'text-red-800',    bg: 'bg-red-100',    border: 'border-red-300' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-3 flex flex-col gap-1`}>
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
              </div>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
            </div>
          )
        })}
      </div>

      {/* Chart + breakdown */}
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
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">Facilities Expiring in the Next 90 Days</h2>
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

      {/* Insurance expiring soon */}
      {expiringIns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="font-semibold text-gray-900 text-sm md:text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              Insurance Expiring in the Next 90 Days
            </h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Facility</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Provider</th>
                    <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Policy #</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Days</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expiringIns.map(ins => {
                    const statusColors: Record<string, string> = {
                      ACTIVE:   'bg-green-50 text-green-700 border-green-200',
                      WARNING:  'bg-yellow-50 text-yellow-700 border-yellow-200',
                      CRITICAL: 'bg-orange-50 text-orange-700 border-orange-200',
                      EXPIRED:  'bg-red-50 text-red-700 border-red-200',
                    }
                    const rowBg = ins.status === 'CRITICAL' ? 'bg-orange-50/30' : ins.status === 'EXPIRED' ? 'bg-red-50/30' : ''
                    return (
                      <tr key={ins.id} className={`hover:bg-gray-50 transition-colors ${rowBg}`}>
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-900 text-xs">{ins.facility?.customer_name ?? '—'}</div>
                          <div className="font-mono text-[10px] text-gray-400">{ins.facility?.facility_ref ?? '—'}</div>
                        </td>
                        <td className="px-3 py-3 text-gray-700 text-xs font-medium">{ins.provider}</td>
                        <td className="hidden sm:table-cell px-3 py-3 text-gray-500 text-xs">{ins.insurance_type}</td>
                        <td className="hidden sm:table-cell px-3 py-3 font-mono text-xs text-gray-400">{ins.policy_number}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(ins.expiry_date)}</td>
                        <td className="px-3 py-3">
                          <span className={`font-semibold text-xs ${
                            (ins.days_remaining ?? 0) <= 30 ? 'text-orange-600' :
                            (ins.days_remaining ?? 0) <= 90 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {ins.days_remaining}d
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[ins.status] ?? ''}`}>
                            {ins.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link href={`/facilities/${ins.facility_id}`} className="text-xs text-blue-600 hover:underline font-medium whitespace-nowrap">
                            View →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Facilities missing insurance */}
      {missingInsFacs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="font-semibold text-red-700 text-sm md:text-base flex items-center gap-2">
              <ShieldX className="w-4 h-4" />
              Facilities Missing Insurance ({missingInsFacs.length})
            </h2>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-100/60 border-b border-red-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-red-700 uppercase">Ref</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-red-700 uppercase">Customer</th>
                    <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-semibold text-red-700 uppercase">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-red-700 uppercase">Facility Status</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {missingInsFacs.map(f => (
                    <tr key={f.id} className="hover:bg-red-100/30 transition-colors">
                      <td className="px-3 py-3 font-mono text-xs text-red-500">{f.facility_ref}</td>
                      <td className="px-3 py-3 font-medium text-gray-900">{f.customer_name}</td>
                      <td className="hidden sm:table-cell px-3 py-3 text-gray-600 text-xs">{f.facility_type}</td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-medium text-gray-700">{f.status}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/facilities/${f.id}`} className="text-xs text-red-600 hover:underline font-semibold whitespace-nowrap">
                          Add Insurance →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
