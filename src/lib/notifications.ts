import { createServiceClient } from './supabase/server'

type NotificationType = 'facility_added' | 'facility_renewed' | 'facility_deleted' | 'alert_sent'

interface NotifyOptions {
  userIds: string[]          // who receives it
  title: string
  body: string
  type: NotificationType
  facilityId?: string
}

/**
 * Creates notification rows for one or more users.
 * Called server-side only.
 */
export async function createNotifications(opts: NotifyOptions) {
  const supabase = createServiceClient()
  const rows = opts.userIds.map(uid => ({
    user_id:     uid,
    title:       opts.title,
    body:        opts.body,
    type:        opts.type,
    facility_id: opts.facilityId ?? null,
  }))
  await supabase.from('notifications').insert(rows)
}
