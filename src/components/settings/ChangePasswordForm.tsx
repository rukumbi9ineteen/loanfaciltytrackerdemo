'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

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
  const router   = useRouter()
  const [done, setDone]     = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [error, setError]   = useState<string | null>(null)
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
      setLoading(false)
      return
    }

    // Password changed — sign out ALL sessions (this device + any others)
    await supabase.auth.signOut({ scope: 'global' })

    reset()
    setDone(true)

    // Countdown then redirect
    let n = 3
    const interval = setInterval(() => {
      n -= 1
      setCountdown(n)
      if (n <= 0) {
        clearInterval(interval)
        router.push('/login?message=password_changed')
      }
    }, 1000)
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 p-6 text-center">
        <LogOut className="w-10 h-10 mx-auto mb-3" style={{ color: '#EB9C20' }} />
        <h3 className="font-semibold text-gray-900 mb-1">Password Updated</h3>
        <p className="text-sm text-gray-500">
          For your security, all active sessions have been signed out.
        </p>
        <p className="text-sm font-medium mt-3" style={{ color: '#034EA2' }}>
          Redirecting to login in {countdown}s…
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Change Password</h2>
      <p className="text-xs text-gray-500 mb-5">
        Choose a strong password of at least 8 characters.{' '}
        <span className="text-amber-600 font-medium">You will be signed out of all devices after changing.</span>
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              {...register('new_password')}
              type="password"
              placeholder="Minimum 8 characters"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]"
            />
            {errors.new_password && <p className="mt-1 text-xs text-red-600">{errors.new_password.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              {...register('confirm_password')}
              type="password"
              placeholder="Repeat your password"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]"
            />
            {errors.confirm_password && <p className="mt-1 text-xs text-red-600">{errors.confirm_password.message}</p>}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
          style={{ background: loading ? '#7aabe8' : '#034EA2' }}
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
