import { AlertOctagon } from 'lucide-react'

export default function AlertBanner({
  expired,
  critical,
}: {
  expired: number
  critical: number
}) {
  const parts = []
  if (expired > 0) parts.push(`${expired} expired facilit${expired === 1 ? 'y' : 'ies'}`)
  if (critical > 0) parts.push(`${critical} critical facilit${critical === 1 ? 'y' : 'ies'} expiring within 30 days`)

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-800">Immediate Attention Required</p>
        <p className="text-sm text-red-700 mt-0.5">
          Your portfolio has {parts.join(' and ')}. Please review and take action.
        </p>
      </div>
    </div>
  )
}
