'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  new_password:     z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

export default function ChangePasswordForm() {
  const supabase = createClient()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password: data.new_password })

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      reset()
      setTimeout(() => setSaved(false), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Change Password</h2>
      <p className="text-xs text-gray-500 mb-5">Choose a strong password of at least 8 characters</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ Password updated successfully
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              {...register('new_password')}
              type="password"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.new_password && <p className="mt-1 text-xs text-red-600">{errors.new_password.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              {...register('confirm_password')}
              type="password"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.confirm_password && <p className="mt-1 text-xs text-red-600">{errors.confirm_password.message}</p>}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
