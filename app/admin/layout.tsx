import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')

  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar adminName={profile.full_name ?? user.email ?? 'Admin'} />
      <main className="flex-1 min-w-0 p-4 sm:p-8 pt-16 sm:pt-8">{children}</main>
    </div>
  )
}
