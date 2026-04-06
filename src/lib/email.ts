import { Resend } from 'resend'
import type { Facility, Profile, FacilityInsurance } from '@/types'
import { formatDate } from './utils'

type InsuranceWithFacility = FacilityInsurance & {
  facility: { facility_ref: string; customer_name: string; facility_type: string } | null
}

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
const BANK   = process.env.NEXT_PUBLIC_BANK_NAME ?? 'bank of kigali'

// ─────────────────────────────────────────────
// Build email HTML
// ─────────────────────────────────────────────

function buildEmailHtml(
  officer: Profile,
  expiring: Facility[],
  expired: Facility[],
  expiringIns: InsuranceWithFacility[] = [],
  missingIns: { facility_ref: string; customer_name: string }[] = []
): string {
  const allFacilities = [...expired, ...expiring]

  const tableRows = allFacilities.map(f => {
    const isExpired = f.status === 'EXPIRED'
    const rowBg    = isExpired ? '#fef2f2' : f.status === 'CRITICAL' ? '#fff7ed' : '#fefce8'
    const statusColor = isExpired ? '#dc2626' : f.status === 'CRITICAL' ? '#ea580c' : '#ca8a04'
    const daysText = isExpired
      ? `<span style="color:#dc2626;font-weight:600">${Math.abs(f.days_remaining)}d overdue</span>`
      : `<span style="color:${statusColor};font-weight:600">${f.days_remaining}d</span>`

    return `
      <tr style="background:${rowBg}">
        <td style="padding:10px 14px;font-family:monospace;font-size:12px;color:#6b7280">${f.facility_ref}</td>
        <td style="padding:10px 14px;font-weight:500;color:#111827">${f.customer_name}</td>
        <td style="padding:10px 14px;color:#374151">${f.facility_type}</td>
        <td style="padding:10px 14px;color:#374151">${formatDate(f.expiry_date)}</td>
        <td style="padding:10px 14px">${daysText}</td>
        <td style="padding:10px 14px"><span style="color:${statusColor};font-weight:600;font-size:12px">${f.status}</span></td>
      </tr>
    `
  }).join('')

  const expiredCount      = expired.length
  const criticalCount     = expiring.filter(f => f.status === 'CRITICAL').length
  const warningCount      = expiring.filter(f => f.status === 'WARNING').length
  const insExpiringCount  = expiringIns.length
  const insMissingCount   = missingIns.length

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:700px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

    <!-- Header -->
    <div style="background:#1e3a8a;padding:28px 32px">
      <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff">${BANK}</p>
      <p style="margin:6px 0 0;font-size:14px;color:#93c5fd">Loan Facility Expiry Alert</p>
    </div>

    <!-- Greeting -->
    <div style="padding:28px 32px 0">
      <p style="margin:0 0 8px;font-size:15px;color:#374151">Dear <strong>${officer.full_name}</strong>,</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6">
        This is your daily facility expiry alert. The following facilities in your portfolio require immediate attention.
      </p>

      <!-- Summary pills -->
      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
        ${expiredCount > 0 ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 16px">
          <p style="margin:0;font-size:20px;font-weight:700;color:#dc2626">${expiredCount}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#991b1b">Expired</p>
        </div>` : ''}
        ${criticalCount > 0 ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 16px">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ea580c">${criticalCount}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#9a3412">Critical (≤30d)</p>
        </div>` : ''}
        ${warningCount > 0 ? `<div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:10px 16px">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ca8a04">${warningCount}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#713f12">Warning (≤90d)</p>
        </div>` : ''}
        ${insExpiringCount > 0 ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 16px">
          <p style="margin:0;font-size:20px;font-weight:700;color:#c2410c">${insExpiringCount}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#9a3412">Ins. Expiring</p>
        </div>` : ''}
        ${insMissingCount > 0 ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 16px">
          <p style="margin:0;font-size:20px;font-weight:700;color:#dc2626">${insMissingCount}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#991b1b">No Insurance</p>
        </div>` : ''}
      </div>
    </div>

    <!-- Table -->
    <div style="padding:0 32px 28px">
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;border-bottom:1px solid #e5e7eb">Ref</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;border-bottom:1px solid #e5e7eb">Customer</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;border-bottom:1px solid #e5e7eb">Type</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;border-bottom:1px solid #e5e7eb">Expiry</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;border-bottom:1px solid #e5e7eb">Days</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;border-bottom:1px solid #e5e7eb">Status</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>

    ${expiringIns.length > 0 ? `
    <!-- Insurance Expiring Soon -->
    <div style="padding:0 32px 28px">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#c2410c">🛡️ Insurance Policies Expiring Soon</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #fed7aa;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#fff7ed">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9a3412;text-transform:uppercase;font-weight:600;border-bottom:1px solid #fed7aa">Facility</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9a3412;text-transform:uppercase;font-weight:600;border-bottom:1px solid #fed7aa">Provider</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9a3412;text-transform:uppercase;font-weight:600;border-bottom:1px solid #fed7aa">Type</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9a3412;text-transform:uppercase;font-weight:600;border-bottom:1px solid #fed7aa">Expiry</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9a3412;text-transform:uppercase;font-weight:600;border-bottom:1px solid #fed7aa">Days</th>
          </tr>
        </thead>
        <tbody>
          ${expiringIns.map(ins => `
          <tr style="background:${(ins.days_remaining ?? 0) <= 30 ? '#fff7ed' : '#fffbeb'}">
            <td style="padding:8px 12px;font-size:12px;color:#111827">
              <div style="font-weight:500">${ins.facility?.customer_name ?? '—'}</div>
              <div style="font-family:monospace;font-size:11px;color:#6b7280">${ins.facility?.facility_ref ?? '—'}</div>
            </td>
            <td style="padding:8px 12px;font-size:12px;color:#374151">${ins.provider}</td>
            <td style="padding:8px 12px;font-size:12px;color:#374151">${ins.insurance_type}</td>
            <td style="padding:8px 12px;font-size:12px;color:#374151">${formatDate(ins.expiry_date)}</td>
            <td style="padding:8px 12px;font-size:12px;font-weight:600;color:${(ins.days_remaining ?? 0) <= 30 ? '#ea580c' : '#ca8a04'}">${ins.days_remaining}d</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${missingIns.length > 0 ? `
    <!-- Missing Insurance -->
    <div style="padding:0 32px 28px">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#dc2626">⚠️ Facilities Missing Insurance (Compliance Risk)</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #fecaca;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#fef2f2">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#991b1b;text-transform:uppercase;font-weight:600;border-bottom:1px solid #fecaca">Ref</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#991b1b;text-transform:uppercase;font-weight:600;border-bottom:1px solid #fecaca">Customer</th>
          </tr>
        </thead>
        <tbody>
          ${missingIns.map(f => `
          <tr style="background:#fef2f2">
            <td style="padding:8px 12px;font-size:12px;font-family:monospace;color:#dc2626">${f.facility_ref}</td>
            <td style="padding:8px 12px;font-size:12px;font-weight:500;color:#111827">${f.customer_name}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="margin:8px 0 0;font-size:12px;color:#dc2626">Please add insurance to these facilities as soon as possible to remain compliant.</p>
    </div>
    ` : ''}

    <!-- Reminder -->
    <div style="background:#fffbeb;border-top:1px solid #fde68a;padding:16px 32px">
      <p style="margin:0;font-size:13px;color:#92400e;font-weight:600">📝 Daily Reminder</p>
      <p style="margin:6px 0 0;font-size:12px;color:#b45309;line-height:1.6">
        Please remember to add any new loan facilities processed yesterday into the Facility Tracker so your portfolio stays up to date.
        Keeping records current ensures timely renewals and avoids expiry surprises.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5">
        This is an automated daily alert from ${BANK} Facility Tracker.<br>
        Generated: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}<br>
        Please log into the Facility Tracker portal to renew or update these facilities.
      </p>
    </div>
  </div>
</body>
</html>
`
}

// ─────────────────────────────────────────────
// Transfer notification email
// ─────────────────────────────────────────────

export interface TransferEmailParams {
  recipientEmail:  string
  recipientName:   string
  role:            'old_owner' | 'new_owner' | 'admin'
  actorName:       string
  oldOwnerName:    string
  newOwnerName:    string
  facilityRef:     string
  customerName:    string
  facilityType:    string
  appUrl:          string
  facilityId?:     string   // for single transfer — links to the facility
  facilityCount?:  number   // for bulk transfer
}

function buildTransferEmailHtml(p: TransferEmailParams): string {
  const isBulk   = (p.facilityCount ?? 1) > 1
  const subject2 = isBulk
    ? `${p.facilityCount} facilities transferred`
    : `${p.customerName} (${p.facilityRef}) transferred`

  const roleMessage = {
    old_owner: `The following facilit${isBulk ? 'ies have' : 'y has'} been <strong>removed from your portfolio</strong> and reassigned to <strong>${p.newOwnerName}</strong>.`,
    new_owner: `The following facilit${isBulk ? 'ies have' : 'y has'} been <strong>added to your portfolio</strong> from <strong>${p.oldOwnerName}</strong>.`,
    admin:     `<strong>${p.actorName}</strong> transferred facilit${isBulk ? 'ies' : 'y'} from <strong>${p.oldOwnerName}</strong> to <strong>${p.newOwnerName}</strong>.`,
  }[p.role]

  const facilityBlock = isBulk
    ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;margin:0 0 20px">
        <p style="margin:0;font-size:28px;font-weight:700;color:#0369a1">${p.facilityCount}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#0c4a6e">Facilities transferred</p>
       </div>`
    : `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin:0 0 20px">
        <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;letter-spacing:.05em">Facility</p>
        <p style="margin:6px 0 2px;font-size:16px;font-weight:700;color:#0f172a">${p.customerName}</p>
        <p style="margin:0;font-size:12px;color:#64748b;font-family:monospace">${p.facilityRef} &nbsp;·&nbsp; ${p.facilityType}</p>
       </div>`

  const ctaButton = (p.facilityId && !isBulk)
    ? `<div style="text-align:center;margin:24px 0">
         <a href="${p.appUrl}/facilities/${p.facilityId}"
            style="background:#034EA2;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;display:inline-block">
           View Facility →
         </a>
       </div>`
    : `<div style="text-align:center;margin:24px 0">
         <a href="${p.appUrl}/facilities"
            style="background:#034EA2;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;display:inline-block">
           View My Portfolio →
         </a>
       </div>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">

    <div style="background:#011B39;padding:24px 32px">
      <p style="margin:0;font-size:18px;font-weight:700;color:#fff">${BANK}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#93c5fd">Facility Transfer Notification</p>
    </div>

    <div style="padding:28px 32px">
      <p style="margin:0 0 12px;font-size:15px;color:#374151">Dear <strong>${p.recipientName}</strong>,</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6">${roleMessage}</p>

      ${facilityBlock}

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:8px 0;font-size:12px;color:#94a3b8;width:40%">Transferred from</td>
          <td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a">${p.oldOwnerName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;color:#94a3b8">Transferred to</td>
          <td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a">${p.newOwnerName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;color:#94a3b8">Action by</td>
          <td style="padding:8px 0;font-size:13px;color:#374151">${p.actorName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;color:#94a3b8">Date</td>
          <td style="padding:8px 0;font-size:13px;color:#374151">${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</td>
        </tr>
      </table>

      ${ctaButton}
    </div>

    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:11px;color:#9ca3af">
        This is an automated message from ${BANK} Facility Tracker. Please do not reply.
      </p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Send transfer notification emails to old owner, new owner, and all admins.
 * Each gets a personalised message based on their role.
 */
export async function sendTransferEmails(params: {
  actorName:    string
  oldOwner:     { email: string; alert_email: string | null; full_name: string }
  newOwner:     { email: string; alert_email: string | null; full_name: string }
  admins:       { email: string; alert_email: string | null; full_name: string; id: string }[]
  oldOwnerId:   string
  newOwnerId:   string
  // Single transfer
  facilityRef?:    string
  customerName?:   string
  facilityType?:   string
  facilityId?:     string
  // Bulk transfer
  facilityCount?:  number
}): Promise<void> {
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const isBulk    = (params.facilityCount ?? 1) > 1
  const ref       = params.facilityRef  ?? `${params.facilityCount} facilities`
  const customer  = params.customerName ?? `${params.facilityCount} facilities`
  const facType   = params.facilityType ?? ''

  const base: Omit<TransferEmailParams, 'recipientEmail' | 'recipientName' | 'role'> = {
    actorName:    params.actorName,
    oldOwnerName: params.oldOwner.full_name,
    newOwnerName: params.newOwner.full_name,
    facilityRef:  ref,
    customerName: customer,
    facilityType: facType,
    facilityId:   params.facilityId,
    facilityCount: params.facilityCount,
    appUrl,
  }

  const subjectSuffix = isBulk
    ? `${params.facilityCount} Facilit${params.facilityCount === 1 ? 'y' : 'ies'} Transferred`
    : `Facility Transfer: ${customer} (${ref})`

  // Build recipient list: old owner, new owner, admins (dedup by email)
  type Recipient = { email: string; name: string; role: TransferEmailParams['role'] }
  const recipients: Recipient[] = []

  recipients.push({
    email: params.oldOwner.alert_email || params.oldOwner.email,
    name:  params.oldOwner.full_name,
    role:  'old_owner',
  })
  recipients.push({
    email: params.newOwner.alert_email || params.newOwner.email,
    name:  params.newOwner.full_name,
    role:  'new_owner',
  })

  // Add admins who are not already the old/new owner
  for (const admin of params.admins) {
    const adminEmail = admin.alert_email || admin.email
    const alreadyAdded = recipients.some(r => r.email === adminEmail)
    if (!alreadyAdded) {
      recipients.push({ email: adminEmail, name: admin.full_name, role: 'admin' })
    }
  }

  // Send all emails (fire-and-forget per recipient, don't block on failures)
  await Promise.allSettled(
    recipients.map(r =>
      resend.emails.send({
        from:    FROM,
        to:      r.email,
        subject: `[${BANK}] ${subjectSuffix}`,
        html:    buildTransferEmailHtml({ ...base, recipientEmail: r.email, recipientName: r.name, role: r.role }),
      })
    )
  )
}

// ─────────────────────────────────────────────
// Send alert for a single officer
// ─────────────────────────────────────────────

export async function sendFacilityAlert(
  officer: Profile,
  expiring: Facility[],
  expired: Facility[],
  expiringIns: InsuranceWithFacility[] = [],
  missingIns: { facility_ref: string; customer_name: string }[] = []
): Promise<{ success: boolean; error?: string }> {
  const recipient = officer.alert_email || officer.email
  const allCount  = expiring.length + expired.length + expiringIns.length + missingIns.length

  if (allCount === 0) {
    return { success: true }  // nothing to send
  }

  const parts: string[] = []
  if (expired.length > 0)   parts.push(`${expired.length} expired`)
  if (expiring.filter(f => f.status === 'CRITICAL').length > 0)
    parts.push(`${expiring.filter(f => f.status === 'CRITICAL').length} critical`)
  if (expiring.filter(f => f.status === 'WARNING').length > 0)
    parts.push(`${expiring.filter(f => f.status === 'WARNING').length} warning`)
  if (expiringIns.length > 0)  parts.push(`${expiringIns.length} insurance expiring`)
  if (missingIns.length > 0)   parts.push(`${missingIns.length} missing insurance`)

  const subject = `[${BANK}] Daily Alert: ${parts.join(', ')}`

  try {
    await resend.emails.send({
      from: FROM,
      to:   recipient,
      subject,
      html: buildEmailHtml(officer, expiring, expired, expiringIns, missingIns),
    })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
