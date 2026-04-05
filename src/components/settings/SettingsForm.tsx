'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Camera } from 'lucide-react'
import Image from 'next/image'
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
  const fileRef  = useRef<HTMLInputElement>(null)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null)
  const [uploading, setUploading] = useState(false)

  const initials = (profile?.full_name ?? 'U')
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name:   profile?.full_name ?? '',
      branch:      profile?.branch ?? '',
      phone:       profile?.phone ?? '',
      alert_email: profile?.alert_email ?? '',
    },
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)

    const ext  = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`

    const { error: upErr, data } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (upErr) { setError('Avatar upload failed: ' + upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithBust = `${publicUrl}?t=${Date.now()}`

    await supabase.from('profiles').update({ avatar_url: urlWithBust }).eq('id', profile.id)
    setAvatarUrl(urlWithBust)
    setUploading(false)
    router.refresh()
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.from('profiles').update({
      full_name:   data.full_name,
      branch:      data.branch || null,
      phone:       data.phone || null,
      alert_email: data.alert_email || null,
    }).eq('id', profile!.id)

    if (error) { setError(error.message) }
    else { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 3000) }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold mb-1" style={{ color: '#011B39' }}>Profile Information</h2>
      <p className="text-xs text-gray-400 mb-5">Your name, photo, and contact details</p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {saved && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">✓ Profile saved</div>}

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar" width={64} height={64}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white border-2 border-gray-200"
              style={{ background: '#034EA2' }}>
              {initials}
            </div>
          )}
          <button type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs"
            style={{ background: '#EB9C20' }}
            title="Change photo">
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: '#011B39' }}>{profile?.full_name}</p>
          <p className="text-xs text-gray-400">{uploading ? 'Uploading…' : 'Click the camera to change your photo'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Read-only */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Email</label>
            <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200">{profile?.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Role</label>
            <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200 capitalize">
              {profile?.role === 'admin' ? 'Administrator' : 'Relationship Officer'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>Full Name</label>
          <input {...register('full_name')}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>Branch</label>
            <input {...register('branch')} placeholder="e.g. Nairobi HQ"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>Phone</label>
            <input {...register('phone')} placeholder="+254 700 000 000"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#011B39' }}>
            Alert Email
            <span className="text-gray-400 font-normal ml-1">— daily expiry alerts go here</span>
          </label>
          <input {...register('alert_email')} type="email" placeholder="Leave blank to use login email"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#034EA2]" />
          {errors.alert_email && <p className="mt-1 text-xs text-red-600">{errors.alert_email.message}</p>}
        </div>

        <button type="submit" disabled={loading}
          className="text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
          style={{ background: loading ? '#7aabe8' : '#034EA2' }}>
          {loading ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
