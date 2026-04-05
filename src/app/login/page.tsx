'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock } from 'lucide-react'

const schema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
    if (error) { setError('Invalid email or password.'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F4F5F8' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12" style={{ background: '#011B39' }}>
        <Image src="/bk_logo.jpeg" alt="Bk Logo" width={160} height={48} className="object-contain" />
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Loan Facility<br />Expiration Tracker
          </h1>
          <p className="mt-4 text-white/60 text-lg leading-relaxed">
            Stay ahead of every expiry. Monitor, renew, and manage your entire loan portfolio from one place.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Real-time Alerts', icon: '🔔' },
              { label: 'PDF Reports',      icon: '📄' },
              { label: 'Team Management',  icon: '👥' },
            ].map(f => (
              <div key={f.label} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="text-xs text-white/70 font-medium">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/30 text-xs">© {new Date().getFullYear()} Bank Of Kigali. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image src="/bk_logo.jpeg" alt="Bk Logo" width={140} height={42} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-1" style={{ color: '#011B39' }}>Welcome back</h2>
            <p className="text-gray-500 text-sm mb-6">Sign in to your account to continue</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>Email address</label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="you@domain.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 transition"
                  style={{ '--tw-ring-color': '#034EA2' } as React.CSSProperties}
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 transition pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm mt-2"
                style={{ background: loading ? '#7aabe8' : '#034EA2' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="text-center text-gray-400 text-xs mt-5">
            Contact your system administrator to reset your password.
          </p>
        </div>
      </div>
    </div>
  )
}
