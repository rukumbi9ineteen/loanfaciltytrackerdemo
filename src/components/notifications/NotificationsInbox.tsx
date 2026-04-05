'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCheck, Trash2, ExternalLink, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

const TYPE_ICONS: Record<Notification['type'], string> = {
  facility_added:       '➕',
  facility_renewed:     '🔄',
  facility_deleted:     '🗑️',
  alert_sent:           '📧',
  facility_transferred: '🔀',
}

const TYPE_LABELS: Record<Notification['type'], string> = {
  facility_added:       'Added',
  facility_renewed:     'Renewed',
  facility_deleted:     'Deleted',
  alert_sent:           'Alert',
  facility_transferred: 'Transferred',
}

const TYPE_BADGE_COLORS: Record<Notification['type'], string> = {
  facility_added:       'bg-green-50 text-green-700 ring-green-200',
  facility_renewed:     'bg-blue-50 text-blue-700 ring-blue-200',
  facility_deleted:     'bg-red-50 text-red-700 ring-red-200',
  alert_sent:           'bg-amber-50 text-amber-700 ring-amber-200',
  facility_transferred: 'bg-purple-50 text-purple-700 ring-purple-200',
}

type FilterTab = 'all' | 'unread' | 'facilities' | 'alerts'

const FACILITY_TYPES: Notification['type'][] = [
  'facility_added', 'facility_renewed', 'facility_deleted', 'facility_transferred',
]

export default function NotificationsInbox({
  userId,
  initialNotifications,
}: {
  userId: string
  initialNotifications: Notification[]
}) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [markingRead, setMarkingRead] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Real-time: new inserts + mark-as-read updates
  useEffect(() => {
    const channel = supabase
      .channel('notifications-inbox')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifications(prev =>
          prev.map(n => n.id === (payload.new as Notification).id ? (payload.new as Notification) : n)
        )
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifications(prev => prev.filter(n => n.id !== (payload.old as Notification).id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const refresh = async () => {
    setRefreshing(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setNotifications(data as Notification[])
    setRefreshing(false)
  }

  const markAllRead = async () => {
    setMarkingRead(true)
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setMarkingRead(false)
  }

  const markOneRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const clearRead = async () => {
    if (!confirm('Remove all read notifications from your inbox?')) return
    setClearing(true)
    await fetch('/api/notifications', { method: 'DELETE' })
    setNotifications(prev => prev.filter(n => !n.is_read))
    setClearing(false)
  }

  const formatTime = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
    if (diff < 60)         return 'Just now'
    if (diff < 3600)       return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400)      return `${Math.floor(diff / 3600)}h ago`
    if (diff < 86400 * 7)  return `${Math.floor(diff / 86400)}d ago`
    return new Date(ts).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const formatFullDate = (ts: string) =>
    new Date(ts).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const filtered = notifications.filter(n => {
    if (activeFilter === 'unread')     return !n.is_read
    if (activeFilter === 'facilities') return FACILITY_TYPES.includes(n.type)
    if (activeFilter === 'alerts')     return n.type === 'alert_sent'
    return true
  })

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',        label: 'All',        count: notifications.length },
    { key: 'unread',     label: 'Unread',     count: unreadCount },
    { key: 'facilities', label: 'Facilities', count: notifications.filter(n => FACILITY_TYPES.includes(n.type)).length },
    { key: 'alerts',     label: 'Alerts',     count: notifications.filter(n => n.type === 'alert_sent').length },
  ]

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold" style={{ color: '#011B39' }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: '#034EA2' }}
              >
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'You're all caught up!'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingRead}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">All read</span>
            </button>
          )}

          {notifications.some(n => n.is_read) && (
            <button
              onClick={clearRead}
              disabled={clearing}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-500 transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear read</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-0 mb-5 border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
              activeFilter === tab.key
                ? 'border-[#034EA2] text-[#034EA2]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-medium',
                activeFilter === tab.key
                  ? 'bg-[#034EA2]/10 text-[#034EA2]'
                  : 'bg-gray-100 text-gray-500'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Notification cards ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium text-base">No notifications here</p>
            <p className="text-gray-400 text-sm mt-1">
              {activeFilter === 'unread'
                ? "You've read everything — nice work!"
                : 'Nothing to show for this filter.'}
            </p>
          </div>
        ) : (
          filtered.map(n => (
            <div
              key={n.id}
              className={cn(
                'rounded-xl border transition-all',
                !n.is_read
                  ? 'bg-blue-50/50 border-blue-100 shadow-sm'
                  : 'bg-white border-gray-100'
              )}
            >
              <div className="p-4 flex gap-3">
                {/* Type emoji */}
                <div className="text-2xl flex-shrink-0 mt-0.5 select-none">
                  {TYPE_ICONS[n.type]}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex flex-wrap items-start gap-2 justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn(
                        'text-sm leading-snug',
                        !n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                      )}>
                        {n.title}
                      </p>
                      <span className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded ring-1 uppercase tracking-wide',
                        TYPE_BADGE_COLORS[n.type]
                      )}>
                        {TYPE_LABELS[n.type]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span title={formatFullDate(n.created_at)} className="text-xs text-gray-400 whitespace-nowrap">
                        {formatTime(n.created_at)}
                      </span>
                      {!n.is_read && (
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#034EA2' }} />
                      )}
                    </div>
                  </div>

                  {/* Full body — never truncated */}
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    {n.body}
                  </p>

                  {/* Footer actions */}
                  <div className="flex items-center gap-3 mt-3">
                    {n.facility_id && (
                      <Link
                        href={`/facilities/${n.facility_id}`}
                        onClick={() => { if (!n.is_read) markOneRead(n.id) }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                        style={{ background: '#034EA2', color: '#fff' }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Facility
                      </Link>
                    )}
                    {!n.is_read && (
                      <button
                        onClick={() => markOneRead(n.id)}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#034EA2] transition"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Unread bottom strip */}
              {!n.is_read && (
                <div
                  className="h-0.5 rounded-b-xl"
                  style={{ background: 'linear-gradient(90deg, #034EA2, #EB9C20)' }}
                />
              )}
            </div>
          ))
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-8">
          Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
