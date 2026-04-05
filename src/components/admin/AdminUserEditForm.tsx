'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
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
  const router = useRouter()
  const supabase = createClient()
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Edit User</h2>
      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ Profile updated
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input {...register('full_name')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select {...register('role')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="ro">Relationship Officer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <input {...register('branch')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input {...register('phone')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alert Email</label>
            <input {...register('alert_email')} type="email" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <input {...register('is_active')} type="checkbox" id="is_active" className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Account is active</label>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
