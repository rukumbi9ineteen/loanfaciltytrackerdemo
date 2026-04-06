import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import NotificationsInbox from '@/components/notifications/NotificationsInbox'

export const metadata: Metadata = {
  title: 'Notifications | BK Loan Tracker',
}

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: initialNotifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto">
      <NotificationsInbox
        userId={user.id}
        initialNotifications={initialNotifications ?? []}
      />
    </div>
  )
}
