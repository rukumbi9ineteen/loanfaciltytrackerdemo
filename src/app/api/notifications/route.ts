import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST — create a notification (internal use)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { user_id, title, body: msgBody, type, facility_id } = body

  const serviceClient = createServiceClient()
  const { error } = await serviceClient.from('notifications').insert({
    user_id, title, body: msgBody, type, facility_id: facility_id ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH — mark all as read for current user
export async function PATCH() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return NextResponse.json({ success: true })
}
