import Link from 'next/link'
import { User, Mail, MapPin, Shield } from 'lucide-react'
import type { Profile } from '@/types'

interface FacilityStats {
  total: number
  expired: number
  critical: number
  warning: number
}

interface Props {
  profile: Profile
  facilityStats: FacilityStats
}

export default function AdminUserCard({ profile, facilityStats }: Props) {
  const initials = profile.full_name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const hasIssues = facilityStats.expired > 0 || facilityStats.critical > 0

  return (
    <div className={`bg-white rounded-2xl border ${hasIssues ? 'border-red-200' : 'border-gray-200'} p-5 flex flex-col gap-4`}>
      {/* User header */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          profile.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate">{profile.full_name}</p>
            {profile.role === 'admin' && (
              <span className="flex items-center gap-0.5 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full font-medium">
                <Shield className="w-3 h-3" />
                Admin
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{profile.email}</p>
        </div>
        <div className={`w-2 h-2 rounded-full mt-1.5 ${profile.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
             title={profile.is_active ? 'Active' : 'Inactive'} />
      </div>

      {/* Meta */}
      {profile.branch && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5" />
          {profile.branch}
        </div>
      )}

      {/* Facility stats */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Total', value: facilityStats.total, cls: 'text-gray-700' },
          { label: 'Warning', value: facilityStats.warning, cls: 'text-yellow-600' },
          { label: 'Critical', value: facilityStats.critical, cls: 'text-orange-600' },
          { label: 'Expired', value: facilityStats.expired, cls: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-lg py-2">
            <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Link
          href={`/admin/users/${profile.id}`}
          className="flex-1 text-center text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg py-2 transition-colors"
        >
          View Profile
        </Link>
        {facilityStats.total > 0 && (
          <Link
            href={`/facilities?owner=${profile.id}`}
            className="flex-1 text-center text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg py-2 transition-colors"
          >
            View Facilities
          </Link>
        )}
      </div>
    </div>
  )
}
