import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const BANK   = process.env.NEXT_PUBLIC_BANK_NAME ?? 'Your Bank'
const FROM   = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(request: NextRequest) {
  // Verify caller is admin
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: myProfile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { target_user_id } = await request.json()
  if (!target_user_id) return NextResponse.json({ error: 'target_user_id required' }, { status: 400 })

  const serviceClient = createServiceClient()

  // Get target user profile
  const { data: targetProfile } = await serviceClient
    .from('profiles').select('full_name, email').eq('id', target_user_id).single()
  if (!targetProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Generate Supabase password recovery link
  const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: 'recovery',
    email: targetProfile.email,
    options: {
      redirectTo: `${APP_URL}/auth/callback?next=/auth/reset-password`,
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json(
      { error: linkError?.message ?? 'Failed to generate reset link' },
      { status: 500 }
    )
  }

  const resetLink = linkData.properties.action_link

  // Send via Resend
  const { error: emailError } = await resend.emails.send({
    from: FROM,
    to:   targetProfile.email,
    subject: `[${BANK}] Password Reset Request`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:#011B39;padding:24px 32px">
      <p style="margin:0;font-size:18px;font-weight:700;color:#fff">${BANK}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#93c5fd">Password Reset</p>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#374151">Dear <strong>${targetProfile.full_name}</strong>,</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6">
        Your system administrator (<strong>${myProfile.full_name}</strong>) has initiated a password reset for your account.
        Click the button below to set a new password.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${resetLink}"
           style="background:#034EA2;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 32px;border-radius:8px;display:inline-block">
          Reset My Password
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
        This link is valid for <strong>24 hours</strong> and can only be used once.<br>
        If you did not request this, please contact your administrator immediately.<br><br>
        Or copy this URL: <span style="color:#034EA2;word-break:break-all">${resetLink}</span>
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:11px;color:#9ca3af">© ${new Date().getFullYear()} ${BANK} — Confidential</p>
    </div>
  </div>
</body>
</html>`,
  })

  if (emailError) {
    return NextResponse.json({ error: 'Reset link generated but email failed: ' + emailError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, email: targetProfile.email })
}
