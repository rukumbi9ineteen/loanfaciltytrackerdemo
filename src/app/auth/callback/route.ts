import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase Auth callback handler.
 * Supabase redirects here after password reset link is clicked.
 * We exchange the code for a session, then redirect to the reset-password page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/auth/reset-password'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=invalid_reset_link`)
}
