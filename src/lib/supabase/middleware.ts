import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Max inactivity before the server forces a sign-out on next page load (8 hours)
// The client-side InactivityGuard handles the 30-minute soft timeout with a warning.
const MAX_IDLE_MS    = 8 * 60 * 60 * 1000   // 8 hours in ms
const ACTIVITY_COOKIE = 'bk_last_active'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ─── Public paths (no auth required) ───
  const isPublicPath =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth/') ||
    request.nextUrl.pathname.startsWith('/api/cron')

  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  if (user && request.nextUrl.pathname === '/login') {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  // ─── Session idle enforcement for authenticated pages ───
  if (user && !isPublicPath) {
    const now       = Date.now()
    const cookieVal = request.cookies.get(ACTIVITY_COOKIE)?.value
    const lastActive = cookieVal ? parseInt(cookieVal, 10) : null

    if (lastActive !== null && now - lastActive > MAX_IDLE_MS) {
      // User has been idle too long — force sign-out and redirect
      await supabase.auth.signOut()
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('reason', 'session_expired')
      const redirectResponse = NextResponse.redirect(loginUrl)
      redirectResponse.cookies.delete(ACTIVITY_COOKIE)
      return redirectResponse
    }

    // Record/refresh the last-active timestamp (30-day cookie, never expires by itself;
    // we use the timestamp comparison above instead of cookie max-age expiry)
    response.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      sameSite: 'lax',
      secure:   process.env.NODE_ENV === 'production',
      maxAge:   30 * 24 * 60 * 60,  // 30 days (we expire via timestamp logic, not the cookie itself)
      path:     '/',
    })
  }

  return response
}
