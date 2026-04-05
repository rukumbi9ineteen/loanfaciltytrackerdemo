'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, User, ChevronDown, Menu } from 'lucide-react'
import Image from 'next/image'
import NotificationBell from './NotificationBell'
import type { Profile } from '@/types'

export default function TopBar({
  profile,
  onMenuClick,
}: {
  profile: Profile
  onMenuClick?: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile.full_name
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between gap-3">
      {/* Hamburger — only visible on mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition flex-shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      <div className="flex items-center gap-2 md:gap-3">
        <NotificationBell userId={profile.id} />

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 md:gap-2.5 px-2 md:px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            {/* Avatar */}
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name}
                width={32} height={32}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: '#034EA2' }}
              >
                {initials}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium leading-tight" style={{ color: '#011B39' }}>{profile.full_name}</p>
              <p className="text-xs text-gray-400 capitalize">{profile.role === 'admin' ? 'Administrator' : 'R.O.'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 z-20 py-1">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium" style={{ color: '#011B39' }}>{profile.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{profile.email}</p>
                </div>
                <a href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                   onClick={() => setMenuOpen(false)}>
                  <User className="w-4 h-4 text-gray-400" />
                  My Profile
                </a>
                <button onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
