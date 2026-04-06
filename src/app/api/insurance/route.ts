import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createNotifications } from '@/lib/notifications'

// POST — add a new insurance policy to a facility
export async function POST(request: NextRequest) {
  const supabase        = createClient()
  const serviceClient   = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    facility_id, provider, policy_number, insurance_type,
    start_date, expiry_date, premium_amount, premium_currency,
    coverage_amount, coverage_currency, notes,
  } = body

  // Validate required fields
  if (!facility_id || !provider || !policy_number || !insurance_type || !start_date || !expiry_date) {
    return NextResponse.json({ error: 'Missing required insurance fields' }, { status: 400 })
  }

  // Insert the insurance record (status + days_remaining computed by DB trigger)
  const { data: insurance, error } = await supabase
    .from('facility_insurance')
    .insert({
      facility_id,
      provider,
      policy_number,
      insurance_type,
      start_date,
      expiry_date,
      premium_amount:    premium_amount    ? parseFloat(premium_amount)    : null,
      premium_currency:  premium_currency  ?? 'RWF',
      coverage_amount:   coverage_amount   ? parseFloat(coverage_amount)   : null,
      coverage_currency: coverage_currency ?? 'RWF',
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Fetch actor name + facility info + admins for notifications
  const [{ data: actor }, { data: facility }, { data: admins }] = await Promise.all([
    serviceClient.from('profiles').select('full_name').eq('id', user.id).single(),
    serviceClient.from('facilities').select('customer_name, facility_ref, owner_id').eq('id', facility_id).single(),
    serviceClient.from('profiles').select('id').eq('role', 'admin').eq('is_active', true),
  ])

  const actorName  = actor?.full_name ?? 'Someone'
  const adminIds   = (admins ?? []).map((a: any) => a.id).filter((id: string) => id !== user.id)
  const notifyIds  = Array.from(new Set([facility?.owner_id, user.id, ...adminIds].filter(Boolean))) as string[]

  await createNotifications({
    userIds:    notifyIds,
    title:      `${actorName} added insurance`,
    body:       `${provider} — ${insurance_type} policy (${policy_number}) added for ${facility?.customer_name ?? ''} (${facility?.facility_ref ?? ''})`,
    type:       'insurance_added',
    facilityId: facility_id,
  })

  return NextResponse.json({ success: true, insurance })
}

// DELETE — remove an insurance policy
export async function DELETE(request: NextRequest) {
  const supabase      = createClient()
  const serviceClient = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()

  // Fetch insurance details before deleting
  const { data: insurance } = await supabase
    .from('facility_insurance')
    .select('*, facility:facilities(customer_name, facility_ref, owner_id)')
    .eq('id', id)
    .single()

  if (!insurance) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('facility_insurance').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Notify
  const [{ data: actor }, { data: admins }] = await Promise.all([
    serviceClient.from('profiles').select('full_name').eq('id', user.id).single(),
    serviceClient.from('profiles').select('id').eq('role', 'admin').eq('is_active', true),
  ])

  const actorName = actor?.full_name ?? 'Someone'
  const facility  = (insurance as any).facility
  const notifyIds = Array.from(new Set([
    facility?.owner_id,
    user.id,
    ...(admins ?? []).map((a: any) => a.id),
  ].filter(Boolean))) as string[]

  await createNotifications({
    userIds:    notifyIds,
    title:      `${actorName} removed insurance`,
    body:       `${insurance.provider} — ${insurance.insurance_type} (${insurance.policy_number}) removed from ${facility?.customer_name ?? ''} (${facility?.facility_ref ?? ''})`,
    type:       'insurance_deleted',
    facilityId: insurance.facility_id,
  })

  return NextResponse.json({ success: true })
}
