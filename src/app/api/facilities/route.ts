import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createNotifications } from '@/lib/notifications'

// POST — add facility (with notification)
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { error, data } = await supabase.from('facilities').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Notify the R.O. + all admins
  const serviceClient = createServiceClient()
  const [{ data: actor }, { data: admins }] = await Promise.all([
    serviceClient.from('profiles').select('full_name').eq('id', user.id).single(),
    serviceClient.from('profiles').select('id').eq('role', 'admin').eq('is_active', true),
  ])

  const actorName = actor?.full_name ?? 'Someone'
  const adminIds  = (admins ?? []).map((a: any) => a.id).filter((id: string) => id !== user.id)

  await createNotifications({
    userIds:    [user.id, ...adminIds],
    title:      `${actorName} added a facility`,
    body:       `${body.customer_name} — ${body.facility_type} (${body.facility_ref}) was added`,
    type:       'facility_added',
    facilityId: data.id,
  })

  return NextResponse.json({ success: true, facility: data })
}

// DELETE — delete facility (with notification)
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()

  // Fetch facility details before deleting
  const { data: facility } = await supabase
    .from('facilities').select('*').eq('id', id).single()

  if (!facility) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('facilities').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Notify owner + all admins
  const serviceClient = createServiceClient()
  const [{ data: actor }, { data: admins }] = await Promise.all([
    serviceClient.from('profiles').select('full_name').eq('id', user.id).single(),
    serviceClient.from('profiles').select('id').eq('role', 'admin').eq('is_active', true),
  ])

  const actorName = actor?.full_name ?? 'Someone'
  const notifyIds = Array.from(new Set([facility.owner_id, ...(admins ?? []).map((a: any) => a.id)]))

  await createNotifications({
    userIds:    notifyIds,
    title:      `${actorName} deleted a facility`,
    body:       `${facility.customer_name} — ${facility.facility_type} (${facility.facility_ref}) was permanently deleted`,
    type:       'facility_deleted',
    facilityId: id,   // keep the ID so the inbox can link to the deleted-state page
  })

  return NextResponse.json({ success: true })
}
