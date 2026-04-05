import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Authenticate calling user
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Must be admin
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, full_name, role, branch, phone, alert_email } = body

    // Use service role client to create the auth user
    const serviceClient = createServiceClient()
    const { data: newUser, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // auto-confirm so no email verification needed
      user_metadata: { full_name, role },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // The trigger auto-creates the profile, but we update extra fields
    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({ full_name, role, branch: branch || null, phone: phone || null, alert_email: alert_email || null })
      .eq('id', newUser.user!.id)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: newUser.user!.id })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
