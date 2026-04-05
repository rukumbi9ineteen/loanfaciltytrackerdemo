'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { FACILITY_TYPES, CURRENCIES } from '@/types'
import { generateFacilityRef } from '@/lib/utils'
import { format, addDays } from 'date-fns'

const schema = z.object({
  customer_name: z.string().min(2, 'Customer name is required'),
  facility_type: z.string().min(1, 'Select a facility type'),
  description:   z.string().optional(),
  expiry_date:   z.string().min(1, 'Expiry date is required'),
  amount:        z.string().optional(),
  currency:      z.string().default('KES'),
  amount_notes:  z.string().optional(),
  notes:         z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props { userId: string; facilityCount: number }

export default function AddFacilityForm({ userId, facilityCount }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const suggestedRef = generateFacilityRef(facilityCount)
  const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'KES' },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)

    const payload = {
      facility_ref:  suggestedRef,
      customer_name: data.customer_name,
      facility_type: data.facility_type,
      description:   data.description || null,
      expiry_date:   data.expiry_date,
      amount:        data.amount ? parseFloat(data.amount) : null,
      currency:      data.currency,
      amount_notes:  data.amount_notes || null,
      notes:         data.notes || null,
      owner_id:      userId,
    }

    const { error: err } = await supabase.from('facilities').insert(payload)

    if (err) {
      if (err.code === '23505') {
        const fallback = { ...payload, facility_ref: `FAC-${Date.now().toString().slice(-6)}` }
        const { error: e2 } = await supabase.from('facilities').insert(fallback)
        if (e2) { setError('Failed to save. Please try again.'); setLoading(false); return }
      } else {
        setError(err.message); setLoading(false); return
      }
    }

    router.push('/facilities')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Ref */}
        <div className="rounded-lg px-4 py-3 text-sm border" style={{ background: '#F4F5F8', borderColor: '#034EA2', color: '#034EA2' }}>
          Facility Reference: <strong>{suggestedRef}</strong> (auto-assigned)
        </div>

        {/* Customer Name */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input {...register('customer_name')} type="text" placeholder="e.g. Acme Corporation Ltd"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          {errors.customer_name && <p className="mt-1 text-xs text-red-600">{errors.customer_name.message}</p>}
        </div>

        {/* Facility Type */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Facility Type <span className="text-red-500">*</span>
          </label>
          <select {...register('facility_type')}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] bg-white">
            <option value="">Select facility type…</option>
            {FACILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.facility_type && <p className="mt-1 text-xs text-red-600">{errors.facility_type.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input {...register('description')} type="text"
            placeholder="e.g. Working capital facility for import financing"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
        </div>

        {/* Expiry Date */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Expiry Date <span className="text-red-500">*</span>
          </label>
          <input {...register('expiry_date')} type="date" min={minDate}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          {errors.expiry_date && <p className="mt-1 text-xs text-red-600">{errors.expiry_date.message}</p>}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Facility Amount <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex gap-2">
            <select {...register('currency')}
              className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] bg-white">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input {...register('amount')} type="number" step="0.01" min="0"
              placeholder="e.g. 5,000,000"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          </div>
        </div>

        {/* Amount Notes */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Amount Notes <span className="text-gray-400 font-normal">(e.g. customer paid KES 500,000)</span>
          </label>
          <input {...register('amount_notes')} type="text"
            placeholder="e.g. Partial payment of KES 200,000 received 01 Apr 2026"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea {...register('notes')} rows={3}
            placeholder="Any additional notes about this facility…"
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
            {loading ? 'Saving…' : 'Save Facility'}
          </button>
        </div>
      </form>
    </div>
  )
}
