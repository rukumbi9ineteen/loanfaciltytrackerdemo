'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, BarChart3,
  Settings, Users, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',   href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Facilities',  href: '/facilities', icon: FileText },
  { label: 'Reports',     href: '/reports',    icon: BarChart3 },
  { label: 'Admin Panel', href: '/admin',      icon: Users, adminOnly: true },
  { label: 'Settings',    href: '/settings',   icon: Settings },
]

export default function Sidebar({
  role,
  onClose,
}: {
  role: UserRole
  onClose?: () => void
}) {
  const pathname = usePathname()
  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || role === 'admin')

  return (
    <aside className="w-64 flex flex-col h-full" style={{ background: '#011B39' }}>
      {/* Brand / Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center">
            <Image src="/bk_logo.jpeg" alt="BK Logo" width={40} height={40} className="object-contain" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">Bk Loan Facility Expiration Tracker</p>
            <p className="text-xs mt-0.5" style={{ color: '#EB9C20' }}>
              {role === 'admin' ? 'Administrator' : 'Relationship Officer'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {visibleItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              )}
              style={isActive ? { background: '#034EA2' } : {}}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <p className="text-white/30 text-xs text-center">
          © {new Date().getFullYear()} Bank Of Kigali
        </p>
      </div>
    </aside>
  )
}
