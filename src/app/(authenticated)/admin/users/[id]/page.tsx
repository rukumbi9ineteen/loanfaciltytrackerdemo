import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { formatDate, formatDateTime } from '@/lib/utils'
import AdminUserEditForm from '@/components/admin/AdminUserEditForm'

export const dynamic = 'force-dynamic'

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') redirect('/dashboard')

  const { data: targetProfile } = await supabase
    .from('profiles').select('*').eq('id', params.id).single()
  if (!targetProfile) notFound()

  const { data: facilitiesRaw } = await supabase
    .from('facilities')
    .select('id, facility_ref, customer_name, expiry_date, status, days_remaining')
    .eq('owner_id', params.id)
    .order('days_remaining', { ascending: true })
  const facilities = facilitiesRaw ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Back to Admin</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{targetProfile.full_name}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{targetProfile.email}</p>
      </div>

      <AdminUserEditForm profile={targetProfile} />

      {/* Facilities summary */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">
          Portfolio ({facilities.length} facilit{facilities.length === 1 ? 'y' : 'ies'})
        </h2>
        {facilities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No facilities yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {facilities.map((f: any) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{f.facility_ref}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{f.customer_name}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(f.expiry_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${
                        f.status === 'EXPIRED'  ? 'text-red-600' :
                        f.status === 'CRITICAL' ? 'text-orange-600' :
                        f.status === 'WARNING'  ? 'text-yellow-600' : 'text-green-600'
                      }`}>{f.status}</span>
                    </td>
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
