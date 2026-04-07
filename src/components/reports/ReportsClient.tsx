'use client'

import { useState } from 'react'
import { cn, formatDate, STATUS_COLORS } from '@/lib/utils'
import { FileDown, Printer, ShieldCheck, ShieldX } from 'lucide-react'
import type { FacilityStatus } from '@/types'
import type { FacilityWithInsurance } from '@/app/(authenticated)/reports/page'

type FilterType = 'ALL' | 'EXPIRING_90' | 'EXPIRING_30' | 'EXPIRED' | 'MISSING_INS' | 'INS_EXPIRING'

interface Props {
  facilities: FacilityWithInsurance[]
  officerName: string
  bankName: string
}

/** Returns the most critical insurance policy for a facility (soonest to expire / already expired). */
function primaryInsurance(f: FacilityWithInsurance) {
  if (!f.insurance || f.insurance.length === 0) return null
  return [...f.insurance].sort((a, b) => (a.days_remaining ?? 0) - (b.days_remaining ?? 0))[0]
}

const INS_STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'bg-green-50 text-green-700 border-green-200',
  WARNING:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  CRITICAL: 'bg-orange-50 text-orange-700 border-orange-200',
  EXPIRED:  'bg-red-50 text-red-700 border-red-200',
}

export default function ReportsClient({ facilities, officerName, bankName }: Props) {
  const [filter, setFilter] = useState<FilterType>('EXPIRING_90')
  const [exporting, setExporting] = useState(false)

  const filtered = facilities.filter(f => {
    const ins = primaryInsurance(f)
    switch (filter) {
      case 'EXPIRING_90':  return f.days_remaining >= 0 && f.days_remaining <= 90
      case 'EXPIRING_30':  return f.days_remaining >= 0 && f.days_remaining <= 30
      case 'EXPIRED':      return f.days_remaining < 0
      case 'MISSING_INS':  return !ins
      case 'INS_EXPIRING': return !!ins && (ins.days_remaining ?? 0) >= 0 && (ins.days_remaining ?? 0) <= 90
      default:             return true
    }
  })

  const filterLabels: Record<FilterType, string> = {
    ALL:          'All Facilities',
    EXPIRING_90:  'Expiring in 90 Days',
    EXPIRING_30:  'Expiring in 30 Days',
    EXPIRED:      'Expired Facilities',
    MISSING_INS:  'Missing Insurance',
    INS_EXPIRING: 'Insurance Expiring (90d)',
  }

  // ── PDF export ──────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      // Header
      doc.setFontSize(16)
      doc.setTextColor(30, 58, 138)
      doc.text(bankName, 14, 15)

      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      doc.text(`Loan Facility Report — ${filterLabels[filter]}`, 14, 23)

      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text(
        `Generated: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        14, 29
      )
      doc.text(`Officer: ${officerName}`, 14, 34)
      doc.text(`Total: ${filtered.length} facilit${filtered.length === 1 ? 'y' : 'ies'}`, 14, 39)

      autoTable(doc, {
        startY: 44,
        head: [[
          'Ref', 'Customer', 'Facility Type', 'Expiry', 'Days', 'Status',
          'Ins. Provider', 'Policy #', 'Ins. Type', 'Ins. Expiry', 'Ins. Days', 'Ins. Status',
        ]],
        body: filtered.map(f => {
          const ins = primaryInsurance(f)
          return [
            f.facility_ref,
            f.customer_name,
            f.facility_type,
            formatDate(f.expiry_date),
            f.days_remaining < 0
              ? `${Math.abs(f.days_remaining)}d overdue`
              : `${f.days_remaining}d`,
            f.status,
            ins?.provider        ?? '—',
            ins?.policy_number   ?? '—',
            ins?.insurance_type  ?? '—',
            ins ? formatDate(ins.expiry_date) : '—',
            ins != null
              ? ((ins.days_remaining ?? 0) < 0
                  ? `${Math.abs(ins.days_remaining ?? 0)}d OD`
                  : `${ins.days_remaining}d`)
              : '—',
            ins?.status ?? 'NONE',
          ]
        }),
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7,
        },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0:  { cellWidth: 22 },  // Ref
          1:  { cellWidth: 32 },  // Customer
          2:  { cellWidth: 22 },  // Facility Type
          3:  { cellWidth: 22 },  // Expiry
          4:  { cellWidth: 16 },  // Days
          5:  { cellWidth: 18 },  // Status
          6:  { cellWidth: 26 },  // Ins. Provider
          7:  { cellWidth: 22 },  // Policy #
          8:  { cellWidth: 22 },  // Ins. Type
          9:  { cellWidth: 22 },  // Ins. Expiry
          10: { cellWidth: 16 },  // Ins. Days
          11: { cellWidth: 18 },  // Ins. Status
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return
          // Facility status colour (col 5)
          if (data.column.index === 5) {
            const val = data.cell.raw as string
            if (val === 'EXPIRED')  { data.cell.styles.textColor = [220, 38, 38];  data.cell.styles.fontStyle = 'bold' }
            if (val === 'CRITICAL') { data.cell.styles.textColor = [234, 88, 12];  data.cell.styles.fontStyle = 'bold' }
            if (val === 'WARNING')  { data.cell.styles.textColor = [161, 98, 7] }
            if (val === 'ACTIVE')   { data.cell.styles.textColor = [21, 128, 61] }
          }
          // Insurance status colour (col 11)
          if (data.column.index === 11) {
            const val = data.cell.raw as string
            if (val === 'NONE' || val === 'EXPIRED')  { data.cell.styles.textColor = [220, 38, 38];  data.cell.styles.fontStyle = 'bold' }
            if (val === 'CRITICAL') { data.cell.styles.textColor = [234, 88, 12];  data.cell.styles.fontStyle = 'bold' }
            if (val === 'WARNING')  { data.cell.styles.textColor = [161, 98, 7] }
            if (val === 'ACTIVE')   { data.cell.styles.textColor = [21, 128, 61] }
          }
        },
        margin: { left: 14, right: 14 },
      })

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(160, 160, 160)
        doc.text(
          `${bankName} — Confidential | Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 8,
          { align: 'center' }
        )
      }

      doc.save(`Facility_Report_${filter}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Filter + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-2xl border border-gray-200 p-5">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Report Type</p>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(filterLabels) as FilterType[]).map(key => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  filter === key
                    ? key === 'MISSING_INS'
                      ? 'bg-red-600 text-white'
                      : key === 'INS_EXPIRING'
                      ? 'bg-orange-500 text-white'
                      : 'bg-blue-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {filterLabels[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting || filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Summary line */}
      <p className="text-sm text-gray-500">
        Showing <strong className="text-gray-900">{filtered.length}</strong> facilit{filtered.length === 1 ? 'y' : 'ies'} — {filterLabels[filter]}
      </p>

      {/* Report table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {/* Facility columns */}
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Ref</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Customer</th>
                <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Facility Type</th>
                <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Description</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Expiry</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Days</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Status</th>
                <th className="hidden sm:table-cell px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Renewals</th>
                {/* Insurance divider */}
                <th className="px-3 py-3 text-left text-xs font-semibold text-teal-600 uppercase whitespace-nowrap border-l-2 border-teal-100 bg-teal-50/40">
                  🛡 Ins. Provider
                </th>
                <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-semibold text-teal-600 uppercase whitespace-nowrap bg-teal-50/40">Policy #</th>
                <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-semibold text-teal-600 uppercase whitespace-nowrap bg-teal-50/40">Ins. Type</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-teal-600 uppercase whitespace-nowrap bg-teal-50/40">Ins. Expiry</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-teal-600 uppercase whitespace-nowrap bg-teal-50/40">Ins. Days</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-teal-600 uppercase whitespace-nowrap bg-teal-50/40">Ins. Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(f => {
                const ins = primaryInsurance(f)
                const multipleIns = (f.insurance?.length ?? 0) > 1
                return (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    {/* Facility data */}
                    <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{f.facility_ref}</td>
                    <td className="px-3 py-3 font-medium text-gray-900 max-w-[160px] truncate">{f.customer_name}</td>
                    <td className="hidden md:table-cell px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{f.facility_type}</td>
                    <td className="hidden lg:table-cell px-3 py-3 text-gray-500 max-w-[160px] truncate text-xs">{f.description ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(f.expiry_date)}</td>
                    <td className="px-3 py-3 font-semibold text-xs whitespace-nowrap">
                      <span className={
                        f.days_remaining < 0 ? 'text-red-600' :
                        f.days_remaining <= 30 ? 'text-orange-600' :
                        f.days_remaining <= 90 ? 'text-yellow-600' : 'text-green-600'
                      }>
                        {f.days_remaining < 0
                          ? `${Math.abs(f.days_remaining)}d OD`
                          : `${f.days_remaining}d`
                        }
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                        STATUS_COLORS[f.status as FacilityStatus]
                      )}>
                        {f.status}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-3 text-center text-gray-500 text-xs">{f.renewal_count}</td>

                    {/* Insurance data — teal-tinted columns */}
                    {ins ? (
                      <>
                        <td className="px-3 py-3 border-l-2 border-teal-100 bg-teal-50/20">
                          <div className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-teal-500 flex-shrink-0" />
                            <span className="text-xs font-medium text-gray-800 whitespace-nowrap">{ins.provider}</span>
                            {multipleIns && (
                              <span className="ml-1 text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-semibold">
                                +{(f.insurance?.length ?? 1) - 1}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-3 py-3 font-mono text-xs text-gray-400 bg-teal-50/20">{ins.policy_number}</td>
                        <td className="hidden md:table-cell px-3 py-3 text-xs text-gray-500 bg-teal-50/20">{ins.insurance_type}</td>
                        <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap bg-teal-50/20">{formatDate(ins.expiry_date)}</td>
                        <td className="px-3 py-3 bg-teal-50/20">
                          <span className={cn(
                            'font-semibold text-xs whitespace-nowrap',
                            (ins.days_remaining ?? 0) < 0 ? 'text-red-600' :
                            (ins.days_remaining ?? 0) <= 30 ? 'text-orange-600' :
                            (ins.days_remaining ?? 0) <= 90 ? 'text-yellow-600' : 'text-green-600'
                          )}>
                            {(ins.days_remaining ?? 0) < 0
                              ? `${Math.abs(ins.days_remaining ?? 0)}d OD`
                              : `${ins.days_remaining}d`}
                          </span>
                        </td>
                        <td className="px-3 py-3 bg-teal-50/20">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                            INS_STATUS_COLORS[ins.status] ?? ''
                          )}>
                            {ins.status}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3 border-l-2 border-red-100 bg-red-50/20" colSpan={6}>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                            <ShieldX className="w-3 h-3" />
                            No insurance — compliance risk
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">
              No facilities match this filter.
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <p className="text-xs text-gray-400">
        🛡 Insurance columns show the most critical active policy per facility. If a facility has multiple policies, a count badge is shown.
      </p>
    </div>
  )
}
