'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const schema = z.object({
  full_name:   z.string().min(2, 'Name is required'),
  branch:      z.string().optional(),
  phone:       z.string().optional(),
  alert_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export default function SettingsForm({ profile }: { profile: Profile | null }) {
  const router = useRouter()
  const supabase = createClient()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name:   profile?.full_name ?? '',
      branch:      profile?.branch ?? '',
      phone:       profile?.phone ?? '',
      alert_email: profile?.alert_email ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:   data.full_name,
        branch:      data.branch || null,
        phone:       data.phone || null,
        alert_email: data.alert_email || null,
      })
      .eq('id', profile!.id)

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Profile Information</h2>
      <p className="text-xs text-gray-500 mb-5">Your name and contact details visible to admins</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ Profile saved successfully
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Read-only fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Email</label>
            <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200">{profile?.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Role</label>
            <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200 capitalize">
              {profile?.role === 'admin' ? 'Administrator' : 'Relationship Officer'}
            </p>
          </div>
        </div>

        {/* Editable fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            {...register('full_name')}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <input
              {...register('branch')}
              placeholder="e.g. Nairobi HQ"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              {...register('phone')}
              placeholder="+254 700 000 000"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alert Email
            <span className="text-gray-400 font-normal ml-1">— daily expiry notifications will be sent here</span>
          </label>
          <input
            {...register('alert_email')}
            type="email"
            placeholder="Leave blank to use your login email"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.alert_email && <p className="mt-1 text-xs text-red-600">{errors.alert_email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
