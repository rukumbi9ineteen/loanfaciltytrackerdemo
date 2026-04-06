'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShieldCheck } from 'lucide-react'
import { FACILITY_TYPES, CURRENCIES, INSURANCE_TYPES } from '@/types'
import { generateFacilityRef } from '@/lib/utils'
import { format, addDays } from 'date-fns'

const schema = z.object({
  // ── Facility ──────────────────────────────────────────────────────────────
  customer_name: z.string().min(2, 'Customer name is required'),
  facility_type: z.string().min(1, 'Select a facility type'),
  description:   z.string().optional(),
  expiry_date:   z.string().min(1, 'Expiry date is required'),
  amount:        z.string().optional(),
  currency:      z.string().default('RWF'),
  amount_notes:  z.string().optional(),
  notes:         z.string().optional(),
  // ── Insurance (required) ──────────────────────────────────────────────────
  ins_provider:       z.string().min(2, 'Insurance provider is required'),
  ins_policy_number:  z.string().min(1, 'Policy number is required'),
  ins_type:           z.string().min(1, 'Select an insurance type'),
  ins_start_date:     z.string().min(1, 'Insurance start date is required'),
  ins_expiry_date:    z.string().min(1, 'Insurance expiry date is required'),
  ins_premium_amount: z.string().optional(),
  ins_premium_currency: z.string().default('RWF'),
  ins_coverage_amount:  z.string().optional(),
  ins_coverage_currency: z.string().default('RWF'),
  ins_notes:          z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props { userId: string; facilityCount: number }

export default function AddFacilityForm({ userId, facilityCount }: Props) {
  const router  = useRouter()
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const suggestedRef = generateFacilityRef(facilityCount)
  const minDate      = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const today        = format(new Date(), 'yyyy-MM-dd')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency:              'RWF',
      ins_premium_currency:  'RWF',
      ins_coverage_currency: 'RWF',
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)

    // ── Step 1: Create facility via API route (sends notifications) ────────
    const facilityPayload = {
      facility_ref:  suggestedRef,
      customer_name: data.customer_name,
      facility_type: data.facility_type,
      description:   data.description  || null,
      expiry_date:   data.expiry_date,
      amount:        data.amount ? parseFloat(data.amount) : null,
      currency:      data.currency,
      amount_notes:  data.amount_notes || null,
      notes:         data.notes        || null,
      owner_id:      userId,
    }

    const facRes = await fetch('/api/facilities', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(facilityPayload),
    })
    const facResult = await facRes.json()

    if (!facRes.ok) {
      // Try fallback ref on duplicate
      if (facResult.error?.includes('duplicate') || facResult.error?.includes('23505')) {
        const fallback = { ...facilityPayload, facility_ref: `FAC-${Date.now().toString().slice(-6)}` }
        const r2 = await fetch('/api/facilities', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(fallback),
        })
        const r2j = await r2.json()
        if (!r2.ok) { setError('Failed to save facility. Please try again.'); setLoading(false); return }
        return continueWithInsurance(r2j.facility.id, data)
      }
      setError(facResult.error ?? 'Failed to save facility.')
      setLoading(false)
      return
    }

    return continueWithInsurance(facResult.facility.id, data)
  }

  const continueWithInsurance = async (facilityId: string, data: FormData) => {
    // ── Step 2: Create insurance (required) ───────────────────────────────
    const insPayload = {
      facility_id:       facilityId,
      provider:          data.ins_provider,
      policy_number:     data.ins_policy_number,
      insurance_type:    data.ins_type,
      start_date:        data.ins_start_date,
      expiry_date:       data.ins_expiry_date,
      premium_amount:    data.ins_premium_amount    || null,
      premium_currency:  data.ins_premium_currency,
      coverage_amount:   data.ins_coverage_amount   || null,
      coverage_currency: data.ins_coverage_currency,
      notes:             data.ins_notes             || null,
    }

    const insRes = await fetch('/api/insurance', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(insPayload),
    })

    if (!insRes.ok) {
      // Facility was created — warn but still proceed
      setError('Facility saved, but insurance could not be attached. Please add it from the facility detail page.')
      setLoading(false)
      router.push('/facilities')
      router.refresh()
      return
    }

    router.push('/facilities')
    router.refresh()
  }

  // ── Shared input class ─────────────────────────────────────────────────────
  const input = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]'
  const select = `${input} bg-white`

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Facility Reference ──────────────────────────────────────────── */}
        <div className="rounded-lg px-4 py-3 text-sm border" style={{ background: '#F4F5F8', borderColor: '#034EA2', color: '#034EA2' }}>
          Facility Reference: <strong>{suggestedRef}</strong> (auto-assigned)
        </div>

        {/* ── Customer Name ───────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input {...register('customer_name')} type="text" placeholder="e.g. Acme Corporation Ltd" className={input} />
          {errors.customer_name && <p className="mt-1 text-xs text-red-600">{errors.customer_name.message}</p>}
        </div>

        {/* ── Facility Type ───────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Facility Type <span className="text-red-500">*</span>
          </label>
          <select {...register('facility_type')} className={select}>
            <option value="">Select facility type…</option>
            {FACILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.facility_type && <p className="mt-1 text-xs text-red-600">{errors.facility_type.message}</p>}
        </div>

        {/* ── Description ─────────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input {...register('description')} type="text"
            placeholder="e.g. Working capital facility for import financing" className={input} />
        </div>

        {/* ── Expiry Date ─────────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Facility Expiry Date <span className="text-red-500">*</span>
          </label>
          <input {...register('expiry_date')} type="date" min={minDate} className={input} />
          {errors.expiry_date && <p className="mt-1 text-xs text-red-600">{errors.expiry_date.message}</p>}
        </div>

        {/* ── Amount ──────────────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Facility Amount <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex gap-2">
            <select {...register('currency')} className="w-24 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] bg-white">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input {...register('amount')} type="number" step="0.01" min="0" placeholder="e.g. 5,000,000" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          </div>
        </div>

        {/* ── Amount Notes ────────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Amount Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input {...register('amount_notes')} type="text"
            placeholder="e.g. Partial payment of RWF 200,000 received 01 Apr 2026" className={input} />
        </div>

        {/* ── Facility Notes ──────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea {...register('notes')} rows={2}
            placeholder="Any additional notes about this facility…"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] resize-none" />
        </div>

        {/* ══ Insurance Section ════════════════════════════════════════════ */}
        <div className="border-t border-gray-200 pt-6 mt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: '#011B39' }}>Insurance Details</h3>
              <p className="text-xs text-gray-500">Required — every facility must have active insurance coverage</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Provider + Policy Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
                  Insurance Provider <span className="text-red-500">*</span>
                </label>
                <input {...register('ins_provider')} type="text"
                  placeholder="e.g. SANLAM, UAP, Jubilee…" className={input} />
                {errors.ins_provider && <p className="mt-1 text-xs text-red-600">{errors.ins_provider.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
                  Policy Number <span className="text-red-500">*</span>
                </label>
                <input {...register('ins_policy_number')} type="text"
                  placeholder="e.g. INS-2025-00123" className={input} />
                {errors.ins_policy_number && <p className="mt-1 text-xs text-red-600">{errors.ins_policy_number.message}</p>}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
                Insurance Type <span className="text-red-500">*</span>
              </label>
              <select {...register('ins_type')} className={select}>
                <option value="">Select insurance type…</option>
                {INSURANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.ins_type && <p className="mt-1 text-xs text-red-600">{errors.ins_type.message}</p>}
            </div>

            {/* Start + Expiry dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
                  Insurance Start Date <span className="text-red-500">*</span>
                </label>
                <input {...register('ins_start_date')} type="date" max={today} className={input} />
                {errors.ins_start_date && <p className="mt-1 text-xs text-red-600">{errors.ins_start_date.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
                  Insurance Expiry Date <span className="text-red-500">*</span>
                </label>
                <input {...register('ins_expiry_date')} type="date" min={minDate} className={input} />
                {errors.ins_expiry_date && <p className="mt-1 text-xs text-red-600">{errors.ins_expiry_date.message}</p>}
              </div>
            </div>

            {/* Premium */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
                Premium Amount <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex gap-2">
                <select {...register('ins_premium_currency')} className="w-24 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] bg-white">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input {...register('ins_premium_amount')} type="number" step="0.01" min="0"
                  placeholder="Annual premium" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
              </div>
            </div>

            {/* Coverage */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
                Coverage Amount <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex gap-2">
                <select {...register('ins_coverage_currency')} className="w-24 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] bg-white">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input {...register('ins_coverage_amount')} type="number" step="0.01" min="0"
                  placeholder="Total coverage amount" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
              </div>
            </div>

            {/* Insurance Notes */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
                Insurance Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea {...register('ins_notes')} rows={2}
                placeholder="Any notes about this insurance policy…"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] resize-none" />
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
            style={{ background: loading ? '#7aabe8' : '#034EA2' }}>
            {loading ? 'Saving…' : 'Save Facility + Insurance'}
          </button>
        </div>
      </form>
    </div>
  )
}
