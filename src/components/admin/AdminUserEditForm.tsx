'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { Profile } from '@/types'

const schema = z.object({
  full_name:   z.string().min(2),
  role:        z.enum(['ro', 'admin']),
  branch:      z.string().optional(),
  phone:       z.string().optional(),
  alert_email: z.string().email().optional().or(z.literal('')),
  is_active:   z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function AdminUserEditForm({ profile }: { profile: Profile }) {
  const router  = useRouter()
  const supabase = createClient()
  const [saved, setSaved]           = useState(false)
  const [loading, setLoading]       = useState(false)
  const [resetting, setResetting]   = useState(false)
  const [resetOk, setResetOk]       = useState<string | null>(null)
  const [resetErr, setResetErr]     = useState<string | null>(null)

  const { register, handleSubmit } = useForm<FormData>({
    defaultValues: {
      full_name:   profile.full_name,
      role:        profile.role,
      branch:      profile.branch ?? '',
      phone:       profile.phone ?? '',
      alert_email: profile.alert_email ?? '',
      is_active:   profile.is_active,
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    await supabase.from('profiles').update({
      full_name:   data.full_name,
      role:        data.role,
      branch:      data.branch || null,
      phone:       data.phone || null,
      alert_email: data.alert_email || null,
      is_active:   data.is_active,
    }).eq('id', profile.id)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
    setLoading(false)
  }

  const handleResetPassword = async () => {
    setResetting(true)
    setResetOk(null)
    setResetErr(null)

    const res  = await fetch('/api/admin/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ target_user_id: profile.id }),
    })
    const json = await res.json()

    if (!res.ok) {
      setResetErr(json.error || 'Failed to send reset email')
    } else {
      setResetOk(`Password reset email sent to ${json.email}`)
      setTimeout(() => setResetOk(null), 6000)
    }
    setResetting(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold" style={{ color: '#011B39' }}>Edit User</h2>

        {/* Reset Password */}
        <button
          type="button"
          onClick={handleResetPassword}
          disabled={resetting}
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors"
          style={{
            borderColor: '#EB9C20',
            color: resetting ? '#9ca3af' : '#EB9C20',
          }}
        >
          <KeyRound className="w-4 h-4" />
          {resetting ? 'Sending…' : 'Reset Password'}
        </button>
      </div>

      {/* Reset feedback */}
      {resetOk && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {resetOk}
        </div>
      )}
      {resetErr && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {resetErr}
        </div>
      )}

      {saved && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ Profile updated
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>Full Name</label>
            <input {...register('full_name')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>Role</label>
            <select {...register('role')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] bg-white">
              <option value="ro">Relationship Officer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>Branch</label>
            <input {...register('branch')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>Phone</label>
            <input {...register('phone')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>Alert Email</label>
            <input {...register('alert_email')} type="email"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <input {...register('is_active')} type="checkbox" id="is_active" className="w-4 h-4 rounded" />
            <label htmlFor="is_active" className="text-sm font-medium" style={{ color: '#011B39' }}>Account is active</label>
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
          style={{ background: loading ? '#7aabe8' : '#034EA2' }}>
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
