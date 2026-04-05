import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createNotifications } from '@/lib/notifications'
import { sendTransferEmails } from '@/lib/email'

/**
 * POST /api/admin/transfer-facility
 *
 * Body (single):  { facility_id: string,  new_owner_id: string }
 * Body (bulk):    { from_owner_id: string, new_owner_id: string }
 *
 * Admin-only. Transfers one or all facilities from one R.O. to another,
 * then sends in-app notifications AND emails to all parties.
 */
export async function POST(request: NextRequest) {
  // ── Auth check ──
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: myProfile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { facility_id, from_owner_id, new_owner_id } = body

  if (!new_owner_id) {
    return NextResponse.json({ error: 'new_owner_id is required' }, { status: 400 })
  }
  if (!facility_id && !from_owner_id) {
    return NextResponse.json({ error: 'Either facility_id or from_owner_id is required' }, { status: 400 })
  }

  const serviceClient = createServiceClient()
  const actorName = myProfile?.full_name ?? 'An admin'

  // ── Fetch new owner profile ──
  const { data: newOwner } = await serviceClient
    .from('profiles')
    .select('id, full_name, email, alert_email')
    .eq('id', new_owner_id)
    .single()
  if (!newOwner) return NextResponse.json({ error: 'New owner not found' }, { status: 404 })

  // ── Fetch all admins (for notifications + emails) ──
  const { data: admins } = await serviceClient
    .from('profiles')
    .select('id, full_name, email, alert_email')
    .eq('role', 'admin')
    .eq('is_active', true)
  const adminList = (admins ?? []) as { id: string; full_name: string; email: string; alert_email: string | null }[]
  const adminIds  = adminList.map(a => a.id)

  // ════════════════════════════════════════════
  // SINGLE facility transfer
  // ════════════════════════════════════════════
  if (facility_id) {
    const { data: facility } = await serviceClient
      .from('facilities').select('*').eq('id', facility_id).single()
    if (!facility) return NextResponse.json({ error: 'Facility not found' }, { status: 404 })

    const oldOwnerId = facility.owner_id

    // Fetch old owner profile
    const { data: oldOwner } = await serviceClient
      .from('profiles')
      .select('id, full_name, email, alert_email')
      .eq('id', oldOwnerId)
      .single()
    const oldOwnerName = oldOwner?.full_name ?? 'Previous R.O.'

    // Update owner
    const { error } = await serviceClient
      .from('facilities').update({ owner_id: new_owner_id }).eq('id', facility_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // In-app notifications
    const notifyIds = Array.from(new Set([oldOwnerId, new_owner_id, ...adminIds]))
    await createNotifications({
      userIds:    notifyIds,
      title:      `${actorName} transferred a facility`,
      body:       `${facility.customer_name} — ${facility.facility_type} (${facility.facility_ref}) transferred from ${oldOwnerName} to ${newOwner.full_name}`,
      type:       'facility_transferred',
      facilityId: facility_id,
    })

    // Emails — fire-and-forget (don't fail the request if email fails)
    if (oldOwner) {
      sendTransferEmails({
        actorName,
        oldOwner,
        newOwner,
        admins:      adminList,
        oldOwnerId,
        newOwnerId:  new_owner_id,
        facilityRef: facility.facility_ref,
        customerName: facility.customer_name,
        facilityType: facility.facility_type,
        facilityId:  facility_id,
      }).catch(() => {/* swallow email errors so transfer still succeeds */})
    }

    return NextResponse.json({ success: true, transferred: 1 })
  }

  // ════════════════════════════════════════════
  // BULK transfer — all facilities from one R.O.
  // ════════════════════════════════════════════
  const { data: facilities } = await serviceClient
    .from('facilities').select('id, customer_name, facility_type, facility_ref')
    .eq('owner_id', from_owner_id)

  if (!facilities || facilities.length === 0) {
    return NextResponse.json({ success: true, transferred: 0 })
  }

  // Fetch old owner profile
  const { data: oldOwner } = await serviceClient
    .from('profiles')
    .select('id, full_name, email, alert_email')
    .eq('id', from_owner_id)
    .single()
  const oldOwnerName = oldOwner?.full_name ?? 'Previous R.O.'

  // Bulk update
  const { error } = await serviceClient
    .from('facilities').update({ owner_id: new_owner_id }).eq('owner_id', from_owner_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // In-app notifications
  const notifyIds = Array.from(new Set([from_owner_id, new_owner_id, ...adminIds]))
  await createNotifications({
    userIds: notifyIds,
    title:   `${actorName} transferred ${facilities.length} facilit${facilities.length === 1 ? 'y' : 'ies'}`,
    body:    `All ${facilities.length} facilit${facilities.length === 1 ? 'y' : 'ies'} from ${oldOwnerName} transferred to ${newOwner.full_name}`,
    type:    'facility_transferred',
  })

  // Emails
  if (oldOwner) {
    sendTransferEmails({
      actorName,
      oldOwner,
      newOwner,
      admins:        adminList,
      oldOwnerId:    from_owner_id,
      newOwnerId:    new_owner_id,
      facilityCount: facilities.length,
    }).catch(() => {/* swallow */})
  }

  return NextResponse.json({ success: true, transferred: facilities.length })
}
