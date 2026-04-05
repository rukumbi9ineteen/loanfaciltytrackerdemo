'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightLeft, X, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface RO {
  id: string
  full_name: string
  branch: string | null
}

interface Props {
  facilityId: string
  facilityRef: string
  customerName: string
  currentOwnerId: string
}

export default function TransferFacilityButton({
  facilityId,
  facilityRef,
  customerName,
  currentOwnerId,
}: Props) {
  const router  = useRouter()
  const supabase = createClient()

  const [open, setOpen]         = useState(false)
  const [ros, setRos]           = useState<RO[]>([])
  const [newOwnerId, setNewOwnerId] = useState('')
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Load active R.O. list when modal opens
  useEffect(() => {
    if (!open) return
    supabase
      .from('profiles')
      .select('id, full_name, branch')
      .eq('role', 'ro')
      .eq('is_active', true)
      .neq('id', currentOwnerId)       // exclude current owner
      .order('full_name')
      .then(({ data }) => setRos((data ?? []) as RO[]))
  }, [open])

  const handleTransfer = async () => {
    if (!newOwnerId) return
    setLoading(true)
    setError(null)

    const res  = await fetch('/api/admin/transfer-facility', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ facility_id: facilityId, new_owner_id: newOwnerId }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Transfer failed')
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      setOpen(false)
      setSuccess(false)
      setNewOwnerId('')
      router.refresh()
    }, 1800)
    setLoading(false)
  }

  const selectedRO = ros.find(r => r.id === newOwnerId)

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
        style={{ borderColor: '#034EA2', color: '#034EA2' }}
      >
        <ArrowRightLeft className="w-4 h-4" />
        Transfer
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
              style={{ background: '#011B39' }}>
              <div className="flex items-center gap-2.5">
                <ArrowRightLeft className="w-5 h-5 text-white/70" />
                <h2 className="font-semibold text-white">Transfer Facility</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {success ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#034EA2' }} />
                  <p className="font-semibold text-gray-900">Transfer complete</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {customerName} has been transferred to{' '}
                    <strong>{selectedRO?.full_name}</strong>. Both R.O.s have been notified.
                  </p>
                </div>
              ) : (
                <>
                  {/* Facility info */}
                  <div className="mb-5 p-3 rounded-xl border border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Facility being transferred</p>
                    <p className="font-semibold text-gray-900">{customerName}</p>
                    <p className="text-xs font-mono text-gray-500">{facilityRef}</p>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  {/* R.O. picker */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#011B39' }}>
                      Transfer to Relationship Officer
                    </label>
                    {ros.length === 0 ? (
                      <p className="text-sm text-gray-400 italic py-2">No other active R.O.s available.</p>
                    ) : (
                      <div className="relative">
                        <select
                          value={newOwnerId}
                          onChange={e => setNewOwnerId(e.target.value)}
                          className="w-full appearance-none px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] bg-white pr-10"
                        >
                          <option value="">— Select R.O. —</option>
                          {ros.map(ro => (
                            <option key={ro.id} value={ro.id}>
                              {ro.full_name}{ro.branch ? ` (${ro.branch})` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  {/* Warning */}
                  {newOwnerId && (
                    <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                      ⚠️ The current R.O. will lose access to this facility. Both parties will be notified.
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setOpen(false)}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleTransfer}
                      disabled={!newOwnerId || loading}
                      className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition"
                      style={{
                        background: !newOwnerId || loading ? '#93c5fd' : '#034EA2',
                        cursor:     !newOwnerId || loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading ? 'Transferring…' : 'Confirm Transfer'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
