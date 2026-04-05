'use client'

import { useState } from 'react'
import { cn, formatDate, STATUS_COLORS } from '@/lib/utils'
import { FileDown, Printer } from 'lucide-react'
import type { Facility, FacilityStatus } from '@/types'

type FilterType = 'ALL' | 'EXPIRING_90' | 'EXPIRING_30' | 'EXPIRED'

interface Props {
  facilities: Facility[]
  officerName: string
  bankName: string
}

export default function ReportsClient({ facilities, officerName, bankName }: Props) {
  const [filter, setFilter] = useState<FilterType>('EXPIRING_90')
  const [exporting, setExporting] = useState(false)

  const filtered = facilities.filter(f => {
    switch (filter) {
      case 'EXPIRING_90': return f.days_remaining >= 0 && f.days_remaining <= 90
      case 'EXPIRING_30': return f.days_remaining >= 0 && f.days_remaining <= 30
      case 'EXPIRED':     return f.days_remaining < 0
      default:            return true
    }
  })

  const filterLabels: Record<FilterType, string> = {
    ALL:         'All Facilities',
    EXPIRING_90: 'Expiring in 90 Days',
    EXPIRING_30: 'Expiring in 30 Days',
    EXPIRED:     'Expired Facilities',
  }

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
      doc.text(`Loan Facility Expiry Report — ${filterLabels[filter]}`, 14, 23)

      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 29)
      doc.text(`Officer: ${officerName}`, 14, 34)
      doc.text(`Total: ${filtered.length} facilit${filtered.length === 1 ? 'y' : 'ies'}`, 14, 39)

      autoTable(doc, {
        startY: 44,
        head: [['Ref', 'Customer Name', 'Facility Type', 'Description', 'Expiry Date', 'Days Left', 'Status', 'Renewals']],
        body: filtered.map(f => [
          f.facility_ref,
          f.customer_name,
          f.facility_type,
          f.description ?? '—',
          formatDate(f.expiry_date),
          f.days_remaining < 0 ? `${Math.abs(f.days_remaining)}d overdue` : `${f.days_remaining}d`,
          f.status,
          f.renewal_count.toString(),
        ]),
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 6) {
            const val = data.cell.raw as string
            if (val === 'EXPIRED')  { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold' }
            if (val === 'CRITICAL') { data.cell.styles.textColor = [234, 88, 12]; data.cell.styles.fontStyle = 'bold' }
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

      const fileName = `Facility_Report_${filter}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

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
                    ? 'bg-blue-700 text-white'
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ref</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Days Left</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Renewals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{f.facility_ref}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{f.customer_name}</td>
                  <td className="px-4 py-3 text-gray-600">{f.facility_type}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{f.description ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(f.expiry_date)}</td>
                  <td className="px-4 py-3 font-semibold text-sm">
                    <span className={
                      f.days_remaining < 0 ? 'text-red-600' :
                      f.days_remaining <= 30 ? 'text-orange-600' :
                      'text-yellow-600'
                    }>
                      {f.days_remaining < 0
                        ? `${Math.abs(f.days_remaining)}d overdue`
                        : `${f.days_remaining}d`
                      }
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                      STATUS_COLORS[f.status as FacilityStatus]
                    )}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{f.renewal_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">
              No facilities match this filter.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
