'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

const TYPE_ICONS: Record<Notification['type'], string> = {
  facility_added:       '➕',
  facility_renewed:     '🔄',
  facility_deleted:     '🗑️',
  alert_sent:           '📧',
  facility_transferred: '🔀',
  insurance_added:      '🛡️',
  insurance_renewed:    '🛡️',
  insurance_deleted:    '⚠️',
}

export default function NotificationBell({ userId }: { userId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.is_read).length

  const load = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)                          // preview: only latest 5
    if (data) setNotifications(data as Notification[])
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('notifications-bell')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 5))
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        load()   // re-fetch when read-state changes
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const markAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const goToInbox = () => {
    setOpen(false)
    router.push('/notifications')
  }

  const formatTime = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
    if (diff < 60)    return 'Just now'
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span
            className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
            style={{ background: '#EB9C20' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Dropdown panel */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-20 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm" style={{ color: '#011B39' }}>
                Recent Notifications
                {unread > 0 && (
                  <span className="ml-1.5 text-[#034EA2]">({unread} new)</span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-[#034EA2] hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Preview list — max 5, each item links to full inbox */}
            <div className="divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No notifications yet
                </div>
              ) : (
                notifications.map(n => (
                  <Link
                    key={n.id}
                    href="/notifications"
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors hover:bg-[#034EA2]/5 cursor-pointer',
                      !n.is_read && 'bg-blue-50/50'
                    )}
                  >
                    <div className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm leading-snug',
                        !n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'
                      )}>
                        {n.title}
                      </p>
                      {/* Body preview — 2 lines max */}
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: '#034EA2' }}
                      />
                    )}
                  </Link>
                ))
              )}
            </div>

            {/* Footer — opens full inbox */}
            <div className="border-t border-gray-100">
              <button
                onClick={goToInbox}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold transition hover:bg-gray-50"
                style={{ color: '#034EA2' }}
              >
                Open notification inbox
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
