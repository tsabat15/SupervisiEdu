import { redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import type { Profile } from '@/src/types/database'

export default async function DashboardPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data, error } = (await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()) as unknown as { data: Profile | null; error: { message: string } | null }

  if (error || !data) {
    redirect('/verify-profile')
  }

  if (!data.is_verified) {
    redirect('/verify-profile')
  }

  switch (data.role) {
    case 'admin':
      redirect('/dashboard/admin')
    case 'kepsek':
      redirect('/dashboard/kepsek')
    case 'guru':
      redirect('/dashboard/guru')
    default:
      redirect('/verify-profile')
  }
}