import { redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import AdminSidebar from '@/src/components/dashboard/AdminSidebar'
import PenggunaClient from '@/src/components/dashboard/admin/PenggunaClient'

export const dynamic = 'force-dynamic'

export default async function PenggunaPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) console.error('Error Supabase:', error.message)
  console.log('Daftar User:', users)

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <PenggunaClient users={users ?? []} />
    </div>
  )
}