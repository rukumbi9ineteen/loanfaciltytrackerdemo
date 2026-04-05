import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from '@/components/settings/SettingsForm'
import ChangePasswordForm from '@/components/settings/ChangePasswordForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  // Fetch recent alert log
  const { data: alertLog = [] } = await supabase
    .from('alert_log')
    .select('*')
    .eq('owner_id', user.id)
    .order('sent_at', { ascending: false })
    .limit(5)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your profile and notification preferences</p>
      </div>

      <SettingsForm profile={profile} />
      <ChangePasswordForm />

      {/* Alert log */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Recent Email Alerts</h2>
        {alertLog.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No alerts sent yet. Alerts are sent automatically each day when facilities are expiring.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Facilities</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alertLog.map((log: any) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(log.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.recipient}</td>
                    <td className="px-4 py-3 text-gray-600">{log.facility_count}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'sent'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status}
                      </span>
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
