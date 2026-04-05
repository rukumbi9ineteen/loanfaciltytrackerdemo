import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendFacilityAlert } from '@/lib/email'

// Admin-triggered manual email blast to all R.O.s (or a specific one)
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const targetOwnerId: string | null = body.owner_id ?? null  // null = send to all

  const serviceClient = createServiceClient()

  // Refresh statuses first
  await serviceClient.rpc('refresh_facility_statuses')

  let officersQuery = serviceClient
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .eq('role', 'ro')

  if (targetOwnerId) {
    officersQuery = officersQuery.eq('id', targetOwnerId) as typeof officersQuery
  }

  const { data: officers } = await officersQuery
  if (!officers?.length) return NextResponse.json({ message: 'No officers found', sent: 0 })

  const results = []

  for (const officer of officers) {
    const { data: expiring } = await serviceClient
      .from('facilities').select('*')
      .eq('owner_id', officer.id)
      .gte('days_remaining', 0).lte('days_remaining', 90)
      .order('days_remaining', { ascending: true })

    const { data: expired } = await serviceClient
      .from('facilities').select('*')
      .eq('owner_id', officer.id)
      .lt('days_remaining', 0)

    const allCount = (expiring?.length ?? 0) + (expired?.length ?? 0)
    if (allCount === 0) { results.push({ officer: officer.email, sent: false, reason: 'no expiring facilities' }); continue }

    const { success, error } = await sendFacilityAlert(officer, expiring ?? [], expired ?? [])

    await serviceClient.from('alert_log').insert({
      owner_id:       officer.id,
      recipient:      officer.alert_email || officer.email,
      facility_count: allCount,
      status:         success ? 'sent' : 'failed',
      error_msg:      error ?? null,
    })

    results.push({ officer: officer.email, sent: success, count: allCount })
  }

  return NextResponse.json({ success: true, results })
}
