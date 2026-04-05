import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendFacilityAlert } from '@/lib/email'

/**
 * Daily email alert cron job.
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/daily-alerts", "schedule": "0 7 * * *" }]
 * }
 *
 * The endpoint is protected by CRON_SECRET header.
 * Vercel automatically sets the Authorization header for cron jobs.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const results: { officer: string; sent: boolean; count: number; error?: string }[] = []

  try {
    // Refresh all facility statuses first (days_remaining + status columns)
    await supabase.rpc('refresh_facility_statuses')

    // Get all active R.O. profiles
    const { data: officers } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .eq('role', 'ro')

    if (!officers || officers.length === 0) {
      return NextResponse.json({ message: 'No active officers found', results: [] })
    }

    for (const officer of officers) {
      // Get their expiring + expired facilities (within 90 days, or already expired)
      const { data: expiring } = await supabase
        .from('facilities')
        .select('*')
        .eq('owner_id', officer.id)
        .gte('days_remaining', 0)
        .lte('days_remaining', 90)
        .order('days_remaining', { ascending: true })

      const { data: expired } = await supabase
        .from('facilities')
        .select('*')
        .eq('owner_id', officer.id)
        .lt('days_remaining', 0)
        .order('days_remaining', { ascending: true })

      const allFacilities = [...(expired ?? []), ...(expiring ?? [])]

      if (allFacilities.length === 0) {
        results.push({ officer: officer.email, sent: false, count: 0 })
        continue
      }

      const { success, error } = await sendFacilityAlert(officer, expiring ?? [], expired ?? [])

      // Log to alert_log table
      await supabase.from('alert_log').insert({
        owner_id:       officer.id,
        recipient:      officer.alert_email || officer.email,
        facility_count: allFacilities.length,
        status:         success ? 'sent' : 'failed',
        error_msg:      error ?? null,
      })

      results.push({
        officer: officer.email,
        sent:    success,
        count:   allFacilities.length,
        error,
      })
    }

    return NextResponse.json({
      message: 'Daily alerts processed',
      date:    new Date().toISOString(),
      results,
    })
  } catch (err: any) {
    console.error('[cron/daily-alerts] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
