import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createNotifications } from '@/lib/notifications'
import { differenceInDays, parseISO } from 'date-fns'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { facility_id, new_expiry_date, notes } = body

  // Fetch current facility
  const { data: facility } = await supabase
    .from('facilities').select('*').eq('id', facility_id).single()
  if (!facility) return NextResponse.json({ error: 'Facility not found' }, { status: 404 })

  const extDays = differenceInDays(parseISO(new_expiry_date), parseISO(facility.expiry_date))
  if (extDays <= 0) return NextResponse.json({ error: 'New date must be after current expiry' }, { status: 400 })

  // Insert renewal history
  await supabase.from('renewal_history').insert({
    facility_id,
    facility_ref:    facility.facility_ref,
    customer_name:   facility.customer_name,
    old_expiry_date: facility.expiry_date,
    new_expiry_date,
    renewed_by:      user.id,
    notes:           notes || null,
  })

  // Update facility
  const { data: fac } = await supabase
    .from('facilities').select('renewal_count').eq('id', facility_id).single()

  await supabase.from('facilities').update({
    expiry_date:     new_expiry_date,
    last_renewed_at: new Date().toISOString(),
    renewal_count:   (fac?.renewal_count ?? 0) + 1,
  }).eq('id', facility_id)

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
    title:      `${actorName} renewed a facility`,
    body:       `${facility.customer_name} — ${facility.facility_type} (${facility.facility_ref}) renewed by +${extDays} days`,
    type:       'facility_renewed',
    facilityId: facility_id,
  })

  return NextResponse.json({ success: true })
}
