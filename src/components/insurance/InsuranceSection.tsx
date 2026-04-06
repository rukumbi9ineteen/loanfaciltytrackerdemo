'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ShieldX, Plus, RotateCcw, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn, formatDate, STATUS_COLORS } from '@/lib/utils'
import { INSURANCE_TYPES, CURRENCIES } from '@/types'
import type { FacilityInsurance, InsuranceRenewalHistory, FacilityStatus } from '@/types'
import { format, addDays } from 'date-fns'

// ── Helpers ───────────────────────────────────────────────────────────────────

function DaysChip({ days, status }: { days: number; status: string }) {
  const color =
    days < 0          ? 'text-red-600'    :
    status === 'CRITICAL' ? 'text-orange-600' :
    status === 'WARNING'  ? 'text-yellow-600' : 'text-green-600'
  return (
    <span className={cn('font-semibold text-xs', color)}>
      {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
    </span>
  )
}

// ── Add Insurance Modal ───────────────────────────────────────────────────────

function AddInsuranceModal({
  facilityId,
  onClose,
  onSaved,
}: {
  facilityId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    provider: '', policy_number: '', insurance_type: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: '',
    premium_amount: '', premium_currency: 'RWF',
    coverage_amount: '', coverage_currency: 'RWF',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const today   = format(new Date(), 'yyyy-MM-dd')

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    if (!form.provider || !form.policy_number || !form.insurance_type || !form.start_date || !form.expiry_date) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    setError(null)
    const res  = await fetch('/api/insurance', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ facility_id: facilityId, ...form }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
    onSaved()
  }

  const inp = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]'
  const sel = `${inp} bg-white`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" /> Add Insurance Policy
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Provider <span className="text-red-500">*</span></label>
              <input value={form.provider} onChange={e => set('provider', e.target.value)}
                placeholder="e.g. SANLAM, UAP…" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Policy Number <span className="text-red-500">*</span></label>
              <input value={form.policy_number} onChange={e => set('policy_number', e.target.value)}
                placeholder="e.g. INS-2025-00123" className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">Insurance Type <span className="text-red-500">*</span></label>
            <select value={form.insurance_type} onChange={e => set('insurance_type', e.target.value)} className={sel}>
              <option value="">Select type…</option>
              {INSURANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Start Date <span className="text-red-500">*</span></label>
              <input type="date" max={today} value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Expiry Date <span className="text-red-500">*</span></label>
              <input type="date" min={minDate} value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">Premium Amount <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="flex gap-2">
              <select value={form.premium_currency} onChange={e => set('premium_currency', e.target.value)} className="w-20 px-2 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#034EA2]">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" step="0.01" min="0" value={form.premium_amount} onChange={e => set('premium_amount', e.target.value)}
                placeholder="Annual premium" className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">Coverage Amount <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="flex gap-2">
              <select value={form.coverage_currency} onChange={e => set('coverage_currency', e.target.value)} className="w-20 px-2 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#034EA2]">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" step="0.01" min="0" value={form.coverage_amount} onChange={e => set('coverage_amount', e.target.value)}
                placeholder="Total coverage" className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] resize-none" />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition"
            style={{ background: loading ? '#7aabe8' : '#034EA2' }}>
            {loading ? 'Saving…' : 'Add Insurance'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Renew Insurance Modal ─────────────────────────────────────────────────────

function RenewInsuranceModal({
  insurance,
  onClose,
  onRenewed,
}: {
  insurance: FacilityInsurance
  onClose: () => void
  onRenewed: () => void
}) {
  const minDate = format(addDays(new Date(insurance.expiry_date), 1), 'yyyy-MM-dd')
  const [newExpiry, setNewExpiry] = useState('')
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const renew = async () => {
    if (!newExpiry) { setError('Please select a new expiry date.'); return }
    setLoading(true)
    setError(null)
    const res  = await fetch('/api/insurance/renew', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ insurance_id: insurance.id, new_expiry_date: newExpiry, notes }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Renewal failed'); return }
    onRenewed()
  }

  const inp = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600" /> Renew Insurance
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Current policy info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Provider</span><span className="font-medium">{insurance.provider}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Policy</span><span className="font-medium font-mono text-xs">{insurance.policy_number}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{insurance.insurance_type}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Current expiry</span>
              <span className={cn('font-semibold', insurance.status === 'EXPIRED' ? 'text-red-600' : 'text-gray-900')}>
                {formatDate(insurance.expiry_date)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">New Expiry Date <span className="text-red-500">*</span></label>
            <input type="date" min={minDate} value={newExpiry} onChange={e => setNewExpiry(e.target.value)} className={inp} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="e.g. Annual renewal — same terms" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] resize-none" />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={renew} disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition"
            style={{ background: loading ? '#7aabe8' : '#034EA2' }}>
            {loading ? 'Renewing…' : 'Confirm Renewal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main InsuranceSection ─────────────────────────────────────────────────────

interface Props {
  facilityId: string
  initialInsurance: FacilityInsurance[]
  initialHistory:   InsuranceRenewalHistory[]
}

export default function InsuranceSection({ facilityId, initialInsurance, initialHistory }: Props) {
  const router = useRouter()
  const [policies,  setPolicies]  = useState<FacilityInsurance[]>(initialInsurance)
  const [history,   setHistory]   = useState<InsuranceRenewalHistory[]>(initialHistory)
  const [showAdd,   setShowAdd]   = useState(false)
  const [renewTarget, setRenewTarget] = useState<FacilityInsurance | null>(null)
  const [expanded,  setExpanded]  = useState<string | null>(null)   // insurance id with open history
  const [deleting,  setDeleting]  = useState<string | null>(null)

  const refresh = () => router.refresh()

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this insurance policy? This cannot be undone.')) return
    setDeleting(id)
    await fetch('/api/insurance', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setPolicies(prev => prev.filter(p => p.id !== id))
    setHistory(prev => prev.filter(h => h.insurance_id !== id))
    setDeleting(null)
  }

  const handleSaved = () => {
    setShowAdd(false)
    refresh()
  }

  const handleRenewed = () => {
    setRenewTarget(null)
    refresh()
  }

  const hasMissing = policies.length === 0

  return (
    <div>
      {/* ── Missing insurance warning ──────────────────────────────────── */}
      {hasMissing && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <ShieldX className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">No Insurance — Compliance Issue</p>
            <p className="text-sm text-red-700 mt-0.5">
              This facility has no active insurance policy. Please add one immediately to remain compliant.
            </p>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-gray-900">Insurance Policies ({policies.length})</h2>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-white transition"
          style={{ background: '#034EA2' }}
        >
          <Plus className="w-4 h-4" />
          Add Insurance
        </button>
      </div>

      {/* ── Policy cards ─────────────────────────────────────────────── */}
      {policies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-400 text-sm">
          <ShieldX className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No insurance policies attached yet.
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map(ins => {
            const isExpanded = expanded === ins.id
            const policyHistory = history.filter(h => h.insurance_id === ins.id)

            return (
              <div key={ins.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Policy header row */}
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{ins.provider}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{ins.policy_number}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                        STATUS_COLORS[ins.status as FacilityStatus]
                      )}>
                        {ins.status}
                      </span>
                      <DaysChip days={ins.days_remaining} status={ins.status} />
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400 uppercase font-semibold">Type</p>
                      <p className="text-gray-800 font-medium mt-0.5">{ins.insurance_type}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 uppercase font-semibold">Start</p>
                      <p className="text-gray-800 font-medium mt-0.5">{formatDate(ins.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 uppercase font-semibold">Expiry</p>
                      <p className={cn('font-medium mt-0.5', ins.status === 'EXPIRED' ? 'text-red-600' : 'text-gray-800')}>
                        {formatDate(ins.expiry_date)}
                      </p>
                    </div>
                    {ins.premium_amount && (
                      <div>
                        <p className="text-gray-400 uppercase font-semibold">Premium</p>
                        <p className="text-gray-800 font-medium mt-0.5">
                          {ins.premium_currency} {ins.premium_amount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {ins.coverage_amount && (
                      <div>
                        <p className="text-gray-400 uppercase font-semibold">Coverage</p>
                        <p className="text-gray-800 font-medium mt-0.5">
                          {ins.coverage_currency} {ins.coverage_amount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {ins.notes && (
                      <div className="col-span-2 sm:col-span-4">
                        <p className="text-gray-400 uppercase font-semibold">Notes</p>
                        <p className="text-gray-700 mt-0.5">{ins.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setRenewTarget(ins)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Renew
                    </button>
                    <button
                      onClick={() => handleDelete(ins.id)}
                      disabled={deleting === ins.id}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deleting === ins.id ? 'Removing…' : 'Remove'}
                    </button>
                    {policyHistory.length > 0 && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : ins.id)}
                        className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {policyHistory.length} renewal{policyHistory.length !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </div>

                {/* Renewal history sub-table */}
                {isExpanded && policyHistory.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase">Old Expiry</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase">New Expiry</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase">Extension</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase hidden sm:table-cell">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {policyHistory.map(h => (
                          <tr key={h.id}>
                            <td className="px-4 py-2 text-gray-600">{formatDate(h.created_at)}</td>
                            <td className="px-4 py-2 text-gray-500">{formatDate(h.old_expiry_date)}</td>
                            <td className="px-4 py-2 font-medium text-gray-900">{formatDate(h.new_expiry_date)}</td>
                            <td className="px-4 py-2 text-blue-600 font-medium">+{h.extension_days}d</td>
                            <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">{h.notes ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {showAdd && (
        <AddInsuranceModal facilityId={facilityId} onClose={() => setShowAdd(false)} onSaved={handleSaved} />
      )}
      {renewTarget && (
        <RenewInsuranceModal insurance={renewTarget} onClose={() => setRenewTarget(null)} onRenewed={handleRenewed} />
      )}
    </div>
  )
}
