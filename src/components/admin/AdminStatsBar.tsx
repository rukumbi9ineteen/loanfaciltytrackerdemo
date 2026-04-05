interface Props {
  stats: {
    totalROs: number
    totalFacs: number
    expired: number
    critical: number
  }
}

export default function AdminStatsBar({ stats }: Props) {
  const items = [
    { label: 'Relationship Officers', value: stats.totalROs, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Total Facilities', value: stats.totalFacs, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
    { label: 'Expired', value: stats.expired, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    { label: 'Critical (≤30d)', value: stats.critical, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(item => (
        <div key={item.label} className={`${item.bg} border ${item.border} rounded-2xl p-5`}>
          <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
          <p className="text-xs text-gray-500 mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
