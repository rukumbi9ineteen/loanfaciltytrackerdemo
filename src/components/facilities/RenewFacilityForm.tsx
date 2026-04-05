'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'

const schema = z.object({
  new_expiry_date: z.string().min(1, 'New expiry date is required'),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  facilityId: string
  facilityRef: string
  customerName: string
  currentExpiry: string
  userId: string
}

export default function RenewFacilityForm({ facilityId, facilityRef, customerName, currentExpiry, userId }: Props) {
  const router = useRouter()
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const watchedDate = watch('new_expiry_date')
  const extensionDays = watchedDate
    ? differenceInDays(parseISO(watchedDate), parseISO(currentExpiry))
    : null

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/facilities/renew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facility_id:     facilityId,
        new_expiry_date: data.new_expiry_date,
        notes:           data.notes,
      }),
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error || 'Failed to renew'); setLoading(false); return }

    router.push(`/facilities/${facilityId}`)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            New Expiry Date <span className="text-red-500">*</span>
          </label>
          <input {...register('new_expiry_date')} type="date" min={minDate}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          {errors.new_expiry_date && <p className="mt-1 text-xs text-red-600">{errors.new_expiry_date.message}</p>}
          {extensionDays !== null && extensionDays > 0 && (
            <p className="mt-1 text-xs font-medium" style={{ color: '#034EA2' }}>
              ✓ Extension of {extensionDays} days from current expiry
            </p>
          )}
          {extensionDays !== null && extensionDays <= 0 && (
            <p className="mt-1 text-xs text-red-600">
              ✗ Must be after current expiry ({format(parseISO(currentExpiry), 'dd MMM yyyy')})
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Renewal Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea {...register('notes')} rows={3}
            placeholder="e.g. Annual review completed, credit approved by committee"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
            style={{ background: loading ? '#7aabe8' : '#034EA2' }}>
            {loading ? 'Saving…' : 'Confirm Renewal'}
          </button>
        </div>
      </form>
    </div>
  )
}
