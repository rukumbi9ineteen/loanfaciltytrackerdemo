'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})
type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const router  = useRouter()
  const supabase = createClient()
  const [showPw, setShowPw]   = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F4F5F8' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/bk_logo.jpeg" alt="Logo" width={140} height={42} className="object-contain" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: '#034EA2' }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: '#011B39' }}>Password Updated</h2>
              <p className="text-gray-500 text-sm">Your password has been set successfully. Redirecting to your dashboard…</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#011B39' }}>Set New Password</h2>
              <p className="text-gray-400 text-sm mb-6">Choose a strong password of at least 8 characters.</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>New Password</label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPw ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2] pr-10"
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>Confirm Password</label>
                  <input
                    {...register('confirm')}
                    type="password"
                    placeholder="Repeat your password"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]"
                  />
                  {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm.message}</p>}
                </div>

                <button type="submit" disabled={loading}
                  className="w-full text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                  style={{ background: loading ? '#7aabe8' : '#034EA2' }}>
                  {loading ? 'Updating…' : 'Set New Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
