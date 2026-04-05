'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Warn user 2 minutes before expiry
const IDLE_TIMEOUT_MS  = 30 * 60 * 1000  // 30 minutes
const WARN_BEFORE_MS   = 2  * 60 * 1000  // warn 2 min before logout
const WARN_AT_MS       = IDLE_TIMEOUT_MS - WARN_BEFORE_MS

// Events that count as "activity"
const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'keydown',
  'touchstart', 'scroll', 'click',
] as const

export default function InactivityGuard() {
  const router    = useRouter()
  const supabase  = createClient()
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARN_BEFORE_MS / 1000)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAll = () => {
    if (timerRef.current)    clearTimeout(timerRef.current)
    if (warnRef.current)     clearTimeout(warnRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }

  const logout = async () => {
    clearAll()
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/login?reason=session_expired')
  }

  const resetTimers = () => {
    clearAll()
    setShowWarning(false)

    // Schedule warning
    warnRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(WARN_BEFORE_MS / 1000)

      // Countdown display
      countdownRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, WARN_AT_MS)

    // Schedule actual logout
    timerRef.current = setTimeout(logout, IDLE_TIMEOUT_MS)
  }

  useEffect(() => {
    // Start timers
    resetTimers()

    // Listen for activity
    const handler = () => resetTimers()
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, handler, { passive: true }))

    return () => {
      clearAll()
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, handler))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 p-6 w-full max-w-sm">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold"
          style={{ background: '#FEF3C7', color: '#92400E' }}
        >
          {secondsLeft}
        </div>
        <h3 className="text-center font-semibold text-gray-900 mb-1">Still there?</h3>
        <p className="text-center text-sm text-gray-500 mb-5">
          You&apos;ve been inactive. For your security, you will be automatically signed out in{' '}
          <strong>{secondsLeft} second{secondsLeft !== 1 ? 's' : ''}</strong>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={logout}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Sign out now
          </button>
          <button
            onClick={resetTimers}
            className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition"
            style={{ background: '#034EA2' }}
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  )
}
