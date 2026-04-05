'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email:     z.string().email('Enter a valid email'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
  role:      z.enum(['ro', 'admin']),
  branch:    z.string().optional(),
  phone:     z.string().optional(),
  alert_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export default function CreateUserForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'ro' },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error || 'Failed to create user')
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/admin'), 1500)
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <p className="text-green-700 font-semibold text-lg">User created successfully!</p>
        <p className="text-green-600 text-sm mt-1">Redirecting to admin panel…</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              {...register('full_name')}
              type="text"
              placeholder="John Doe"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              {...register('email')}
              type="email"
              placeholder="john@yourbank.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              {...register('password')}
              type="password"
              placeholder="Min 8 characters"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              {...register('role')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ro">Relationship Officer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <input
              {...register('branch')}
              type="text"
              placeholder="e.g. Nairobi HQ"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="+254 700 000 000"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Alert Email */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alert Email
              <span className="text-gray-400 font-normal ml-1">(daily expiry notifications will be sent here)</span>
            </label>
            <input
              {...register('alert_email')}
              type="email"
              placeholder="Leave blank to use main email"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

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
            {loading ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  )
}
