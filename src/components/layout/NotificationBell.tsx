'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

const TYPE_ICONS: Record<Notification['type'], string> = {
  facility_added:   '➕',
  facility_renewed: '🔄',
  facility_deleted: '🗑️',
  alert_sent:       '📧',
}

export default function NotificationBell({ userId }: { userId: string }) {
  const supabase = createClient()
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
      .limit(20)
    if (data) setNotifications(data as Notification[])
  }

  useEffect(() => {
    load()
    // Realtime subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const formatTime = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
    if (diff < 60)   return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition"
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
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm" style={{ color: '#011B39' }}>
                Notifications {unread > 0 && <span className="text-[#034EA2]">({unread})</span>}
              </h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-[#034EA2] hover:underline flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No notifications yet
                </div>
              ) : (
                notifications.map(n => {
                  const inner = (
                    <div className={cn(
                      'px-4 py-3 flex gap-3 transition-colors',
                      !n.is_read && 'bg-blue-50/50',
                      n.facility_id ? 'hover:bg-[#034EA2]/5 cursor-pointer' : 'hover:bg-gray-50',
                    )}>
                      <div className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type]}</div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm leading-snug', !n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700')}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#034EA2' }} />
                      )}
                    </div>
                  )

                  return n.facility_id ? (
                    <Link
                      key={n.id}
                      href={`/facilities/${n.facility_id}`}
                      onClick={() => setOpen(false)}
                      className="block"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
