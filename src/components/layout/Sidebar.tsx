'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  Users,
  Building2,
  ChevronRight,
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
  { label: 'Dashboard',   href: '/dashboard',   icon: LayoutDashboard },
  { label: 'Facilities',  href: '/facilities',  icon: FileText },
  { label: 'Reports',     href: '/reports',     icon: BarChart3 },
  { label: 'Admin Panel', href: '/admin',       icon: Users,          adminOnly: true },
  { label: 'Settings',    href: '/settings',    icon: Settings },
]

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter(
    item => !item.adminOnly || role === 'admin'
  )

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col h-full">
      {/* Brand */}
      <div className="p-5 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Facility Tracker</p>
            <p className="text-blue-300 text-xs capitalize">{role === 'admin' ? 'Administrator' : 'Relationship Officer'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {visibleItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-blue-800">
        <p className="text-blue-400 text-xs text-center">
          © {new Date().getFullYear()} Facility Tracker
        </p>
      </div>
    </aside>
  )
}
