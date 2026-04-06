import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createNotifications } from '@/lib/notifications'

// POST — renew an insurance policy (extend expiry date)
export async function POST(request: NextRequest) {
  const supabase      = createClient()
  const serviceClient = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { insurance_id, new_expiry_date, notes } = await request.json()

  if (!insurance_id || !new_expiry_date) {
    return NextResponse.json({ error: 'insurance_id and new_expiry_date are required' }, { status: 400 })
  }

  // Fetch current insurance record
  const { data: current } = await supabase
    .from('facility_insurance')
    .select('*, facility:facilities(customer_name, facility_ref, owner_id)')
    .eq('id', insurance_id)
    .single()

  if (!current) return NextResponse.json({ error: 'Insurance not found' }, { status: 404 })

  const oldExpiry = current.expiry_date
  const oldDate   = new Date(oldExpiry)
  const newDate   = new Date(new_expiry_date)
  const extDays   = Math.round((newDate.getTime() - oldDate.getTime()) / 86_400_000)

  if (extDays <= 0) {
    return NextResponse.json({ error: 'New expiry date must be after the current expiry date' }, { status: 400 })
  }

  // Update expiry date (trigger recomputes status + days_remaining)
  const { error: updateErr } = await supabase
    .from('facility_insurance')
    .update({ expiry_date: new_expiry_date })
    .eq('id', insurance_id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

  // Log renewal history
  await supabase.from('insurance_renewal_history').insert({
    insurance_id,
    facility_id:    current.facility_id,
    old_expiry_date: oldExpiry,
    new_expiry_date,
    extension_days: extDays,
    renewed_by:     user.id,
    notes:          notes || null,
  })

  // Notify
  const facility = (current as any).facility
  const [{ data: actor }, { data: admins }] = await Promise.all([
    serviceClient.from('profiles').select('full_name').eq('id', user.id).single(),
    serviceClient.from('profiles').select('id').eq('role', 'admin').eq('is_active', true),
  ])

  const actorName = actor?.full_name ?? 'Someone'
  const notifyIds = Array.from(new Set([
    facility?.owner_id,
    user.id,
    ...(admins ?? []).map((a: any) => a.id),
  ].filter(Boolean))) as string[]

  await createNotifications({
    userIds:    notifyIds,
    title:      `${actorName} renewed insurance`,
    body:       `${current.provider} — ${current.insurance_type} (${current.policy_number}) for ${facility?.customer_name ?? ''} renewed by ${extDays} days. New expiry: ${new Date(new_expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    type:       'insurance_renewed',
    facilityId: current.facility_id,
  })

  return NextResponse.json({ success: true })
}
