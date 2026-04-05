import { TrendingUp, AlertTriangle, AlertOctagon, CheckCircle2, XCircle } from 'lucide-react'
import type { DashboardStats } from '@/types'

const CARDS = [
  {
    key: 'total' as const,
    label: 'Total Facilities',
    icon: TrendingUp,
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    border: 'border-blue-200',
    value: (s: DashboardStats) => s.total,
  },
  {
    key: 'active' as const,
    label: 'Active',
    icon: CheckCircle2,
    bg: 'bg-green-50',
    iconColor: 'text-green-600',
    border: 'border-green-200',
    value: (s: DashboardStats) => s.active,
  },
  {
    key: 'warning' as const,
    label: 'Warning (≤90 days)',
    icon: AlertTriangle,
    bg: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    border: 'border-yellow-200',
    value: (s: DashboardStats) => s.warning,
  },
  {
    key: 'critical' as const,
    label: 'Critical (≤30 days)',
    icon: AlertOctagon,
    bg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    border: 'border-orange-200',
    value: (s: DashboardStats) => s.critical,
  },
  {
    key: 'expired' as const,
    label: 'Expired',
    icon: XCircle,
    bg: 'bg-red-50',
    iconColor: 'text-red-600',
    border: 'border-red-200',
    value: (s: DashboardStats) => s.expired,
  },
]

export default function StatsCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {CARDS.map(card => {
        const Icon = card.icon
        const count = card.value(stats)
        return (
          <div
            key={card.key}
            className={`${card.bg} border ${card.border} rounded-2xl p-5 flex flex-col gap-3`}
          >
            <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm`}>
              <Icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
