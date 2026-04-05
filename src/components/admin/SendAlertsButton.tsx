'use client'

import { useState } from 'react'
import { Mail, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function SendAlertsButton({ ownerId }: { ownerId?: string }) {
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const handleSend = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    const res = await fetch('/api/admin/send-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ownerId ? { owner_id: ownerId } : {}),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error || 'Failed to send')
    } else {
      const sent   = (json.results ?? []).filter((r: any) => r.sent).length
      const failed = (json.results ?? []).filter((r: any) => !r.sent && r.reason !== 'no expiring facilities').length
      setResult({ sent, failed })
    }
    setLoading(false)
    setTimeout(() => setResult(null), 5000)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSend}
        disabled={loading}
        className="inline-flex items-center gap-2 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
        style={{ background: loading ? '#9ca3af' : '#EB9C20' }}
        title={ownerId ? 'Send alert to this R.O.' : 'Send alerts to all R.O.s now'}
      >
        <Mail className="w-4 h-4" />
        {loading ? 'Sending…' : ownerId ? 'Send Alert' : 'Send All Alerts'}
      </button>

      {result && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ''}
        </span>
      )}
      {error && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </span>
      )}
    </div>
  )
}
