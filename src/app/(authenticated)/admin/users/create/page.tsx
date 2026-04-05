import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateUserForm from '@/components/admin/CreateUserForm'

export default async function CreateUserPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (myProfile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Back to Admin</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create New User</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Create a login for a new Relationship Officer.
        </p>
      </div>

      <CreateUserForm />
    </div>
  )
}
