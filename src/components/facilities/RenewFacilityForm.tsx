'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
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

export default function RenewFacilityForm({
  facilityId, facilityRef, customerName, currentExpiry, userId
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewDays, setPreviewDays] = useState<number | null>(null)

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

    const extDays = differenceInDays(parseISO(data.new_expiry_date), parseISO(currentExpiry))

    if (extDays <= 0) {
      setError('New expiry date must be after the current expiry date.')
      setLoading(false)
      return
    }

    // Insert renewal history
    const { error: histError } = await supabase.from('renewal_history').insert({
      facility_id:     facilityId,
      facility_ref:    facilityRef,
      customer_name:   customerName,
      old_expiry_date: currentExpiry,
      new_expiry_date: data.new_expiry_date,
      renewed_by:      userId,
      notes:           data.notes || null,
    })

    if (histError) {
      setError('Failed to record renewal: ' + histError.message)
      setLoading(false)
      return
    }

    // Update facility
    const { error: facError } = await supabase
      .from('facilities')
      .update({
        expiry_date:     data.new_expiry_date,
        last_renewed_at: new Date().toISOString(),
        renewal_count:   supabase.rpc('increment_renewal_count', { row_id: facilityId }) as unknown as number,
      })
      .eq('id', facilityId)

    // Simpler approach: fetch current count then update
    if (facError) {
      // Fallback: get current count and increment manually
      const { data: fac } = await supabase
        .from('facilities')
        .select('renewal_count')
        .eq('id', facilityId)
        .single()

      await supabase
        .from('facilities')
        .update({
          expiry_date:     data.new_expiry_date,
          last_renewed_at: new Date().toISOString(),
          renewal_count:   (fac?.renewal_count ?? 0) + 1,
        })
        .eq('id', facilityId)
    }

    router.push(`/facilities/${facilityId}`)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* New Expiry Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Expiry Date <span className="text-red-500">*</span>
          </label>
          <input
            {...register('new_expiry_date')}
            type="date"
            min={minDate}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.new_expiry_date && (
            <p className="mt-1 text-xs text-red-600">{errors.new_expiry_date.message}</p>
          )}
          {extensionDays !== null && extensionDays > 0 && (
            <p className="mt-1 text-xs text-green-600 font-medium">
              ✓ Extension of {extensionDays} days from current expiry
            </p>
          )}
          {extensionDays !== null && extensionDays <= 0 && (
            <p className="mt-1 text-xs text-red-600">
              ✗ Must be after current expiry date ({format(parseISO(currentExpiry), 'dd MMM yyyy')})
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Renewal Notes
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="e.g. Annual review completed, credit approved by committee"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Saving…' : 'Confirm Renewal'}
          </button>
        </div>
      </form>
    </div>
  )
}
