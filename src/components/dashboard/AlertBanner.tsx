import { AlertOctagon, ShieldX } from 'lucide-react'

export default function AlertBanner({
  expired,
  critical,
  missingInsurance = 0,
  criticalInsurance = 0,
}: {
  expired: number
  critical: number
  missingInsurance?: number
  criticalInsurance?: number
}) {
  const facilityParts: string[] = []
  if (expired > 0)  facilityParts.push(`${expired} expired facilit${expired === 1 ? 'y' : 'ies'}`)
  if (critical > 0) facilityParts.push(`${critical} critical facilit${critical === 1 ? 'y' : 'ies'} expiring within 30 days`)

  const insuranceParts: string[] = []
  if (missingInsurance > 0)  insuranceParts.push(`${missingInsurance} facilit${missingInsurance === 1 ? 'y' : 'ies'} with no insurance`)
  if (criticalInsurance > 0) insuranceParts.push(`${criticalInsurance} insurance polic${criticalInsurance === 1 ? 'y' : 'ies'} expiring within 30 days`)

  const hasFacilityAlert   = facilityParts.length > 0
  const hasInsuranceAlert  = insuranceParts.length > 0

  return (
    <div className="space-y-2">
      {hasFacilityAlert && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Immediate Attention Required</p>
            <p className="text-sm text-red-700 mt-0.5">
              Your portfolio has {facilityParts.join(' and ')}. Please review and take action.
            </p>
          </div>
        </div>
      )}

      {hasInsuranceAlert && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldX className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Insurance Compliance Alert</p>
            <p className="text-sm text-orange-700 mt-0.5">
              Your portfolio has {insuranceParts.join(' and ')}. Uninsured facilities are a compliance risk.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
